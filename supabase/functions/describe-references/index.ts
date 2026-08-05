// describe-references: for a given ideaId, describe each newly-uploaded style
// reference image with the Anthropic vision API (palette, lighting, composition,
// mood, subject, summary) and store that descriptor back on the row so the
// content pipeline can weave it into image prompts. Runs on upload; safe to
// re-run (only touches rows not yet described).
import { createClient } from "npm:@supabase/supabase-js@2";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const REF_BUCKET = "style-references"; // private
// CORS: called cross-origin from the browser admin, so responses + the OPTIONS
// preflight must carry these or the browser blocks it with "Failed to fetch".
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "content-type, authorization", "access-control-allow-methods": "POST, OPTIONS" };

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b, null, 2), { status: s, headers: { "content-type": "application/json", ...CORS } });

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary);
}
function mediaType(mime: string, path: string): string {
  const m = (mime || "").toLowerCase();
  if (m.startsWith("image/") && /(jpeg|png|webp|gif)/.test(m)) return m;
  const ext = (path.split(".").pop() || "").toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "image/jpeg";
}

async function describe(mediaTypeStr: string, base64: string) {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) throw new Error("ANTHROPIC_API_KEY not set");
  const prompt = `You are an art director cataloguing a visual style reference. Look at this image and respond with ONLY a JSON object, no prose, no markdown fences:\n{\n  "palette": "the dominant colours and overall colour feel",\n  "lighting": "the quality and direction of light",\n  "composition": "framing, balance, use of space",\n  "mood": "the emotional tone",\n  "subject": "what is depicted",\n  "summary": "one sentence capturing the overall style"\n}`;
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 600,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaTypeStr, data: base64 } },
          { type: "text", text: prompt },
        ],
      }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error("Anthropic error: " + JSON.stringify(data));
  const text = data.content?.map((c: { text?: string }) => c.text || "").join("") ?? "";
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("Anthropic did not return JSON: " + text.slice(0, 200));
  return JSON.parse(m[0].replace(/,(\s*[}\]])/g, "$1"));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const { ideaId } = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    if (!ideaId) return json({ ok: false, error: "ideaId required" }, 400);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: refs, error } = await supabase
      .from("content_style_references")
      .select("id, storage_path, mime, status")
      .eq("idea_id", ideaId)
      .neq("status", "described");
    if (error) throw error;

    let described = 0;
    for (const ref of refs ?? []) {
      try {
        const dl = await supabase.storage.from(REF_BUCKET).download(ref.storage_path);
        if (dl.error) throw dl.error;
        const bytes = new Uint8Array(await dl.data.arrayBuffer());
        const descriptor = await describe(mediaType(ref.mime, ref.storage_path), toBase64(bytes));
        await supabase.from("content_style_references")
          .update({ descriptor, description: descriptor.summary || "", status: "described", error: null })
          .eq("id", ref.id);
        described++;
      } catch (err) {
        await supabase.from("content_style_references")
          .update({ status: "failed", error: String((err as Error)?.message ?? err) })
          .eq("id", ref.id);
      }
    }
    return json({ ok: true, described, total: (refs ?? []).length });
  } catch (err) {
    return json({ ok: false, error: String((err as Error)?.message ?? err) }, 500);
  }
});
