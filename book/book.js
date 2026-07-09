import { supabase, SUPABASE_URL } from "../src/supabase.js";

const app = document.getElementById("book-app");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
const tzAbbr = (() => {
  try {
    return new Intl.DateTimeFormat("en", { timeZoneName: "short" }).formatToParts(new Date()).find((p) => p.type === "timeZoneName")?.value || localTz;
  } catch { return localTz; }
})();
const fmtDay = (d) => d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
const fmtTime = (d) => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

let config = {};
let slots = [];
let selected = null;

async function load() {
  const [{ data: content }, { data: slotRows, error }] = await Promise.all([
    supabase.from("site_content").select("key, value"),
    supabase.from("booking_slots").select("id, start_time, duration_minutes").eq("status", "available").gt("start_time", new Date().toISOString()).order("start_time"),
  ]);
  config = Object.fromEntries((content || []).map((r) => [r.key, r.value]));
  if (error) { renderError(); return; }
  slots = slotRows || [];
  if (config.booking_enabled === "false") renderDisabled();
  else renderPicker();
}

function footer() {
  const c = config;
  return `<footer class="c-footer">
    <div class="c-footer-cols">
      <div><span class="f-label">Studio</span><p>${c.footer_address || ""}</p></div>
      <div><span class="f-label">Talk to us</span><p><a href="mailto:${esc(c.footer_email || "hello@gambito.co")}">${esc(c.footer_email || "hello@gambito.co")}</a><br />${esc(c.footer_phone || "")}</p></div>
      <div><span class="f-label">Elsewhere</span><p><a href="${esc(c.footer_linkedin_url || "#")}">LinkedIn</a><br /><a href="${esc(c.footer_instagram_url || "#")}">Instagram</a></p></div>
      <div class="c-footer-note"><span class="f-label">Gambito</span><p>${esc(c.footer_definition || "")}</p></div>
    </div>
    <div class="c-footer-base"><span>${esc(c.footer_copyright || "© 2026 Gambito Ltd.")}</span><span>${esc(c.footer_tagline || "")}</span></div>
  </footer>`;
}

function pageHead() {
  return `<div class="page-head">
    <p class="page-eyebrow">Gameplan Session</p>
    <h1 class="page-title">${esc(config.booking_title || "Book a Gameplan Session")}</h1>
    <p class="page-lede">${esc(config.booking_intro || "One focused hour, zero jargon, no obligation.")}</p>
  </div>`;
}

function renderError() {
  app.innerHTML = `${pageHead()}<p class="book-empty">Something went wrong loading available times. Please email <a href="mailto:hello@gambito.co">hello@gambito.co</a> and we'll sort a time out with you.</p>${footer()}`;
}
function renderDisabled() {
  app.innerHTML = `${pageHead()}<p class="book-empty">Online booking is paused right now. Email <a href="mailto:hello@gambito.co">hello@gambito.co</a> and we'll find a time.</p>${footer()}`;
}

function renderPicker() {
  if (!slots.length) {
    app.innerHTML = `${pageHead()}<p class="book-empty">No times are open at the moment. Email <a href="mailto:hello@gambito.co">hello@gambito.co</a> and we'll make one work for you.</p>${footer()}`;
    return;
  }
  const groups = new Map();
  for (const s of slots) {
    const d = new Date(s.start_time);
    const key = d.toDateString();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  }
  const daysHtml = [...groups.entries()].map(([, daySlots]) => {
    const day = new Date(daySlots[0].start_time);
    const times = daySlots.map((s) => `<button class="slot" data-id="${s.id}">${esc(fmtTime(new Date(s.start_time)))}</button>`).join("");
    return `<div class="book-day"><h2 class="book-day-title">${esc(fmtDay(day))}</h2><div class="slot-row">${times}</div></div>`;
  }).join("");

  app.innerHTML = `${pageHead()}
    <p class="book-tznote">Times shown in your timezone — <b>${esc(tzAbbr)}</b> (${esc(localTz)}). Each session is ${esc(config.booking_duration || "30")} minutes.</p>
    <div class="book-days">${daysHtml}</div>
    ${footer()}`;

  app.querySelectorAll(".slot").forEach((btn) => btn.addEventListener("click", () => {
    selected = slots.find((s) => s.id === btn.dataset.id);
    renderForm();
  }));
}

