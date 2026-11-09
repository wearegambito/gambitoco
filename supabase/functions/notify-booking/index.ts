// notify-booking — for a fresh booking: creates the event on the organizer's Google Calendar (Google
// then emails the guest the invite, and edits/reschedules from that calendar reach them), emails the
// visitor a branded confirmation with the Meet link, and sends the studio a copy.
// If Google isn't configured or errors, it falls back to attaching a METHOD:REQUEST .ics invite instead.
// Called (fire-and-forget) by /book right after book_slot succeeds.
//
// { remind: true } = the 1-hour-before reminder: a pg_cron job (every 5 min, see migration 0007) posts
// each due booking here. The function re-checks that the booking really is due and claims it
// (bookings.reminded_at), so the public endpoint can't be used to send early or repeated reminders.
//
// Secrets (Supabase → Edge Functions → Secrets): MAILERSEND_API_KEY, and for Google Calendar:
//   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN (authorised as the organizer account)
//
// Settings (site_content, editable in the admin → Content → Booking page):
//   booking_from_email   sender, calendar-invite organizer and reply-to (armic@gambito.co)
//   booking_meeting_url  the Google Meet link shown in the email and written to the invite
//   footer_email         also receives a copy of the booking notification
//   booking_timezone / booking_duration
// Deployed via the Supabase MCP (verify_jwt=false; the function does its own freshness check).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEFAULT_MEET_URL = "https://meet.google.com/ssj-qryg-qqe";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });

const esc = (s: string) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

// ---- iCalendar (RFC 5545) helpers ----
const icsText = (s: string) => String(s ?? "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const icsParam = (s: string) => String(s ?? "").replace(/["\r\n]/g, "");
// fold to 75 octets per line, continuing with CRLF + space
function fold(line: string): string {
  const enc = new TextEncoder(); const out: string[] = []; let cur = "", len = 0;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    if (len + n > (out.length ? 74 : 75)) { out.push(cur); cur = ""; len = 0; }
    cur += ch; len += n;
  }
  out.push(cur);
  return out.join("\r\n ");
}

interface InviteOpts {
  uid: string; start: Date; durationMin: number; meetUrl: string;
  organizerEmail: string; attendeeEmail: string; attendeeName: string; sequence?: number;
}
// METHOD:REQUEST + organizer + attendee + location = a proper invite (not just an event file).
// Same UID + a higher SEQUENCE is how an updated invite replaces this one in the guest's calendar.
function buildInvite(o: InviteOpts): string {
  const two = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) => `${d.getUTCFullYear()}${two(d.getUTCMonth() + 1)}${two(d.getUTCDate())}T${two(d.getUTCHours())}${two(d.getUTCMinutes())}${two(d.getUTCSeconds())}Z`;
  const end = new Date(o.start.getTime() + o.durationMin * 60000);
  const desc = `A focused session with the Gambito studio.\n\nJoin on Google Meet: ${o.meetUrl}\n\nNeed to change the time? Reply to this email.`;
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Gambito//Booking//EN", "CALSCALE:GREGORIAN", "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${o.uid}`, `SEQUENCE:${o.sequence ?? 0}`, `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(o.start)}`, `DTEND:${fmt(end)}`,
    `SUMMARY:${icsText("Gameplan Session with Gambito")}`,
    `DESCRIPTION:${icsText(desc)}`,
    `LOCATION:${icsText(o.meetUrl)}`,
    `URL:${o.meetUrl}`,
    `X-GOOGLE-CONFERENCE:${o.meetUrl}`,
    `ORGANIZER;CN="Gambito":mailto:${o.organizerEmail}`,
    `ATTENDEE;CN="${icsParam(o.attendeeName)}";ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${o.attendeeEmail}`,
    "STATUS:CONFIRMED", "TRANSP:OPAQUE",
    "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:Gameplan Session starts in 15 minutes", "TRIGGER:-PT15M", "END:VALARM",
    "END:VEVENT", "END:VCALENDAR",
  ].map(fold).join("\r\n") + "\r\n";
}
// base64 of UTF-8 text
const b64 = (s: string) => { const b = new TextEncoder().encode(s); let bin = ""; for (const x of b) bin += String.fromCharCode(x); return btoa(bin); };

