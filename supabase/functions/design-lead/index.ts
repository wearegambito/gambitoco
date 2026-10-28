// design-lead: lead capture for the /design service page. Validates the form,
// stores the lead (service role), and — when an email provider is configured —
// notifies Armic immediately and sends the lead an automatic personal reply.
//
// Email is optional on purpose: without a provider key the lead is still stored
// and returned ok, so the form works day one. Add the secrets below to turn on
// notifications (acceptance criterion: Armic notified within ~1 minute).
//
// Secrets (set in the Supabase dashboard, never in the client):
//   RESEND_API_KEY   optional — a Resend API key enables email
//   NOTIFY_EMAIL     where Armic gets notified (default armic@gambito.co.nz)
//   FROM_EMAIL       verified sender, e.g. "Armic <hello@gambito.co>"
//   BOOKING_URL      link used in the auto-reply (default https://gambito.co/book/)
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (provided automatically)
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "content-type, authorization", "access-control-allow-methods": "POST, OPTIONS" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b, null, 2), { status: s, headers: { "content-type": "application/json", ...CORS } });
const validEmail = (e: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);
const clean = (v: unknown) => String(v ?? "").trim();

async function sendEmail(to: string, subject: string, text: string, replyTo?: string) {
  const key = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("FROM_EMAIL") || "Gambito <hello@gambito.co>";
  if (!key) return { ok: false, skipped: true };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({ from, to, subject, text, ...(replyTo ? { reply_to: replyTo } : {}) }),
  });
  if (!res.ok) return { ok: false, error: `Resend ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}` };
  return { ok: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};

    // honeypot: a filled hidden field means a bot — pretend success, do nothing
    if (clean(body.hp) !== "") return json({ ok: true, skipped: true });

    const lead = {
      name: clean(body.name),
      email: clean(body.email).toLowerCase(),
      whatsapp: clean(body.whatsapp),
      business: clean(body.business),
      stage: clean(body.stage),
      needs: Array.isArray(body.needs) ? body.needs.map(clean).filter(Boolean) : [],
      budget: clean(body.budget),
      message: clean(body.message),
      meta: (body.meta && typeof body.meta === "object") ? body.meta : {},
    };

    if (!lead.name) return json({ ok: false, error: "Please add your name." }, 400);
    if (!validEmail(lead.email)) return json({ ok: false, error: "Please enter a valid email address." }, 400);
    if (!lead.stage || !lead.needs.length || !lead.budget) return json({ ok: false, error: "Please complete the required fields." }, 400);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { error } = await supabase.from("design_leads").insert(lead);
    if (error) return json({ ok: false, error: error.message }, 500);

    // notify Armic + auto-reply to the lead (only if an email provider is set)
    const notifyTo = Deno.env.get("NOTIFY_EMAIL") || "armic@gambito.co.nz";
    const bookingUrl = Deno.env.get("BOOKING_URL") || "https://gambito.co/book/";
    const m = lead.meta as Record<string, unknown>;
    const src = [m.utm_source, m.utm_medium, m.utm_campaign, m.utm_content].filter(Boolean).join(" / ") || "direct";

    const notifyText = `New design lead\n\n` +
      `Name: ${lead.name}\nEmail: ${lead.email}\nWhatsApp: ${lead.whatsapp || "—"}\n` +
      `Business: ${lead.business || "—"}\nStage: ${lead.stage}\nNeeds: ${lead.needs.join(", ")}\n` +
      `Budget: ${lead.budget}\n\nMessage:\n${lead.message || "—"}\n\n` +
      `Source: ${src}\nfbclid: ${m.fbclid || "—"}\nPage: ${m.page_url || "—"}`;

    const replyText = `Hi ${lead.name.split(" ")[0] || "there"},\n\n` +
      `Thanks for reaching out about your project — I've got your details and I'll reply personally shortly.\n\n` +
      `If you'd like to skip the wait, you can grab a 20-minute call here:\n${bookingUrl}\n\n` +
      `Talk soon,\nArmic\nGambito`;

    const [notify, reply] = await Promise.all([
      sendEmail(notifyTo, `New design lead — ${lead.name}`, notifyText, lead.email),
      sendEmail(lead.email, "Thanks — I'll be in touch shortly", replyText, notifyTo),
    ]);

    return json({ ok: true, email: { notify: notify.ok ? "sent" : (notify.skipped ? "not configured" : notify.error), reply: reply.ok ? "sent" : (reply.skipped ? "not configured" : reply.error) } });
  } catch (err) {
    return json({ ok: false, error: String((err as Error)?.message ?? err) }, 500);
  }
});
