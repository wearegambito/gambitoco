/* /services/design — design portfolio: scroll-driven stacked deck + progressively-loaded case-study detail.
   Projects come from the CMS (`portfolio_projects`): baked into the page at build time by
   scripts/prerender.mjs, or fetched live when there's no baked copy (dev). */
"use strict";

// Media files live in the public Supabase Storage `portfolio` bucket; rows store object paths.
const STORAGE = "https://wtzklaumnzezgzgzllgn.supabase.co/storage/v1/object/public/portfolio";
const fileUrl = (path) => (!path ? "" : /^https?:\/\//i.test(path) ? path : `${STORAGE}/${path}`);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const list = (v) => (Array.isArray(v) ? v.filter(Boolean) : []);

async function loadProjects() {
  try {
    const baked = JSON.parse(document.getElementById("portfolio-data")?.textContent || "[]");
    if (baked.length) return baked;
  } catch (e) {}
  const { supabase } = await import("../../src/supabase.js");   // only loaded when nothing was baked
  const { data, error } = await supabase.from("portfolio_projects").select("*").eq("published", true).order("order_index");
  if (error) console.error("portfolio:", error.message);
  return data || [];
}
const PROJECTS = (await loadProjects()).map((p) => ({ ...p, id: p.slug, cats: p.categories }));

const N = PROJECTS.length;
const byId = {}; PROJECTS.forEach((p, i) => { p.index = i; byId[p.id] = p; });

const $ = (s, r) => (r || document).querySelector(s);
const elt = (t, c) => { const e = document.createElement(t); if (c) e.className = c; return e; };
const pad2 = (n) => String(n).padStart(2, "0");
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ============ WORK INDEX: the deck ============ */
const cardsWrap = $("#cards"), cards = [];
// the card cover is the project's first (hero) image
const coverOf = (p) => (p.media || []).find((m) => m.path && m.type !== "video");
// responsive <img> attrs: the 1000w variant as src, plus the full file in srcset when there is one
const imgAttrs = (m, sizes) => m.path_sm
  ? `src="${fileUrl(m.path_sm)}" srcset="${fileUrl(m.path_sm)} 1000w, ${fileUrl(m.path)} 2000w" sizes="${sizes}"`
  : `src="${fileUrl(m.path)}"`;
// cards are just the hero image (4:3, like the heroes); a project without media shows its name
PROJECTS.forEach((p, i) => {
  const c = elt("div", "card");
  const cover = coverOf(p);
  c.setAttribute("aria-label", `${p.name} — see project`);
  c.innerHTML =
    (cover ? `<img class="card-cover" ${imgAttrs(cover, "(max-width:1000px) 90vw, 920px")} alt="" ${i < 2 ? "" : 'loading="lazy"'} decoding="async">`
      : `<span class="card-name">${esc(p.name)}</span>`) +
    '<span class="cta">See project →</span>';
  c.addEventListener("click", () => { if (c.classList.contains("is-front")) openProject(p.index); });
  cardsWrap.appendChild(c); cards.push(c);
});
$("#deckTot").textContent = pad2(N);
cards.forEach((c, i) => { c.style.zIndex = i + 1; });   // fixed order: later cards stack on top
const dotsWrap = $("#deckDots");
cards.forEach((_, i) => { const d = elt("i"); if (i === 0) d.className = "on"; dotsWrap.appendChild(d); });
const dots = Array.from(dotsWrap.children);

// reduced-motion fallback grid
const fb = $("#deckFallback");
PROJECTS.forEach((p) => {
  const c = elt("div", "fc");
  const cover = coverOf(p);
  c.setAttribute("aria-label", `${p.name} — see project`);
  c.innerHTML = cover
    ? `<img src="${fileUrl(cover.path_sm || cover.path)}" alt="" loading="lazy" decoding="async" style="display:block;width:100%;aspect-ratio:4/3;object-fit:cover">`
    : `<div style="aspect-ratio:4/3;display:grid;place-items:center;font-family:var(--font-display);font-weight:700;font-size:1.5rem">${esc(p.name)}</div>`;
  c.addEventListener("click", () => openProject(p.index));
  fb.appendChild(c);
});

const track = $("#deckTrack"), stage = $(".deck-stage"), nowEl = $("#deckNow");
const STEP = 0.82; // viewport heights of scroll per card
function sizeTrack() {
  if (reduce) { track.style.height = "auto"; return; }
  track.style.height = (stage.offsetHeight + (N - 1) * window.innerHeight * STEP) + "px";
}
// Motion: stacking order is fixed (later cards above earlier ones), so nothing swaps mid-scroll.
// The next card slides up from below over the front one; passed cards ease back into the stack
// behind it. Progress eases toward the scroll position so wheel steps don't make it jump.
let lastFront = -1, rafId = 0, shown = null;
const deckProgress = () => {
  const total = track.offsetHeight - stage.offsetHeight;
  return total > 0 ? Math.max(0, Math.min(1, -track.getBoundingClientRect().top / total)) : 0;
};
function paint(p) {
  const front = p * (N - 1);
  for (let i = 0; i < N; i++) {
    const d = i - front, c = cards[i];
    let ty, sc, dim;
    if (d > 0) { ty = Math.min(d, 1.2) * 115; sc = 1; dim = 1; }                  // upcoming: below, sliding up
    else { const s = Math.min(-d, 4); ty = -s * 4.2; sc = 1 - s * 0.055; dim = 1 - s * 0.09; } // passed: back into the stack
    c.style.transform = `translate3d(0,${ty.toFixed(3)}%,0) scale(${sc.toFixed(4)})`;
    c.style.filter = dim < 1 ? `brightness(${dim.toFixed(3)})` : "";
    c.style.visibility = d > 1.2 || d < -5 ? "hidden" : "";
  }
  const fi = Math.max(0, Math.min(N - 1, Math.round(front)));
  if (fi !== lastFront) {
    lastFront = fi;
    cards.forEach((c, i) => c.classList.toggle("is-front", i === fi));
    dots.forEach((d, i) => d.classList.toggle("on", i === fi));
    nowEl.textContent = pad2(fi + 1);
  }
}
function layout(snap) {
  if (reduce || document.body.classList.contains("view-detail")) { rafId = 0; return; }
  const target = deckProgress();
  if (shown === null || snap === true) shown = target;
  else shown += (target - shown) * 0.14;
  if (Math.abs(target - shown) < 0.0004) shown = target;
  paint(shown);
  rafId = shown !== target ? requestAnimationFrame(layout) : 0;
}
function onScroll() { if (!rafId) rafId = requestAnimationFrame(layout); }

/* ============ PROJECT DETAIL: progressive loading ============ */
const projsWrap = $("#projs");
let sequence = [], seqPos = 0, io = null;

// Group media into rows: span 2 = full width, span-1 items pair up. A paired row splits its width
// by each item's aspect ratio, so both share one height with nothing cropped or distorted.
const ratioOf = (m) => (m.w && m.h ? m.w / m.h : m.span === 2 ? 16 / 9 : 4 / 5);
function buildRows(media) {
  const rows = []; let i = 0;
  while (i < media.length) {
    const m = media[i], next = media[i + 1];
    if (m.span !== 2 && next && next.span !== 2) { rows.push([m, next]); i += 2; }
    else { rows.push([m]); i++; }
  }
  return rows;
}
function mediaBox(m, p) {
  const ar = ratioOf(m).toFixed(4);
  let inner;
  if (m.path && m.type === "video") {
    // no controls; autoplay + 5s-pause loop wired by setupVideos()
    inner = `<video class="media-el" src="${fileUrl(m.path)}" ${m.poster ? `poster="${fileUrl(m.poster)}"` : ""} muted playsinline preload="none"></video>`;
  } else if (m.path) {
    inner = `<img class="media-el" ${imgAttrs(m, `(max-width:860px) 92vw, ${m.span === 2 ? "62vw" : "36vw"}`)} alt="${esc(m.alt || p.name)}" loading="lazy" decoding="async">`;
  } else {
    // no file yet: dotted placeholder; video drifts, gif shimmers
    inner = '<div class="ph"></div>' + (m.type === "video" ? '<div class="videomo"></div>' : m.type === "gif" ? '<div class="gifshine"></div>' : "");
  }
  // very tall media (full-page scrolls) gets a top-anchored crop on phones, where it would stack huge
  return `<figure class="box${ratioOf(m) < 0.5 ? " tall" : ""}" style="aspect-ratio:${ar};flex:${ar} 1 0">${inner}` +
    (m.cap ? `<figcaption class="cap">${esc(m.cap)}</figcaption>` : "") + "</figure>";
}

// Real <video> media: autoplay muted, no controls, loop with a 5-second pause,
// and only while on screen. Inert when there are no real videos (placeholders).
function setupVideos(root) {
  root.querySelectorAll("video.media-el").forEach((v) => {
    v.muted = true; v.playsInline = true; v.controls = false; v.loop = false; v.preload = "none";
    v.addEventListener("ended", () => setTimeout(() => { try { v.currentTime = 0; v.play(); } catch (e) {} }, 5000));
    const vo = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { v.play().catch(() => {}); } else { v.pause(); }
    }), { threshold: 0.25 });
    vo.observe(v);
  });
}
function projectSection(p) {
  const sec = elt("section", "proj"); sec.id = "proj-" + p.id; sec.dataset.index = p.index;
  const rowsHtml = buildRows(p.media || []).map((row) =>
    `<div class="mrow">${row.map((m) => mediaBox(m, p)).join("")}</div>`
  ).join("");
  // only the name is required; every other field is left out when empty
  const meta = [["Client", p.client], ["Year", p.year], ["Scope", p.scope]]
    .filter(([, v]) => v).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join("") +
    (list(p.services).length ? `<dt>Services</dt><dd><div class="chips">${list(p.services).map((s) => `<span class="chip">${esc(s)}</span>`).join("")}</div></dd>` : "");
  const href = p.url ? (/^https?:\/\//i.test(p.url) ? p.url : "https://" + p.url) : "";
  sec.innerHTML =
    '<div class="proj-grid">' +
      // phones: a slim title bar that sticks to the top for as long as this project is on screen
      `<div class="pbar" aria-hidden="true"><span class="pbar-name">${esc(p.name)}</span><span class="pbar-num">${pad2(p.index + 1)} / ${pad2(N)}</span></div>` +
      '<aside class="pinfo">' +
        `<div class="pnum">${pad2(p.index + 1)} / ${pad2(N)}</div>` +
        `<h2>${esc(p.name)}</h2>` +
        (p.lede ? `<p class="lede">${esc(p.lede)}</p>` : "") +
        (meta ? `<dl class="meta">${meta}</dl>` : "") +
        (href ? `<a class="visit" href="${esc(href)}" target="_blank" rel="noopener">Visit live site ↗</a>` : "") +
      "</aside>" +
      `<div class="media">${rowsHtml}</div>` +
    "</div>";
  return sec;
}
// between projects: just a quiet "keep scrolling" line; the end-cap leads back to the deck
function cueOrEnd(nextSeqPos) {
  if (nextSeqPos < N) {
    const cue = elt("div", "nextcue");
    cue.innerHTML = '<div class="nextcue-in"><span class="lbl">Keep scrolling · next project</span></div>';
    cue.dataset.seq = nextSeqPos;
    return cue;
  }
  const end = elt("div", "detail-end");
  end.innerHTML = '<div class="nextcue-in"><span class="lbl">That’s the work</span>' +
    '<button type="button" id="toWork">← Back to all work</button></div>';
  return end;
}
function appendNext() {
  if (seqPos >= N) return;
  const p = PROJECTS[sequence[seqPos]];
  const section = projectSection(p);
  projsWrap.appendChild(section);
  setupVideos(section);                        // wire any real <video> media
  seqPos++;
  const cue = cueOrEnd(seqPos);
  projsWrap.appendChild(cue);
  if (seqPos < N) io.observe(cue);           // load the next project when this cue scrolls near
  else $("#toWork").addEventListener("click", () => showWork());
}
function openProject(start) {
  // sequence = clicked project first, then the rest in order (seamless loop), end-cap last
  sequence = []; for (let k = 0; k < N; k++) sequence.push((start + k) % N);
  seqPos = 0;
  projsWrap.innerHTML = "";
  if (io) io.disconnect();
  io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { io.unobserve(e.target); appendNext(); } });
  }, { rootMargin: "300px 0px" });
  appendNext();                               // render only the opened project first

  document.body.classList.add("view-detail");
  $("#wkBack").hidden = false;
  try { history.replaceState(null, "", "#" + PROJECTS[start].id); } catch (e) {}
  window.scrollTo(0, 0);
}
function showWork() {
  document.body.classList.remove("view-detail");
  $("#wkBack").hidden = true;
  if (io) io.disconnect();
  try { history.replaceState(null, "", location.pathname); } catch (e) {}
  sizeTrack();
  window.scrollTo(0, 0);
  requestAnimationFrame(() => layout(true));   // jump straight to the current position
}
$("#wkBack").addEventListener("click", () => showWork());

/* ============ init ============ */
window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", () => { sizeTrack(); onScroll(); });
sizeTrack();

const h = (location.hash || "").replace("#", "");
if (h && byId[h]) openProject(byId[h].index); else layout();
