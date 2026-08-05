import { SUPABASE_URL } from "../src/supabase.js";
import { initLanding } from "../src/landing.js";

const SLUG = "clear-the-path";
const MAGNET = "clear-the-path-breakdown";

// hydrate any CMS overrides for this page (falls back to the static copy)
initLanding(SLUG);

const form = document.getElementById("lead-form");
const statusEl = document.getElementById("lead-status");
const submit = document.getElementById("lead-submit");

function setStatus(msg, kind) {
  statusEl.textContent = msg;
  statusEl.className = "lp-form-status" + (kind ? " is-" + kind : "");
}

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = form.email.value.trim();
  const name = form.name.value.trim();
  const idea = form.idea.value.trim();
  const hp = form.website.value; // honeypot

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    setStatus("Please enter a valid email address.", "error");
    form.email.focus();
    return;
  }

  const label = submit.textContent;
  submit.disabled = true;
  submit.textContent = "Sending…";
  setStatus("");

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/deliver-lead-magnet`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, name, source: SLUG, magnet: MAGNET, hp, meta: idea ? { idea } : {} }),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok || out.ok === false) throw new Error(out.error || `HTTP ${res.status}`);

    window.gambitoTrack && window.gambitoTrack("lead_captured", { source: SLUG, magnet: MAGNET });
    form.reset();

    if (out.download_url) {
      setStatus("Done. Your breakdown is downloading now, and a copy is on its way to your inbox.", "success");
      window.location.href = out.download_url;
    } else {
      setStatus("You're in. Check your inbox for the full breakdown — we'll be in touch shortly.", "success");
    }
  } catch (err) {
    setStatus("Something went wrong: " + err.message + " Please try again, or email hello@gambito.co.", "error");
  }

  submit.disabled = false;
  submit.textContent = label;
});