function renderForm() {
  const d = new Date(selected.start_time);
  app.innerHTML = `${pageHead()}
    <div class="book-form-wrap">
      <button class="book-back" id="back">← Pick another time</button>
      <div class="book-selected">
        <span class="book-selected-label">Your session</span>
        <strong>${esc(fmtDay(d))}</strong>
        <span>${esc(fmtTime(d))} ${esc(tzAbbr)} · ${esc(config.booking_duration || "30")} min</span>
      </div>
      <form id="book-form" class="book-form">
        <div class="field"><label for="bf-name">Your name *</label><input id="bf-name" name="name" required autocomplete="name" /></div>
        <div class="field"><label for="bf-email">Email *</label><input id="bf-email" name="email" type="email" required autocomplete="email" /></div>
        <div class="field"><label for="bf-company">Company (optional)</label><input id="bf-company" name="company" autocomplete="organization" /></div>
        <div class="field"><label for="bf-notes">What would you like to talk about? (optional)</label><textarea id="bf-notes" name="notes" rows="3"></textarea></div>
        <input type="text" name="website" tabindex="-1" autocomplete="off" class="book-hp" aria-hidden="true" />
        <button type="submit" class="btn-solid" id="book-submit">Confirm booking</button>
        <p class="book-error" id="book-error"></p>
      </form>
    </div>
    ${footer()}`;

  app.querySelector("#back").addEventListener("click", renderPicker);
  app.querySelector("#book-form").addEventListener("submit", submitBooking);
}

async function submitBooking(e) {
  e.preventDefault();
  const form = e.target;
  const submit = app.querySelector("#book-submit");
  const errEl = app.querySelector("#book-error");
  errEl.textContent = "";
  submit.disabled = true;
  submit.textContent = "Booking…";

  const payload = {
    p_slot_id: selected.id,
    p_name: form.name.value.trim(),
    p_email: form.email.value.trim(),
    p_company: form.company.value.trim(),
    p_notes: form.notes.value.trim(),
    p_hp: form.website.value,
  };

  const { data, error } = await supabase.rpc("book_slot", payload);
  if (error || !data?.ok) {
    submit.disabled = false;
    submit.textContent = "Confirm booking";
    errEl.textContent = data?.error || "Couldn't complete the booking. Please try another time.";
    if (data && !data.ok && /taken|available|passed/.test(data.error || "")) {
      // availability changed — reload fresh slots after showing the message
      setTimeout(load, 1800);
    }
    return;
  }

  // fire-and-forget notification (works once the MailerSend key is configured)
  try {
    fetch(`${SUPABASE_URL}/functions/v1/notify-booking`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_id: data.booking_id }),
    }).catch(() => {});
  } catch { /* ignore */ }

  renderDone(payload, data);
}

function icsHref(start, durationMin, name) {
  const two = (n) => String(n).padStart(2, "0");
  const fmt = (d) => `${d.getUTCFullYear()}${two(d.getUTCMonth() + 1)}${two(d.getUTCDate())}T${two(d.getUTCHours())}${two(d.getUTCMinutes())}00Z`;
  const end = new Date(start.getTime() + durationMin * 60000);
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Gambito//Booking//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VEVENT", `UID:gambito-${start.getTime()}@gambito.co`, `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`, `DTEND:${fmt(end)}`, "SUMMARY:Gameplan Session with Gambito",
    "DESCRIPTION:A focused hour with the Gambito studio. We'll be in touch with a call link before the session.",
    "END:VEVENT", "END:VCALENDAR",
  ];
  return "data:text/calendar;charset=utf-8," + encodeURIComponent(lines.join("\r\n"));
}

function renderDone(payload, data) {
  const start = new Date(data.start_time);
  const dur = data.duration || Number(config.booking_duration || 30);
  app.innerHTML = `${pageHead()}
    <div class="book-done">
      <div class="book-done-check">✓</div>
      <h2>You're booked in.</h2>
      <div class="book-selected book-selected--done">
        <strong>${esc(fmtDay(start))}</strong>
        <span>${esc(fmtTime(start))} ${esc(tzAbbr)} · ${esc(dur)} min</span>
      </div>
      <p class="book-done-msg">${esc(config.booking_confirm || "You're booked. We'll be in touch by email. Talk soon.")}</p>
      <div class="book-done-actions">
        <a class="btn-solid" href="${icsHref(start, dur, payload.p_name)}" download="gameplan-session.ics">Add to calendar</a>
        <a class="book-back" href="/">Back to gambito.co</a>
      </div>
    </div>
    ${footer()}`;
}

load();
