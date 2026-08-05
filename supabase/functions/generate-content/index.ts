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

// Appended to EVERY image prompt sent to Higgsfield so generated imagery
// stays on-brand in colour and mood regardless of what the model writes.
const BRAND_LOOK = "Colour palette, strictly: deep British racing green (#032721) as the dominant background and base tone, warm creamy beige (#f0e7d4) for light, highlights and skin, and a single restrained coral (#fa4d56) accent used sparingly. Overall look: cinematic, moody, minimal and editorial — backlit silhouettes, soft volumetric haze, gentle gradient rim-light, fine film grain, generous negative space, centred composition. No bright primary colours, no busy backgrounds, no text overlays.";

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b, null, 2), { status: s, headers: { "content-type": "application/json", ...CORS } });
const sb = () => createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

// Hard safety net over the caption rules the prompt asks for, so a stray
// model slip can't reach Instagram: no em/en dashes, no #Gambito, max 5 tags.
function cleanCaption(text: string): string {
  let t = String(text ?? "");
  t = t.replace(/\s*[—–]\s*/g, ", ");           // em/en dashes -> comma
  t = t.replace(/#gambito\b/gi, "");             // #Gambito is not a thing
  let n = 0;
  t = t.replace(/#[A-Za-z0-9_]+/g, (m) => (++n <= 5 ? m : "")); // keep first 5 hashtags
  return t
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +([,.!?])/g, "$1")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/^[ \t]+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function concept(idea: any, descriptors: unknown[], slides: number) {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) throw new Error("ANTHROPIC_API_KEY not set");
  const isCarousel = idea.post_type === "carousel";
  const direction = (idea.image_direction || "").trim();

  const mediaInstruction = isCarousel
    ? `Produce an Instagram CAROUSEL: one cover slide, 3 to 4 content slides, and one end/CTA slide (5 to 6 slides total). Slides are rendered as designed graphics with our brand colours and fonts applied automatically, so write the TEXT for each slide, not image prompts. Keep it highly readable: slide titles 6 words or fewer, body at most 2 short sentences. Write every slide title and all slide copy in sentence case (capitalise only the first word and proper nouns like Gambito), never Title Case.${direction ? ` DIRECTION from the user: ${direction}` : ""}`
    : `Produce content for an Instagram ${idea.post_type}. The brand colour palette (racing green #032721, beige #f0e7d4, coral #fa4d56) and cinematic moody look are enforced automatically on every image, so focus the image prompt on subject, composition and mood rather than restating exact hex.${direction ? `\nIMAGE DIRECTION (honour closely): ${direction}` : ""}`;

  const mediaJson = isCarousel
    ? `"kicker": "a 1-3 word topic label shown on every slide, e.g. Founder mindset",\n  "slides": [\n    {"kind":"cover","title":"the hook headline, short and punchy"},\n    {"kind":"content","title":"short slide title","body":"1 to 2 short sentences"},\n    {"kind":"content","title":"...","body":"..."},\n    {"kind":"content","title":"...","body":"..."},\n    {"kind":"end","title":"a call-to-action headline","body":"one short line","cta":"gambito.co"}\n  ],`
    : `"image_prompts": [${slides} detailed text-to-image prompt(s), ${slides > 1 ? "visually consistent across slides as a set" : "a single strong image"}, honouring the direction if given and weaving in the style references],`;

  const user = `IDEA BRIEF: ${idea.brief}\nNOTES: ${idea.notes || "(none)"}\nPOST TYPE: ${idea.post_type}\nSTYLE REFERENCE DESCRIPTORS: ${JSON.stringify(descriptors)}\n\n${mediaInstruction}\n\nCAPTION RULES (follow every one exactly):\n1. End every caption with a question or a clear call to action that invites engagement — a reply or comment, a DM, or a visit to the website.\n2. Use AT MOST 5 hashtags, placed together at the very end of the caption. Make them specific and relevant.\n3. NEVER use #Gambito or any brand-name hashtag; it is not an established tag.\n4. NEVER use em dashes or en dashes anywhere in the copy. Use commas, full stops, or separate short sentences instead.\n5. Voice: confident, warm, plain, jargon-free; short then sharp.\n\nRespond with ONLY a JSON object:\n{\n  "concept": "the creative concept in 1-2 sentences",\n  ${mediaJson}\n  "variants": [3 copy options, each {"caption":"full caption, ending in a question or CTA, with at most 5 relevant hashtags at the very end and no #Gambito, and absolutely no em/en dashes","hashtags":"the same hashtags (max 5, never #Gambito), space-separated","rationale":"why this angle"}],\n  "best": 0\n}`;
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
    const variants = Array.isArray(c.variants) ? c.variants : [];
    const best = Math.min(Math.max(0, Number(c.best) || 0), Math.max(0, variants.length - 1));
    const { data: variantRows } = await supabase.from("content_copy_variants").insert(
      variants.map((v: any, i: number) => ({ run_id: runId, idea_id: idea.id, variant_index: i, caption: cleanCaption(v.caption || ""), hashtags: v.hashtags || "", rationale: v.rationale || "" })),
    ).select();

    const publicUrls: string[] = [];
    const assetRows: any[] = [];

    if (idea.post_type === "carousel") {
      // designed slides (Satori) — image models can't render exact text
      const slidesArr = (Array.isArray(c.slides) ? c.slides : []).filter((s: any) => s && (s.title || s.body));
      if (!slidesArr.length) throw new Error("No carousel slides were generated.");
      await supabase.from("content_runs").update({ concept: c.concept || "", image_prompt: slidesArr.map((s: any) => `[${s.kind || "content"}] ${s.title || ""}${s.body ? " — " + s.body : ""}`).join("\n"), style_snapshot: { style_guide: STYLE_GUIDE, kicker: c.kicker || "", slides: slidesArr }, stage: "rendering" }).eq("id", runId);
      const rc = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/render-carousel`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ slides: slidesArr, path_prefix: `${idea.id}/${runId}`, kicker: c.kicker || "" }),
      });
      const rj = await rc.json().catch(() => ({}));
      if (!rc.ok || rj.ok === false) throw new Error("Slide rendering failed: " + (rj.error || `HTTP ${rc.status}`));
      for (const a of (rj.assets || [])) {
        const { data: row } = await supabase.from("content_assets").insert({ run_id: runId, idea_id: idea.id, generator: "satori", status: "stored", position: a.position, storage_path: a.storage_path, public_url: a.public_url }).select().single();
        assetRows.push(row);
        publicUrls.push(a.public_url);
      }
    } else {
      // single image / story / reel — Higgsfield Soul
      const prompts: string[] = Array.isArray(c.image_prompts) ? c.image_prompts.slice(0, slides) : [String(c.image_prompts)];
      while (prompts.length < slides) prompts.push(prompts[prompts.length - 1]);
      await supabase.from("content_runs").update({ concept: c.concept || "", image_prompt: prompts.join("\n---\n"), style_snapshot: { style_guide: STYLE_GUIDE, descriptors }, stage: "imagery" }).eq("id", runId);
      const size = sizeFor(idea.post_type);
      for (let i = 0; i < prompts.length; i++) {
        const { data: a } = await supabase.from("content_assets").insert({ run_id: runId, idea_id: idea.id, generator: "higgsfield", status: "generating", position: i }).select().single();
        assetRows.push(a);
      }
      const generated = await Promise.all(prompts.map((p) => soulGenerate(`${p}\n\n${BRAND_LOOK}`, size)));
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
    }

    const channelId = CHANNELS[idea.target_service] || CHANNELS.instagram;
    const bestVariant = variants[best] || {};
    let caption = bestVariant.caption || c.concept || idea.brief;
    if (bestVariant.hashtags && !caption.includes("#")) caption += "\n\n" + bestVariant.hashtags; // hashtags in caption (first-comment needs a paid Buffer plan)
    caption = cleanCaption(caption); // enforce: no em dashes, no #Gambito, max 5 hashtags
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
