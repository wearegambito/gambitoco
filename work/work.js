/* /work — scroll-driven stacked deck + progressively-loaded case-study detail.
   Front-end only, placeholder content. No backend. */
"use strict";

// ---------- placeholder data (sample projects, not real clients) ----------
const M = (type, span, cap, ar) => ({ type, span: span || 1, cap: cap || "", ar });
const PROJECTS = [
  { id: "marlowe", name: "Marlowe", url: "marlowe.studio", accent: "#3fae7a",
    tagline: "Where small-business data grows up.", cats: ["Brand Identity", "Web Design"],
    client: "Marlowe", year: "2026", services: ["Brand", "Website", "Design System"], scope: "Identity + marketing site",
    lede: "A full rebrand and website for a data platform that wanted to feel human, not corporate.",
    media: [M("image", 2, "Homepage hero"), M("gif", 1, "Logo build"), M("image", 1, "Colour system"),
            M("video", 2, "Product walkthrough"), M("image", 1, "Type specimen"), M("image", 1, "Business cards")] },
  { id: "northwind", name: "Northwind", url: "northwind.app", accent: "#fa4d56",
    tagline: "Turning a waitlist into a wave.", cats: ["SaaS", "Web Design"],
    client: "Northwind", year: "2026", services: ["Website", "CMS", "Motion"], scope: "Launch site",
    lede: "A launch site that turned a quiet waitlist into booked demos in week one.",
    media: [M("video", 2, "Launch film"), M("image", 1, "Pricing page"), M("image", 1, "Feature grid"),
            M("gif", 2, "Scroll interactions"), M("image", 1, "Dashboard UI"), M("image", 1, "Mobile views")] },
  { id: "souqlane", name: "Souq Lane", url: "souqlane.com", accent: "#e8b24c",
    tagline: "A marketplace with a pulse.", cats: ["Marketplace", "Brand"],
    client: "Souq Lane", year: "2026", services: ["Brand", "Product", "Web"], scope: "Brand + MVP",
    lede: "Brand and product for a two-sided marketplace, from first flows to launch.",
    media: [M("image", 2, "Marketplace home"), M("image", 1, "Seller onboarding"), M("gif", 1, "Listing flow"),
            M("image", 1, "Mobile app"), M("video", 2, "Seller story")] },
  { id: "meridian", name: "Meridian", url: "meridian.health", accent: "#35b7c6",
    tagline: "Care that starts before the waiting room.", cats: ["Healthcare", "Web Design"],
    client: "Meridian Health", year: "2025", services: ["Website", "Booking", "Brand"], scope: "Booking-first site",
    lede: "A calm, booking-first site that made online the clinic's main front door.",
    media: [M("image", 2, "Booking hero"), M("image", 1, "Appointment flow"), M("image", 1, "Services"),
            M("gif", 2, "Booking animation"), M("image", 1, "Clinician profiles"), M("image", 1, "Help centre")] },
  { id: "fieldfold", name: "Field & Fold", url: "fieldandfold.co", accent: "#9bad57",
    tagline: "Objects worth keeping, sold well.", cats: ["E-commerce", "Brand"],
    client: "Field & Fold", year: "2025", services: ["Brand", "Storefront", "Art direction"], scope: "Brand + store",
    lede: "An unhurried commerce brand and storefront for a small-batch goods maker.",
    media: [M("image", 2, "Storefront"), M("image", 1, "Product page"), M("image", 1, "Packaging"),
            M("video", 2, "Campaign film"), M("image", 1, "Lookbook")] },
  { id: "ledgerline", name: "Ledgerline", url: "ledgerline.io", accent: "#6a78f0",
    tagline: "Numbers that finally make sense.", cats: ["Fintech", "Product"],
    client: "Ledgerline", year: "2024", services: ["Product", "Design System", "Web"], scope: "Product + site",
    lede: "A product and site for a finance tool that makes cashflow legible at a glance.",
    media: [M("video", 2, "Product tour"), M("image", 1, "Reports"), M("image", 1, "Charts"),
            M("gif", 1, "Number ticker"), M("image", 1, "Settings"), M("image", 2, "Marketing site")] }
];
const N = PROJECTS.length;
const byId = {}; PROJECTS.forEach((p, i) => { p.index = i; byId[p.id] = p; });

const $ = (s, r) => (r || document).querySelector(s);
const elt = (t, c) => { const e = document.createElement(t); if (c) e.className = c; return e; };
const pad2 = (n) => String(n).padStart(2, "0");
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// tint a hex toward white (amt>0) / black (amt<0) — for placeholder media gradients
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16); let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const t = amt < 0 ? 0 : 255, a = Math.abs(amt);
  r = Math.round(r + (t - r) * a); g = Math.round(g + (t - g) * a); b = Math.round(b + (t - b) * a);
  return `rgb(${r},${g},${b})`;
}

