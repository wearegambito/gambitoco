// render-carousel: turn an array of slide contents into branded PNG slides
// (Satori + resvg-wasm, brand fonts/colours), upload them to the public
// content-assets bucket, and return their URLs. Distinct cover / content / end
// templates, minimalist for readability, with a scroll arrow + slide numbers.
import satori from "npm:satori@0.10.13";
import { Resvg, initWasm } from "npm:@resvg/resvg-wasm@2.6.2";
import { createClient } from "npm:@supabase/supabase-js@2";

const FONT_BASE = (Deno.env.get("FONT_BASE") || "https://gambito.co/fonts").replace(/\/+$/, "");
const BUCKET = "content-assets";
const W = 1080, H = 1350;
const C = { green: "#032721", green2: "#063a2f", ink: "#f0e7d4", dim: "#a3a58c", faint: "#5c6b60", coral: "#fa4d56" };
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "content-type, authorization", "access-control-allow-methods": "POST, OPTIONS" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b, null, 2), { status: s, headers: { "content-type": "application/json", ...CORS } });

let wasmReady = false;
let FONTS: any[] | null = null;
async function buf(url: string) { const r = await fetch(url); if (!r.ok) throw new Error(`font ${r.status}: ${url}`); return new Uint8Array(await r.arrayBuffer()); }
async function loadFonts() {
  if (FONTS) return FONTS;
  const [cgb, cgx, sr, sm, sb] = await Promise.all([
    buf(`${FONT_BASE}/CabinetGrotesk-Bold.otf`), buf(`${FONT_BASE}/CabinetGrotesk-Extrabold.otf`),
    buf(`${FONT_BASE}/Satoshi-Regular.otf`), buf(`${FONT_BASE}/Satoshi-Medium.otf`), buf(`${FONT_BASE}/Satoshi-Bold.otf`),
  ]);
  FONTS = [
    { name: "Cabinet Grotesk", data: cgb, weight: 700, style: "normal" },
    { name: "Cabinet Grotesk", data: cgx, weight: 800, style: "normal" },
    { name: "Satoshi", data: sr, weight: 400, style: "normal" },
    { name: "Satoshi", data: sm, weight: 500, style: "normal" },
    { name: "Satoshi", data: sb, weight: 700, style: "normal" },
  ];
  return FONTS;
}

