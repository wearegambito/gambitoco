// generate-blog-image: on-brand cover/social imagery for Insights (blog) posts.
// Same pattern as the social pipeline: build a prompt from the post's title +
// excerpt (+ optional direction), append the fixed brand look, generate with
// Higgsfield Soul, re-host in the PUBLIC content-assets bucket, return the URL.
// Synchronous — the admin waits for the URL and drops it into the image field.
import { createClient } from "npm:@supabase/supabase-js@2";

const HF_BASE = "https://platform.higgsfield.ai";
const CONTENT_BUCKET = "content-assets";
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "content-type, authorization", "access-control-allow-methods": "POST, OPTIONS" };

// same brand clause the social pipeline appends, so blog imagery matches
const BRAND_LOOK = "Colour palette, strictly: deep British racing green (#032721) as the dominant background and base tone, warm creamy beige (#f0e7d4) for light and highlights, and a single restrained coral (#fa4d56) accent used sparingly. Overall look: cinematic, moody, minimal and editorial — backlit silhouettes, soft volumetric haze, gentle gradient rim-light, fine film grain, generous negative space, centred composition. No bright primary colours, no busy backgrounds, no text overlays.";

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b, null, 2), { status: s, headers: { "content-type": "application/json", ...CORS } });

function hfHeaders() {
  const id = Deno.env.get("HIGGSFIELD_KEY_ID"), secret = Deno.env.get("HIGGSFIELD_KEY_SECRET");
  if (!id || !secret) throw new Error("HIGGSFIELD_KEY_ID / HIGGSFIELD_KEY_SECRET not set");
  return { "content-type": "application/json", authorization: `Key ${id}:${secret}` };
}
function findImageUrl(obj: any): string | null {
  if (!obj || typeof obj !== "object") return null;
  const direct = obj.images?.[0]?.url || obj.results?.[0]?.url || obj.jobs?.[0]?.results?.raw?.url || obj.output?.url || obj.url;
  if (typeof direct === "string" && direct.startsWith("http")) return direct;
  for (const v of Object.values(obj)) {
    if (typeof v === "string" && /^https?:\/\/.*\.(jpe?g|png|webp)/i.test(v)) return v;
    if (typeof v === "object") { const n = findImageUrl(v); if (n) return n; }
  }
  return null;
}
async function soulGenerate(prompt: string, size: string): Promise<{ requestId: string; url: string }> {
  const submit = await fetch(`${HF_BASE}/v1/text2image/soul`, { method: "POST", headers: hfHeaders(), body: JSON.stringify({ params: { prompt, width_and_height: size } }) });
  const sj = await submit.json().catch(() => ({}));
  if (!submit.ok) throw new Error(`Higgsfield submit ${submit.status}: ${JSON.stringify(sj)}`);
  const requestId = sj.request_id || sj.id || sj.requestId;
  if (!requestId) throw new Error("Higgsfield: no request id in " + JSON.stringify(sj));
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 4000));
    const s = await fetch(`${HF_BASE}/requests/${requestId}/status`, { headers: hfHeaders() });
    const st = await s.json().catch(() => ({}));
    if (st.status === "completed") { const url = findImageUrl(st); if (!url) throw new Error("completed but no image url: " + JSON.stringify(st)); return { requestId, url }; }
    if (st.status === "failed" || st.status === "nsfw") throw new Error(`Higgsfield ${st.status}: ${JSON.stringify(st)}`);
  }
  throw new Error("Higgsfield timed out waiting for image");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const title = String(body.title || "").trim();
    const summary = String(body.summary || "").trim();
    const direction = String(body.direction || "").trim();
    const id = String(body.id || "post").replace(/[^a-zA-Z0-9._-]/g, "-");
    // landscape by default for blog covers/social (1200x630-ish); override via body.size
    const size = String(body.size || "2048x1152");

    if (!title && !summary && !direction) return json({ ok: false, error: "Give the post a title or an image direction first." }, 400);

    // build the image prompt: explicit direction wins, else the post itself
    const subject = direction || [title, summary].filter(Boolean).join(". ");
    const prompt = `${subject}\n\nA symbolic, atmospheric editorial blog cover image (no text, no words, no letters). ${BRAND_LOOK}`;

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const gen = await soulGenerate(prompt, size);

    const img = await fetch(gen.url);
    if (!img.ok) throw new Error(`download generated image failed: HTTP ${img.status}`);
    const bytes = new Uint8Array(await img.arrayBuffer());
    const ct = img.headers.get("content-type") || "image/png";
    const ext = ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : "jpg";
    // stable-ish path per post; upsert so re-generating overwrites the last one
    const path = `blog/${id}/cover.${ext}`;
    const up = await supabase.storage.from(CONTENT_BUCKET).upload(path, bytes, { contentType: ct, upsert: true });
    if (up.error) throw up.error;
    const publicUrl = supabase.storage.from(CONTENT_BUCKET).getPublicUrl(path).data.publicUrl;
    // cache-bust so the admin preview refreshes after a re-generate
    return json({ ok: true, url: `${publicUrl}?v=${gen.requestId}` });
  } catch (err) {
    return json({ ok: false, error: String((err as Error)?.message ?? err) }, 500);
  }
});