/* ============ WORK INDEX: the deck ============ */
const cardsWrap = $("#cards"), cards = [];
PROJECTS.forEach((p) => {
  const c = elt("div", "card"); c.style.setProperty("--accent", p.accent);
  c.innerHTML =
    '<div class="band"></div>' +
    '<div class="face">' +
      '<div class="cats">' + p.cats.map((x) => `<span class="cat">${x}</span>`).join("") + "</div>" +
      '<button class="cta" type="button">See project →</button>' +
      `<div class="tagline">${p.tagline}</div>` +
      `<div class="foot"><span class="pname"><span class="pmark"></span>${p.name}</span><span class="purl">${p.url}</span></div>` +
    "</div>";
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
  c.innerHTML = `<div style="height:8px;background:${p.accent}"></div>` +
    `<div style="padding:1.6rem"><div style="font-family:var(--mono);font-size:.64rem;text-transform:uppercase;letter-spacing:.06em;opacity:.7">${p.cats.join(" · ")}</div>` +
    `<div style="font-family:var(--font-display);font-weight:700;font-size:1.5rem;line-height:1.1;margin:.6rem 0 1rem">${p.tagline}</div>` +
    `<div style="font-family:var(--mono);font-size:.78rem">${p.name} — see project →</div></div>`;
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
    const d = i - front; let ty, sc, op, z, rot = 0;
    if (d <= 0) { ty = d * 118; sc = 1 + d * 0.03; op = Math.max(0, 1 + d * 1.7); rot = d * 1.5; z = 100 + Math.round(d * 10); }
    else { const s = Math.min(d, 4); ty = -s * 5.5; sc = 1 - s * 0.05; op = d > 4.2 ? 0 : 1; z = 90 - Math.round(d); }
    const c = cards[i];
    c.style.transform = `translateY(${ty}%) scale(${sc.toFixed(3)}) rotate(${rot.toFixed(2)}deg)`;
    c.style.opacity = op.toFixed(3); c.style.zIndex = z;
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

// group media into rows so a 2-up row shares one aspect ratio (equal heights, no distortion)
function buildRows(media) {
  const rows = []; let i = 0;
  while (i < media.length) {
    const m = media[i];
    if (m.span === 2) { rows.push({ cls: "one", ar: m.ar || "16 / 8", items: [m] }); i++; }
    else {
      const next = media[i + 1];
      if (next && next.span !== 2) { rows.push({ cls: "two", ar: m.ar || "4 / 5", items: [m, next] }); i += 2; }
      else { rows.push({ cls: "one", ar: m.ar || "16 / 9", items: [m] }); i++; }
    }
  }
  return rows;
}
function mediaBox(m, p, ar) {
  const grad = `linear-gradient(145deg,${shade(p.accent, .22)},${shade(p.accent, -.4)})`;
  let extra = "", tag = "▦ Image";
  if (m.type === "video") { extra = '<div class="play"></div>'; tag = "▶ Video"; }
  else if (m.type === "gif") { extra = '<div class="gifshine"></div>'; tag = "● GIF"; }
  // NOTE: real media drops in here as <img loading="lazy"> / <video preload="none" poster>
  // inside .box with class .media-el (object-fit:cover keeps it undistorted at the row height).
  return `<figure class="box" style="aspect-ratio:${ar};background:${grad}">` +
    '<div class="ph"></div>' + extra +
    `<span class="tag">${tag}</span>` + (m.cap ? `<figcaption class="cap">${m.cap}</figcaption>` : "") + "</figure>";
}
function projectSection(p) {
  const sec = elt("section", "proj"); sec.id = "proj-" + p.id; sec.dataset.index = p.index;
  const rowsHtml = buildRows(p.media).map((row) =>
    `<div class="mrow ${row.cls}">${row.items.map((m) => mediaBox(m, p, row.ar)).join("")}</div>`
  ).join("");
  sec.innerHTML =
    '<div class="proj-grid">' +
      '<aside class="pinfo">' +
        `<div class="pnum">${pad2(p.index + 1)} / ${pad2(N)}</div>` +
        `<h2>${p.name}</h2>` +
        `<p class="lede">${p.lede}</p>` +
        '<dl class="meta">' +
          `<dt>Client</dt><dd>${p.client}</dd>` +
          `<dt>Year</dt><dd>${p.year}</dd>` +
          `<dt>Scope</dt><dd>${p.scope}</dd>` +
          `<dt>Services</dt><dd><div class="chips">${p.services.map((s) => `<span class="chip">${s}</span>`).join("")}</div></dd>` +
        "</dl>" +
        `<a class="visit" href="https://${p.url}" target="_blank" rel="noopener">Visit live site ↗</a>` +
      "</aside>" +
      `<div class="media">${rowsHtml}</div>` +
    "</div>";
  return sec;
}
function cueOrEnd(nextSeqPos) {
  if (nextSeqPos < N) {
    const nextP = PROJECTS[sequence[nextSeqPos]];
    const cue = elt("div", "nextcue");
    cue.innerHTML = `<div class="nextcue-in"><span class="lbl">Keep scrolling</span><span class="nm">${nextP.name}</span><span class="chev"></span></div>`;
    cue.dataset.seq = nextSeqPos;
    return cue;
  }
  const end = elt("div", "detail-end");
  end.innerHTML = '<button type="button" id="toWork">← Back to all work</button>';
  return end;
}
function appendNext() {
  if (seqPos >= N) return;
  const p = PROJECTS[sequence[seqPos]];
  projsWrap.appendChild(projectSection(p));
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
  try { history.replaceState(null, "", "#work"); } catch (e) {}
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