// ---- Google Calendar (optional) ----
async function googleAccessToken(): Promise<string | null> {
  const id = Deno.env.get("GOOGLE_CLIENT_ID"), secret = Deno.env.get("GOOGLE_CLIENT_SECRET"), refresh = Deno.env.get("GOOGLE_REFRESH_TOKEN");
  if (!id || !secret || !refresh) return null; // not configured → caller falls back to the .ics invite
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: id, client_secret: secret, refresh_token: refresh, grant_type: "refresh_token" }),
  });
  if (!res.ok) throw new Error(`Google token ${res.status}: ${await res.text()}`);
  return (await res.json()).access_token as string;
}
// creates the event on the authorised account's primary calendar and lets Google email the guest
async function createCalendarEvent(token: string, ev: {
  start: Date; durationMin: number; tz: string; meetUrl: string; name: string; email: string; bookingId: string; notes?: string;
}): Promise<string> {
  const end = new Date(ev.start.getTime() + ev.durationMin * 60000);
  const body = {
    summary: "Gameplan Session with Gambito",
    description: `A focused session with the Gambito studio.\n\nJoin on Google Meet: ${ev.meetUrl}${ev.notes ? `\n\nNotes from ${ev.name}: ${ev.notes}` : ""}`,
    location: ev.meetUrl,
    start: { dateTime: ev.start.toISOString(), timeZone: ev.tz },
    end: { dateTime: end.toISOString(), timeZone: ev.tz },
    attendees: [{ email: ev.email, displayName: ev.name }],
    guestsCanModifyEvent: false,
    reminders: { useDefault: true },
    source: { title: "gambito.co/book", url: "https://gambito.co/book/" },
    extendedProperties: { private: { bookingId: ev.bookingId } },
  };
  const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all", {
    method: "POST", headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Google Calendar ${res.status}: ${await res.text()}`);
  return (await res.json()).id as string;
}

async function sendEmail(key: string, body: unknown) {
  const res = await fetch("https://api.mailersend.com/v1/email", {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
    body: JSON.stringify(body),
  });
  if (!res.ok && res.status !== 202) {
    const t = await res.text();
    throw new Error(`MailerSend ${res.status}: ${t}`);
  }
}

// booking-page settings from site_content, with safe defaults
async function loadSettings(admin: ReturnType<typeof createClient>) {
  const { data: rows } = await admin.from("site_content").select("key,value")
    .in("key", ["footer_email", "booking_from_email", "booking_timezone", "booking_duration", "booking_meeting_url"]);
  const sc: Record<string, string> = Object.fromEntries((rows || []).map((r: { key: string; value: string }) => [r.key, r.value]));
  return {
    fromEmail: (sc.booking_from_email || "armic@gambito.co").trim(),
    studioEmail: (sc.footer_email || "hello@gambito.co").trim(),
    tz: sc.booking_timezone || "Pacific/Auckland",
    duration: Number(sc.booking_duration || 30),
    meetUrl: /^https:\/\/\S+$/.test((sc.booking_meeting_url || "").trim()) ? sc.booking_meeting_url.trim() : DEFAULT_MEET_URL,
  };
}
const joinButton = (meetUrl: string) =>
  `<a href="${esc(meetUrl)}" style="display:inline-block;background:#fa4d56;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:999px">Join on Google Meet</a>`;
const whenText = (start: Date, tz: string) =>
  start.toLocaleString("en-NZ", { timeZone: tz, weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  let release: (() => Promise<unknown>) | null = null; // un-claims the booking if sending fails, so a retry can work
  try {
    const { booking_id, remind } = await req.json();
    if (!booking_id) return json({ ok: false, error: "missing booking_id" });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: booking } = await admin.from("bookings").select("*").eq("id", booking_id).single();
    if (!booking) return json({ ok: false, error: "not found" });

    const key = Deno.env.get("MAILERSEND_API_KEY");
    if (!key) return json({ ok: false, error: "MAILERSEND_API_KEY not set" });

    // ---- 1-hour reminder (called by the pg_cron job) ----
    if (remind === true) {
      const msToStart = new Date(booking.start_time).getTime() - Date.now();
      // due = starts within the next hour; a booking made inside that last hour just got its confirmation, so skip it
      const madeInsideLastHour = new Date(booking.start_time).getTime() - new Date(booking.created_at).getTime() <= 60 * 60 * 1000;
      if (msToStart <= 0 || msToStart > 60 * 60 * 1000 || madeInsideLastHour) return json({ ok: true, skipped: "not due" });
      const { data: claimedR } = await admin.from("bookings").update({ reminded_at: new Date().toISOString() })
        .eq("id", booking.id).is("reminded_at", null).select("id");
      if (!claimedR?.length) return json({ ok: true, skipped: "already reminded" });
      release = () => admin.from("bookings").update({ reminded_at: null }).eq("id", booking.id);

      const { fromEmail, tz, duration, meetUrl } = await loadSettings(admin);
      const start = new Date(booking.start_time);
      const when = whenText(start, tz);
      const html = `<div style="font-family:Arial,sans-serif;color:#0a1f1a;max-width:520px"><h2 style="color:#032721">Your session starts in about an hour.</h2><p>Hi ${esc(booking.name)}, a quick reminder about your Gameplan Session with Gambito.</p><table style="font-size:15px;margin:14px 0;border-collapse:collapse"><tr><td style="padding:3px 16px 3px 0;color:#5c6b60">What</td><td>Gameplan Session with Gambito</td></tr><tr><td style="padding:3px 16px 3px 0;color:#5c6b60">When</td><td><strong>${esc(when)}</strong><br><span style="color:#5c6b60">${duration} minutes · time shown in ${esc(tz)}</span></td></tr><tr><td style="padding:3px 16px 3px 0;color:#5c6b60">Where</td><td>Google Meet<br><a href="${esc(meetUrl)}" style="color:#0a6b57">${esc(meetUrl)}</a></td></tr></table><p style="margin:20px 0">${joinButton(meetUrl)}</p><p>A focused session with the Gambito studio. Need to change the time? Reply to this email.</p><p style="margin-top:24px">— Armic, Gambito</p></div>`;
      await sendEmail(key, {
        from: { email: fromEmail, name: "Armic · Gambito" },
        to: [{ email: booking.email, name: booking.name }],
        reply_to: { email: fromEmail, name: "Armic · Gambito" },
        subject: `Reminder: your Gameplan Session with Gambito starts in 1 hour (${when})`,
        html,
      });
      return json({ ok: true, reminded: true });
    }

    // ---- new booking: confirmation + invite ----
    // anti-abuse: the public endpoint only emails for fresh bookings
    if (Date.now() - new Date(booking.created_at).getTime() > 10 * 60 * 1000) return json({ ok: true, skipped: "stale" });

    // once-only: claim this booking so repeat calls (the endpoint is public) can't send duplicates
    const { data: claimed } = await admin.from("bookings").update({ notified_at: new Date().toISOString() })
      .eq("id", booking.id).is("notified_at", null).select("id");
    if (!claimed?.length) return json({ ok: true, skipped: "already notified" });
    release = () => admin.from("bookings").update({ notified_at: null }).eq("id", booking.id);

    const { fromEmail, studioEmail, tz, duration, meetUrl } = await loadSettings(admin);
    const start = new Date(booking.start_time);
    const when = whenText(start, tz);
    // 1) preferred: a real Google Calendar event (Google sends the invite; edits from that calendar reach the guest)
    let calendarOk = false, calendarError: string | undefined;
    try {
      const token = booking.google_event_id ? null : await googleAccessToken(); // retry: don't create a second event
      if (booking.google_event_id) calendarOk = true;
      if (token) {
        const eventId = await createCalendarEvent(token, {
          start, durationMin: duration, tz, meetUrl, name: booking.name, email: booking.email, bookingId: booking.id, notes: booking.notes,
        });
        calendarOk = true;
        await admin.from("bookings").update({ google_event_id: eventId }).eq("id", booking.id);
      }
    } catch (e) {
      calendarError = String((e as Error).message || e);
      console.error("[notify-booking] Google Calendar failed, falling back to .ics:", calendarError);
    }
    // 2) fallback: attach a METHOD:REQUEST invite to the emails
    const attachments = calendarOk ? undefined : [{
      content: b64(buildInvite({
        uid: `booking-${booking.id}@gambito.co`, start, durationMin: duration, meetUrl,
        organizerEmail: fromEmail, attendeeEmail: booking.email, attendeeName: booking.name,
      })),
      filename: "invite.ics", disposition: "attachment",
    }];

    const btn = joinButton(meetUrl);
    const inviteNote = calendarOk
      ? `You'll also get a Google Calendar invite from ${esc(fromEmail)} — accept it to add the session to your calendar.`
      : `A calendar invite is attached — accept it to add the session to your calendar.`;
    const visitorHtml = `<div style="font-family:Arial,sans-serif;color:#0a1f1a;max-width:520px"><h2 style="color:#032721">You're booked in.</h2><p>Hi ${esc(booking.name)}, your Gameplan Session with Gambito is confirmed.</p><p style="font-size:16px"><strong>${esc(when)}</strong><br>${duration} minutes · time shown in ${esc(tz)}</p><p style="margin:18px 0"><strong>Where:</strong> Google Meet<br><a href="${esc(meetUrl)}" style="color:#0a6b57">${esc(meetUrl)}</a></p><p style="margin:20px 0">${btn}</p><p>${inviteNote} Reply to this email if anything changes.</p><p style="margin-top:24px">— Armic, Gambito</p></div>`;
    const adminNote = calendarOk
      ? `The event is on ${esc(fromEmail)}'s Google Calendar — edit or reschedule it there and Google notifies the guest.`
      : `Google Calendar wasn't used${calendarError ? ` (${esc(calendarError.slice(0, 160))})` : " (not configured yet)"}, so the invite is attached instead. Open it in ${esc(fromEmail)}'s calendar to edit it.`;
    const adminHtml = `<div style="font-family:Arial,sans-serif;color:#0a1f1a;max-width:520px"><h2 style="color:#032721">New Gameplan Session booked</h2><p style="font-size:16px"><strong>${esc(when)}</strong> (${esc(tz)})</p><table style="font-size:14px"><tr><td style="padding:2px 12px 2px 0;color:#5c6b60">Name</td><td>${esc(booking.name)}</td></tr><tr><td style="padding:2px 12px 2px 0;color:#5c6b60">Email</td><td>${esc(booking.email)}</td></tr>${booking.company ? `<tr><td style="padding:2px 12px 2px 0;color:#5c6b60">Company</td><td>${esc(booking.company)}</td></tr>` : ""}${booking.notes ? `<tr><td style="padding:2px 12px 2px 0;color:#5c6b60;vertical-align:top">Notes</td><td>${esc(booking.notes)}</td></tr>` : ""}<tr><td style="padding:2px 12px 2px 0;color:#5c6b60">Call</td><td><a href="${esc(meetUrl)}">${esc(meetUrl)}</a></td></tr></table><p style="color:#5c6b60;font-size:13px">${adminNote}</p></div>`;

    await sendEmail(key, {
      from: { email: fromEmail, name: "Armic · Gambito" },
      to: [{ email: booking.email, name: booking.name }],
      reply_to: { email: fromEmail, name: "Armic · Gambito" },
      subject: "Your Gameplan Session with Gambito is booked",
      html: visitorHtml,
      ...(attachments ? { attachments } : {}),
    });
    // studio copy → the organizer's mailbox + the shared studio address
    const adminTo = [...new Set([fromEmail, studioEmail].map((e) => e.toLowerCase()))].map((email) => ({ email, name: "Gambito" }));
    await sendEmail(key, {
      from: { email: fromEmail, name: "Gambito Bookings" },
      to: adminTo,
      reply_to: { email: booking.email, name: booking.name },
      subject: `New Gameplan Session — ${booking.name}`,
      html: adminHtml,
      ...(attachments ? { attachments } : {}),
    });

    return json({ ok: true, calendar: calendarOk, ...(calendarError ? { calendarError } : {}) });
  } catch (e) {
    if (release) await release().catch(() => {});
    return json({ ok: false, error: String((e as Error).message || e) });
  }
});
