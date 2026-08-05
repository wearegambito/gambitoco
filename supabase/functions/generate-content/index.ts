// generate-content: the pipeline. idea + style guide + reference descriptors
// -> Anthropic concept + copy variants -> Higgsfield Soul imagery -> download
// -> re-host in the PUBLIC content-assets bucket -> Buffer draft (option a:
// strongest variant; single image or carousel). Traceable + retryable via
// content_runs / content_copy_variants / content_assets / content_posts.
// Returns a runId immediately; work runs in the background.
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

const HF_BASE = "https://platform.higgsfield.ai";
const BUFFER_API = "https://api.buffer.com";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const CONTENT_BUCKET = "content-assets";
// CORS: the admin calls this cross-origin from the live site, so every
// response (and the OPTIONS preflight) must carry these or the browser
// blocks the request with "Failed to fetch".
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "content-type, authorization", "access-control-allow-methods": "POST, OPTIONS" };

const CHANNELS: Record<string, string> = {
  instagram: "65c6d89d083b362516a80a5b",
  twitter: "65c6d875083b362516a74bab",
  linkedin: "65c6d8bf083b362516a98657",
};
const sizeFor = (t: string) => (t === "story" || t === "reel" ? "1152x2048" : "1536x1536");
const slideCountFor = (t: string) => (t === "carousel" ? 3 : 1);

const STYLE_GUIDE = `Gambito is an Auckland venture studio. Visual identity: a sophisticated presence in a "black classy dress" — composed and expensive at first glance, warm underneath. Palette: deep British racing green (#032721) base, creamy beige (#f0e7d4) light, a single coral accent (#fa4d56) used sparingly like lipstick. Aesthetic: cinematic, minimal, moody; backlit silhouettes, volumetric haze, soft gradient rim-light, fine film grain, generous negative space, centred composition. Motif (as seasoning, never literal): chess / the gambit / the first move. Voice: confident, warm, plain, jargon-free; short then sharp; speaks to founders moving from hesitation to action.`;

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b, null, 2), { status: s, headers: { "content-type": "application/json", ...CORS } });
const sb = () => createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

async function concept(idea: any, descriptors: unknown[], slides: number) {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) throw new Error("ANTHROPIC_API_KEY not set");
  const user = `IDEA BRIEF: ${idea.brief}\nNOTES: ${idea.notes || "(none)"}\nPOST TYPE: ${idea.post_type} (${slides} image${slides > 1 ? "s" : ""})\nSTYLE REFERENCE DESCRIPTORS: ${JSON.stringify(descriptors)}\n\nProduce content for an Instagram ${idea.post_type}. Put any hashtags inside each caption. Respond with ONLY a JSON object:\n{\n  "concept": "the creative concept in 1-2 sentences",\n  "image_prompts": [${slides} detailed text-to-image prompt(s), on-brand, ${slides > 1 ? "visually consistent across slides as a set" : "a single strong image"}, weaving in the style references],\n  "variants": [3 copy options, each {"caption":"full caption including hashtags","hashtags":"space-separated #tags","rationale":"why this angle"}],\n  "best": 0\n}`;
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-5", max_tokens: 2000, system: STYLE_GUIDE, messages: [{ role: "user", content: user }] }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error("Anthropic error: " + JSON.stringify(data));
  const text = data.content?.map((c: { text?: string }) => c.text || "").join("") ?? "";
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("Anthropic did not return JSON: " + text.slice(0, 200));
  return JSON.parse(m[0]);
}

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

async function bufferGraphQL(query: string, variables: Record<string, unknown> = {}) {
  const token = Deno.env.get("BUFFER_ACCESS_TOKEN");
  if (!token) throw new Error("BUFFER_ACCESS_TOKEN not set");
  const res = await fetch(BUFFER_API, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ query, variables }) });
  const out = await res.json().catch(() => ({}));
  if (out.errors) throw new Error("Buffer error: " + JSON.stringify(out.errors));
  return out.data;
}
async function bufferDraft(channelId: string, caption: string, urls: string[]) {
  const assets = urls.map((u) => `{ image:{ url:${JSON.stringify(u)} } }`).join(",");
  const q = `mutation($channelId:ChannelId!,$text:String!){ createPost(input:{ channelId:$channelId, text:$text, mode:addToQueue, schedulingType:automatic, saveToDraft:true, needsApproval:false, assets:[${assets}], metadata:{ instagram:{ type:post, shouldShareToFeed:true } } }){ __typename ... on PostActionSuccess { post { id status } } ... on InvalidInputError { message } ... on UnauthorizedError { message } ... on LimitReachedError { message } ... on NotFoundError { message } ... on RestProxyError { message } ... on UnexpectedError { message } } }`;
  const data = await bufferGraphQL(q, { channelId, text: caption });
  const cp = data.createPost;
  if (cp.__typename !== "PostActionSuccess") throw new Error("Buffer draft failed: " + JSON.stringify(cp));
  return cp.post;
}

