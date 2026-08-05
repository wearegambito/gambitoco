// deliver-lead-magnet: the gated lead-capture endpoint for campaign landing
// pages. Validates the form, stores the lead (service role), upserts the
// contact into EmailOctopus (which sends the follow-up/nurture via its own
// automation), and returns a time-limited signed URL to the gated asset in the
// private `lead-magnets` bucket. EmailOctopus failures never block delivery.
//
// Secrets (set in the Supabase dashboard, never in the client):
//   EMAILOCTOPUS_API_KEY   (eo_… v2 key)
//   EMAILOCTOPUS_LIST_ID   (the list leads are added to)
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (provided automatically)
import { createClient } from "npm:@supabase/supabase-js@2";

const EO_BASE = "https://api.emailoctopus.com";
const MAGNET_BUCKET = "lead-magnets"; // private
const SIGNED_URL_TTL = 60 * 60; // 1 hour
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "content-type, authorization", "access-control-allow-methods": "POST, OPTIONS" };

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b, null, 2), { status: s, headers: { "content-type": "application/json", ...CORS } });
const validEmail = (e: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);

// upsert a contact into EmailOctopus (PUT = create-or-update, no 409 on repeat)
async function emailOctopusUpsert(email: string, name: string | null, tags: string[]) {
  const key = Deno.env.get("EMAILOCTOPUS_API_KEY");
  const listId = Deno.env.get("EMAILOCTOPUS_LIST_ID");
  if (!key || !listId) return { ok: false, error: "EmailOctopus not configured" };
  const body: Record<string, unknown> = { email_address: email, status: "subscribed" };
  if (name) body.fields = { FirstName: name }; // EmailOctopus default field tag is "FirstName"
  if (tags.length) body.tags = tags;
  const res = await fetch(`${EO_BASE}/lists/${listId}/contacts`, {
    method: "PUT",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return { ok: false, error: `EmailOctopus ${res.status}: ${detail.slice(0, 300)}` };
  }
  return { ok: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};

    // honeypot: a filled hidden field means a bot — pretend success, do nothing
    if (String(body.hp || "").trim() !== "") return json({ ok: true, skipped: true });

    const email = String(body.email || "").trim().toLowerCase();
    const name = String(body.name || "").trim() || null;
    const source = String(body.source || "").trim() || null;   // landing-page slug
    const magnet = String(body.magnet || "").trim() || null;   // offer label
    const assetPath = String(body.asset_path || "").trim();     // path within lead-magnets bucket
    const meta = (body.meta && typeof body.meta === "object") ? body.meta : {};
    if (!validEmail(email)) return json({ ok: false, error: "Please enter a valid email address." }, 400);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // sync to EmailOctopus (non-blocking for the user — record the outcome)
    const tags = [source, magnet].filter(Boolean) as string[];
    const eo = await emailOctopusUpsert(email, name, tags);

    // store the lead (service role bypasses RLS)
    await supabase.from("leads").insert({
      email, name, source, lead_magnet: magnet,
      meta: { ...meta, emailoctopus: eo.ok ? "subscribed" : "error", emailoctopus_error: eo.ok ? null : eo.error },
    });

    // signed, expiring download URL for the gated asset (if one was requested)
    let downloadUrl: string | null = null;
    if (assetPath) {
      const signed = await supabase.storage.from(MAGNET_BUCKET).createSignedUrl(assetPath, SIGNED_URL_TTL, { download: true });
      if (signed.error) return json({ ok: true, download_url: null, warning: "Lead saved but the download link could not be generated: " + signed.error.message });
      downloadUrl = signed.data.signedUrl;
    }

    return json({ ok: true, download_url: downloadUrl });
  } catch (err) {
    return json({ ok: false, error: String((err as Error)?.message ?? err) }, 500);
  }
});
