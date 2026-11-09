// notify-booking — emails the visitor a confirmation + a real calendar invite for a fresh booking,
// and sends the studio a copy. Called (fire-and-forget) by /book right after book_slot succeeds.
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { booking_id } = await req.json();
    if (!booking_id) return json({ ok: false, error: "missing booking_id" });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: booking } = await admin.from("bookings").select("*").eq("id", booking_id).single();
    if (!booking) return json({ ok: false, error: "not found" });
    // anti-abuse: only email for fresh bookings
    if (Date.now() - new Date(booking.created_at).getTime() > 10 * 60 * 1000) return json({ ok: true, skipped: "stale" });

    const key = Deno.env.get("MAILERSEND_API_KEY");
    if (!key) return json({ ok: false, error: "MAILERSEND_API_KEY not set" });

    const { data: rows } = await admin.from("site_content").select("key,value")
      .in("key", ["footer_email", "booking_from_email", "booking_timezone", "booking_duration", "booking_meeting_url"]);
    const sc: Record<string, string> = Object.fromEntries((rows || []).map((r: { key: string; value: string }) => [r.key, r.value]));
    const fromEmail = (sc.booking_from_email || "armic@gambito.co").trim();
    const studioEmail = (sc.footer_email || "hello@gambito.co").trim();
    const tz = sc.booking_timezone || "Pacific/Auckland";
    const duration = Number(sc.booking_duration || 30);
    const meetUrl = /^https:\/\/\S+$/.test((sc.booking_meeting_url || "").trim()) ? sc.booking_meeting_url.trim() : DEFAULT_MEET_URL;

    const start = new Date(booking.start_time);
    const when = start.toLocaleString("en-NZ", { timeZone: tz, weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" });
    const ics = b64(buildInvite({
      uid: `booking-${booking.id}@gambito.co`, start, durationMin: duration, meetUrl,
      organizerEmail: fromEmail, attendeeEmail: booking.email, attendeeName: booking.name,
    }));
    const attachments = [{ content: ics, filename: "invite.ics", disposition: "attachment" }];

    const btn = `<a href="${esc(meetUrl)}" style="display:inline-block;background:#fa4d56;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:999px">Join on Google Meet</a>`;
    const visitorHtml = `<div style="font-family:Arial,sans-serif;color:#0a1f1a;max-width:520px"><h2 style="color:#032721">You're booked in.</h2><p>Hi ${esc(booking.name)}, your Gameplan Session with Gambito is confirmed.</p><p style="font-size:16px"><strong>${esc(when)}</strong><br>${duration} minutes · time shown in ${esc(tz)}</p><p style="margin:18px 0"><strong>Where:</strong> Google Meet<br><a href="${esc(meetUrl)}" style="color:#0a6b57">${esc(meetUrl)}</a></p><p style="margin:20px 0">${btn}</p><p>A calendar invite is attached — accept it to add the session to your calendar. Reply to this email if anything changes.</p><p style="margin-top:24px">— Armic, Gambito</p></div>`;
    const adminHtml = `<div style="font-family:Arial,sans-serif;color:#0a1f1a;max-width:520px"><h2 style="color:#032721">New Gameplan Session booked</h2><p style="font-size:16px"><strong>${esc(when)}</strong> (${esc(tz)})</p><table style="font-size:14px"><tr><td style="padding:2px 12px 2px 0;color:#5c6b60">Name</td><td>${esc(booking.name)}</td></tr><tr><td style="padding:2px 12px 2px 0;color:#5c6b60">Email</td><td>${esc(booking.email)}</td></tr>${booking.company ? `<tr><td style="padding:2px 12px 2px 0;color:#5c6b60">Company</td><td>${esc(booking.company)}</td></tr>` : ""}${booking.notes ? `<tr><td style="padding:2px 12px 2px 0;color:#5c6b60;vertical-align:top">Notes</td><td>${esc(booking.notes)}</td></tr>` : ""}<tr><td style="padding:2px 12px 2px 0;color:#5c6b60">Call</td><td><a href="${esc(meetUrl)}">${esc(meetUrl)}</a></td></tr></table><p style="color:#5c6b60;font-size:13px">The invite is attached. Open it in ${esc(fromEmail)}'s calendar to edit the time or details — changes are sent to the guest.</p></div>`;

    await sendEmail(key, {
      from: { email: fromEmail, name: "Armic · Gambito" },
      to: [{ email: booking.email, name: booking.name }],
      reply_to: { email: fromEmail, name: "Armic · Gambito" },
      subject: "Your Gameplan Session with Gambito is booked",
      html: visitorHtml,
      attachments,
    });
    // studio copy → the organizer's mailbox (so the event can be opened and edited there) + the shared studio address
    const adminTo = [...new Set([fromEmail, studioEmail].map((e) => e.toLowerCase()))].map((email) => ({ email, name: "Gambito" }));
    await sendEmail(key, {
      from: { email: fromEmail, name: "Gambito Bookings" },
      to: adminTo,
      reply_to: { email: booking.email, name: booking.name },
      subject: `New Gameplan Session — ${booking.name}`,
      html: adminHtml,
      attachments,
    });

    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: String((e as Error).message || e) });
  }
});