const el = (type: string, style: any, children: any) => ({ type, props: { style, children } });
const num = (i: number, total: number) => `${String(i + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;

function coverSlide(s: any, i: number, total: number, kicker: string) {
  return el("div", { width: `${W}px`, height: `${H}px`, display: "flex", flexDirection: "column", justifyContent: "space-between", backgroundColor: C.green, padding: "96px", fontFamily: "Satoshi" }, [
    el("div", { display: "flex", alignItems: "center" }, [
      el("div", { display: "flex", width: "18px", height: "18px", borderRadius: "4px", backgroundColor: C.coral, marginRight: "18px" }, ""),
      el("div", { display: "flex", fontFamily: "Cabinet Grotesk", fontWeight: 700, fontSize: "26px", letterSpacing: "4px", color: C.dim }, (s.kicker || kicker || "GAMBITO").toUpperCase()),
    ]),
    el("div", { display: "flex", flexDirection: "column" }, [
      el("div", { display: "flex", width: "96px", height: "6px", backgroundColor: C.coral, marginBottom: "36px" }, ""),
      el("div", { display: "flex", fontFamily: "Cabinet Grotesk", fontWeight: 800, fontSize: "92px", lineHeight: 1.03, color: C.ink }, s.title || ""),
    ]),
    el("div", { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "28px" }, [
      el("div", { display: "flex", color: C.faint }, num(i, total)),
      el("div", { display: "flex", color: C.coral, fontFamily: "Cabinet Grotesk", fontWeight: 700, fontSize: "30px" }, "Swipe →"),
    ]),
  ]);
}

function contentSlide(s: any, i: number, total: number, kicker: string) {
  return el("div", { width: `${W}px`, height: `${H}px`, display: "flex", flexDirection: "column", justifyContent: "space-between", backgroundColor: C.green, padding: "96px", fontFamily: "Satoshi" }, [
    el("div", { display: "flex", fontFamily: "Cabinet Grotesk", fontWeight: 700, fontSize: "24px", letterSpacing: "4px", color: C.faint }, (s.kicker || kicker || "GAMBITO").toUpperCase()),
    el("div", { display: "flex", flexDirection: "column" }, [
      s.title ? el("div", { display: "flex", fontFamily: "Cabinet Grotesk", fontWeight: 800, fontSize: "60px", lineHeight: 1.06, color: C.ink, marginBottom: s.body ? "32px" : "0" }, s.title) : "",
      s.body ? el("div", { display: "flex", fontFamily: "Satoshi", fontWeight: 400, fontSize: "36px", lineHeight: 1.45, color: C.dim }, s.body) : "",
    ]),
    el("div", { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "28px" }, [
      el("div", { display: "flex", color: C.faint }, num(i, total)),
      el("div", { display: "flex", color: C.coral, fontFamily: "Cabinet Grotesk", fontWeight: 700, fontSize: "34px" }, "→"),
    ]),
  ]);
}

function endSlide(s: any, i: number, total: number) {
  // distinct: coral background, dark text — signals the finale
  return el("div", { width: `${W}px`, height: `${H}px`, display: "flex", flexDirection: "column", justifyContent: "space-between", backgroundColor: C.coral, padding: "96px", fontFamily: "Satoshi" }, [
    el("div", { display: "flex", fontFamily: "Cabinet Grotesk", fontWeight: 800, fontSize: "30px", color: C.green }, "gambito"),
    el("div", { display: "flex", flexDirection: "column" }, [
      el("div", { display: "flex", fontFamily: "Cabinet Grotesk", fontWeight: 800, fontSize: "80px", lineHeight: 1.04, color: C.green, marginBottom: s.body ? "28px" : "0" }, s.title || "Ready to make your move?"),
      s.body ? el("div", { display: "flex", fontFamily: "Satoshi", fontWeight: 500, fontSize: "36px", lineHeight: 1.4, color: "#3a0f12" }, s.body) : "",
    ]),
    el("div", { display: "flex", alignItems: "center", justifyContent: "space-between" }, [
      el("div", { display: "flex", backgroundColor: C.green, color: C.ink, fontFamily: "Cabinet Grotesk", fontWeight: 700, fontSize: "30px", padding: "18px 34px", borderRadius: "100px" }, s.cta || "gambito.co"),
      el("div", { display: "flex", color: C.green, fontSize: "28px", fontFamily: "Cabinet Grotesk", fontWeight: 700 }, num(i, total)),
    ]),
  ]);
}

async function renderPng(tree: any, fonts: any[]) {
  const svg = await satori(tree, { width: W, height: H, fonts });
  return new Resvg(svg, { fitTo: { mode: "width", value: W } }).render().asPng();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const body = await req.json().catch(() => ({}));
    const slides = Array.isArray(body.slides) ? body.slides : [];
    const prefix = String(body.path_prefix || "carousel/adhoc").replace(/[^a-zA-Z0-9._\/-]/g, "-");
    const kicker = String(body.kicker || "GAMBITO");
    if (!slides.length) return json({ ok: false, error: "no slides" }, 400);

    if (!wasmReady) { await initWasm(fetch("https://unpkg.com/@resvg/resvg-wasm@2.6.2/index_bg.wasm")); wasmReady = true; }
    const fonts = await loadFonts();
    const total = slides.length;

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const assets: any[] = [];
    for (let i = 0; i < slides.length; i++) {
      const s = slides[i];
      const kind = s.kind || (i === 0 ? "cover" : i === total - 1 ? "end" : "content");
      const tree = kind === "cover" ? coverSlide(s, i, total, kicker) : kind === "end" ? endSlide(s, i, total) : contentSlide(s, i, total, kicker);
      const png = await renderPng(tree, fonts);
      const path = `${prefix}/${i}.png`;
      const up = await supabase.storage.from(BUCKET).upload(path, png, { contentType: "image/png", upsert: true });
      if (up.error) throw up.error;
      const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      assets.push({ position: i, storage_path: path, public_url: publicUrl, kind });
    }
    return json({ ok: true, assets });
  } catch (err) {
    return json({ ok: false, error: String((err as Error)?.message ?? err) }, 500);
  }
});