async function runPipeline(supabase: SupabaseClient, runId: string, idea: any) {
  try {
    const { data: refs } = await supabase.from("content_style_references").select("descriptor,status").eq("idea_id", idea.id);
    const descriptors = (refs ?? []).filter((r) => r.status === "described").map((r) => r.descriptor);

    const slides = slideCountFor(idea.post_type);
    const c = await concept(idea, descriptors, slides);
    const prompts: string[] = Array.isArray(c.image_prompts) ? c.image_prompts.slice(0, slides) : [String(c.image_prompts)];
    while (prompts.length < slides) prompts.push(prompts[prompts.length - 1]);
    const variants = Array.isArray(c.variants) ? c.variants : [];
    const best = Math.min(Math.max(0, Number(c.best) || 0), Math.max(0, variants.length - 1));

    await supabase.from("content_runs").update({ concept: c.concept || "", image_prompt: prompts.join("\n---\n"), style_snapshot: { style_guide: STYLE_GUIDE, descriptors }, stage: "imagery" }).eq("id", runId);
    const { data: variantRows } = await supabase.from("content_copy_variants").insert(
      variants.map((v: any, i: number) => ({ run_id: runId, idea_id: idea.id, variant_index: i, caption: v.caption || "", hashtags: v.hashtags || "", rationale: v.rationale || "" })),
    ).select();

    const size = sizeFor(idea.post_type);
    const assetRows: any[] = [];
    for (let i = 0; i < prompts.length; i++) {
      const { data: a } = await supabase.from("content_assets").insert({ run_id: runId, idea_id: idea.id, generator: "higgsfield", status: "generating", position: i }).select().single();
      assetRows.push(a);
    }
    const generated = await Promise.all(prompts.map((p) => soulGenerate(p, size)));

    const publicUrls: string[] = [];
    for (let i = 0; i < generated.length; i++) {
      const img = await fetch(generated[i].url);
      if (!img.ok) throw new Error(`download generated image ${i} failed: HTTP ${img.status}`);
      const bytes = new Uint8Array(await img.arrayBuffer());
      const ct = img.headers.get("content-type") || "image/png";
      const ext = ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : "jpg";
      const path = `${idea.id}/${runId}/${i}.${ext}`;
      const up = await supabase.storage.from(CONTENT_BUCKET).upload(path, bytes, { contentType: ct, upsert: true });
      if (up.error) throw up.error;
      const publicUrl = supabase.storage.from(CONTENT_BUCKET).getPublicUrl(path).data.publicUrl;
      publicUrls.push(publicUrl);
      await supabase.from("content_assets").update({ generator_job_id: generated[i].requestId, source_url: generated[i].url, storage_path: path, public_url: publicUrl, status: "stored" }).eq("id", assetRows[i].id);
    }

    const channelId = CHANNELS[idea.target_service] || CHANNELS.instagram;
    const bestVariant = variants[best] || {};
    let caption = bestVariant.caption || c.concept || idea.brief;
    if (bestVariant.hashtags && !caption.includes("#")) caption += "\n\n" + bestVariant.hashtags; // hashtags in caption (first-comment needs a paid Buffer plan)
    await supabase.from("content_runs").update({ stage: "drafting" }).eq("id", runId);
    const post = await bufferDraft(channelId, caption, publicUrls);

    await supabase.from("content_posts").insert({
      run_id: runId, idea_id: idea.id, asset_id: assetRows[0]?.id, copy_variant_id: variantRows?.[best]?.id,
      buffer_channel_id: channelId, service: idea.target_service, buffer_post_id: post.id, buffer_status: post.status,
      media_url: publicUrls[0], media: publicUrls.map((u, i) => ({ asset_id: assetRows[i]?.id, url: u })), status: "drafted",
    });
    await supabase.from("content_runs").update({ status: "succeeded", stage: "done", finished_at: new Date().toISOString() }).eq("id", runId);
    await supabase.from("content_ideas").update({ status: "drafted" }).eq("id", idea.id);
  } catch (err) {
    const msg = String((err as Error)?.message ?? err);
    await supabase.from("content_runs").update({ status: "failed", error: msg, finished_at: new Date().toISOString() }).eq("id", runId);
    await supabase.from("content_ideas").update({ status: "failed" }).eq("id", idea.id);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const { ideaId } = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    if (!ideaId) return json({ ok: false, error: "ideaId required" }, 400);
    const supabase = sb();
    const { data: idea, error } = await supabase.from("content_ideas").select("*").eq("id", ideaId).single();
    if (error || !idea) return json({ ok: false, error: "idea not found" }, 404);

    const { data: run, error: runErr } = await supabase.from("content_runs").insert({ idea_id: ideaId, status: "running", stage: "concept", started_at: new Date().toISOString() }).select().single();
    if (runErr) throw runErr;
    await supabase.from("content_ideas").update({ status: "generating" }).eq("id", ideaId);

    // deno-lint-ignore no-explicit-any
    (globalThis as any).EdgeRuntime?.waitUntil?.(runPipeline(supabase, run.id, idea)) ?? runPipeline(supabase, run.id, idea);
    return json({ ok: true, runId: run.id, status: "running", note: "Generation started; the draft will appear in Buffer when done." });
  } catch (err) {
    return json({ ok: false, error: String((err as Error)?.message ?? err) }, 500);
  }
});
