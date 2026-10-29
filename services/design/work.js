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
// the card cover is the project's first (hero) image; without one the tagline carries the card
const coverOf = (p) => (p.media || []).find((m) => m.path && m.type !== "video");
// responsive <img> attrs: the 1000w variant as src, plus the full file in srcset when there is one
const imgAttrs = (m, sizes) => m.path_sm
  ? `src="${fileUrl(m.path_sm)}" srcset="${fileUrl(m.path_sm)} 1000w, ${fileUrl(m.path)} 2000w" sizes="${sizes}"`
  : `src="${fileUrl(m.path)}"`;
PROJECTS.forEach((p, i) => {
  const c = elt("div", "card"); if (p.accent) c.style.setProperty("--accent", p.accent);
  const cover = coverOf(p);
  if (cover) c.classList.add("has-cover");
  c.innerHTML =
    '<div class="band"></div>' +
    '<div class="face">' +
      (cover ? `<img class="cover" ${imgAttrs(cover, "(max-width:1000px) 90vw, 920px")} alt="" ${i < 2 ? "" : 'loading="lazy"'} decoding="async">` : "") +
      (list(p.cats).length ? '<div class="cats">' + list(p.cats).map((x) => `<span class="cat">${esc(x)}</span>`).join("") + "</div>" : "") +
      '<button class="cta" type="button">See project →</button>' +
      (!cover && p.tagline ? `<div class="tagline">${esc(p.tagline)}</div>` : "") +
    "</div>" +
    `<div class="foot"><span class="pname"><span class="pmark"></span>${esc(p.name)}</span>` +
      (p.tagline && cover ? `<span class="ptag">${esc(p.tagline)}</span>` : p.url ? `<span class="purl">${esc(p.url)}</span>` : "") + "</div>";
  c.addEventListener("click", () => { if (c.classList.contains("is-front")) openProject(p.index); });
  cardsWrap.appendChild(c); cards.push(c);
});
$("#deckTot").textContent = pad2(N);
const dotsWrap = $("#deckDots");
cards.forEach((_, i) => { const d = elt("i"); if (i === 0) d.className = "on"; dotsWrap.appendChild(d); });
const dots = Array.from(dotsWrap.children);

// reduced-motion fallback grid
const fb = $("#deckFallback");
PROJECTS.forEach((p) => {
  const c = elt("div", "fc");
  const cover = coverOf(p);
  c.innerHTML = `<div style="height:8px;background:${p.accent || "var(--ember)"}"></div>` +
    (cover ? `<img src="${fileUrl(cover.path_sm || cover.path)}" alt="" loading="lazy" decoding="async" style="display:block;width:100%;aspect-ratio:4/3;object-fit:cover">` : "") +
    `<div style="padding:1.6rem">` +
    (list(p.cats).length ? `<div style="font-family:var(--mono);font-size:.64rem;text-transform:uppercase;letter-spacing:.06em;opacity:.7">${list(p.cats).map(esc).join(" · ")}</div>` : "") +
    (p.tagline ? `<div style="font-family:var(--font-display);font-weight:700;font-size:1.5rem;line-height:1.1;margin:.6rem 0 1rem">${esc(p.tagline)}</div>` : "") +
    `<div style="font-family:var(--mono);font-size:.78rem">${esc(p.name)} — see project →</div></div>`;
  c.addEventListener("click", () => openProject(p.index));
  fb.appendChild(c);
});

const track = $("#deckTrack"), stage = $(".deck-stage"), nowEl = $("#deckNow");
const STEP = 0.82; // viewport heights of scroll per card
function sizeTrack() {
  if (reduce) { track.style.height = "auto"; return; }
  track.style.height = (stage.offsetHeight + (N - 1) * window.innerHeight * STEP) + "px";
}
let lastFront = -1, ticking = false;
function layout() {
  ticking = false;
  if (reduce || document.body.classList.contains("view-detail")) return;
  const rect = track.getBoundingClientRect();
  const total = track.offsetHeight - stage.offsetHeight;
  const p = Math.max(0, Math.min(1, (-rect.top) / total));
  const front = p * (N - 1);
  for (let i = 0; i < N; i++) {
    const d = i - front, ad = Math.abs(d); let ty, sc;
    // cards stay fully opaque; upcoming peek up behind, passed recede down into the background
    if (d >= 0) { const s = Math.min(d, 4); ty = -s * 5.2; sc = 1 - s * 0.05; }
    else { const s = Math.min(ad, 5); ty = s * 3.6; sc = 1 - s * 0.052; }
    const c = cards[i];
    c.style.transform = `translateY(${ty}%) scale(${sc.toFixed(3)})`;
    c.style.opacity = "1";
    c.style.zIndex = 100 - Math.round(ad * 2);
  }
  const fi = Math.max(0, Math.min(N - 1, Math.round(front)));
  if (fi !== lastFront) {
    lastFront = fi;
    cards.forEach((c, i) => c.classList.toggle("is-front", i === fi));
    dots.forEach((d, i) => d.classList.toggle("on", i === fi));
    nowEl.textContent = pad2(fi + 1);
  }
}
function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(layout); } }

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
function cueOrEnd(nextSeqPos) {
  if (nextSeqPos < N) {
    const nextP = PROJECTS[sequence[nextSeqPos]];
    const seen = nextSeqPos, pct = Math.round((seen / N) * 100);  // how far through the tour
    const cue = elt("div", "nextcue");
    cue.innerHTML =
      '<div class="nextcue-in">' +
        '<span class="lbl">Keep scrolling · next project</span>' +
        `<span class="nm">${esc(nextP.name)}</span>` +
        '<span class="chev"></span>' +
        `<div class="prog"><span class="prog-lbl">${pad2(seen)} / ${pad2(N)}</span><div class="prog-bar"><i style="width:${pct}%"></i></div></div>` +
      "</div>";
    cue.dataset.seq = nextSeqPos;
    return cue;
  }
  const end = elt("div", "detail-end");
  end.innerHTML = '<div class="nextcue-in"><span class="lbl">That’s the work · ' + pad2(N) + " / " + pad2(N) +
    '</span><button type="button" id="toWork">← Back to all work</button></div>';
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
  requestAnimationFrame(layout);
}
$("#wkBack").addEventListener("click", () => showWork());

/* ============ init ============ */
window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", () => { sizeTrack(); onScroll(); });
sizeTrack();

const h = (location.hash || "").replace("#", "");
if (h && byId[h]) openProject(byId[h].index); else layout();
