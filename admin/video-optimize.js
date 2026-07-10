// In-browser video optimiser for the CMS background video.
//
// The homepage video is scroll-scrubbed: the player is seeked to an exact
// frame on every scroll tick. That only stays smooth if the file has very
// frequent keyframes (so each seek decodes from a nearby keyframe) and is
// small. A raw upload has sparse keyframes and stutters.
//
// Rather than run ffmpeg on a server (Supabase edge functions can't, and a
// Netlify function would need the service-role key + a bundled binary), we
// re-encode right here in the admin's browser with ffmpeg compiled to
// WebAssembly. Same recipe used to prepare the bundled /hero.mp4.
//
// The library is loaded from a CDN as its self-contained UMD build (worker
// inlined) rather than through the bundler — @ffmpeg/ffmpeg's worker doesn't
// survive Vite's worker transform, so bundling it hangs/fails to load the core.
const FFMPEG_VER = "0.12.10";
const UTIL_VER = "0.12.1";
const CORE_VER = "0.12.6";
// ESM build — @ffmpeg/ffmpeg runs a module worker that import()s the core,
// so the core must expose an ES-module default (the UMD build does not)
const CORE_BASE = `https://unpkg.com/@ffmpeg/core@${CORE_VER}/dist/esm`;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[data-ff="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.dataset.ff = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Couldn't load the video optimiser (network?)."));
    document.head.appendChild(s);
  });
}

let ffmpegPromise = null;
function getFFmpeg() {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      await loadScript(`https://unpkg.com/@ffmpeg/util@${UTIL_VER}/dist/umd/index.js`);
      await loadScript(`https://unpkg.com/@ffmpeg/ffmpeg@${FFMPEG_VER}/dist/umd/ffmpeg.js`);
      const { FFmpeg } = window.FFmpegWASM;
      const { toBlobURL } = window.FFmpegUtil;
      const ffmpeg = new FFmpeg();
      // the wrapper worker is a separate CDN file; a Worker can't be built
      // from a cross-origin URL, so load it as a same-origin blob instead
      await ffmpeg.load({
        classWorkerURL: await toBlobURL(`https://unpkg.com/@ffmpeg/ffmpeg@${FFMPEG_VER}/dist/umd/814.ffmpeg.js`, "text/javascript"),
        coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
      });
      return ffmpeg;
    })().catch((err) => { ffmpegPromise = null; throw err; });
  }
  return ffmpegPromise;
}

export const isVideoFile = (file) => !!file && /^video\//.test(file.type || "");

// Re-encode for scroll-scrubbing: keyframe every 4 frames, no audio, capped
// width, yuv420p, faststart. Returns an optimised MP4 Blob.
export async function optimizeVideo(file, onProgress) {
  const ffmpeg = await getFFmpeg();
  const handler = onProgress ? ({ progress }) => onProgress(Math.max(0, Math.min(1, progress || 0))) : null;
  if (handler) ffmpeg.on("progress", handler);
  const inName = "input" + (/\.[a-z0-9]+$/i.exec(file.name)?.[0] || ".mp4");
  const outName = "hero-optimised.mp4";
  try {
    await ffmpeg.writeFile(inName, await window.FFmpegUtil.fetchFile(file));
    await ffmpeg.exec([
      "-i", inName,
      "-an",
      "-vf", "scale='min(1600,iw)':-2",
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-crf", "24",
      "-g", "4", "-keyint_min", "4", "-sc_threshold", "0",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      outName,
    ]);
    const data = await ffmpeg.readFile(outName);
    return new Blob([data.buffer], { type: "video/mp4" });
  } finally {
    if (handler) ffmpeg.off("progress", handler);
    try { await ffmpeg.deleteFile(inName); } catch { /* ignore */ }
    try { await ffmpeg.deleteFile(outName); } catch { /* ignore */ }
  }
}
