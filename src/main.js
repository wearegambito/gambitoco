import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { loadCmsContent, applyCmsContent } from "./cms.js";

gsap.registerPlugin(ScrollTrigger);

// fetch CMS content and render it into the DOM *before* anything below
// measures section heights or splits text into animated spans — every
// scene-camera weight, word-scrub split, and heading reveal depends on
// the real, final text being in place first. Falls back to the static
// markup already in index.html if Supabase is slow or unreachable, so
// the page never blocks on the network.
try {
  const cms = await Promise.race([
    loadCmsContent(),
    new Promise((_, reject) => setTimeout(() => reject(new Error("cms timeout")), 2500)),
  ]);
  applyCmsContent(cms);
} catch (err) {
  console.warn("CMS content unavailable, using fallback markup:", err);
}

// browsers can auto-restore the previous scroll position on refresh,
// which throws off the hero's scroll-driven zoom (it would compute its
// scale from wherever that restored position is, not a fresh top-of-page
// state). Force every load to genuinely start at the top instead.
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
window.scrollTo(0, 0);
// some browsers apply their own scroll restoration after this point
// (on load, or on a bfcache restore) — catch that too
window.addEventListener("pageshow", () => window.scrollTo(0, 0));

const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- smooth scroll ---------- */
let lenis = null;
if (!prefersReduced) {
  lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* ---------- custom cursor ---------- */
const cursor = document.querySelector(".cursor");
if (cursor && window.matchMedia("(hover: hover)").matches) {
  const xTo = gsap.quickTo(cursor, "x", { duration: 0.35, ease: "power3.out" });
  const yTo = gsap.quickTo(cursor, "y", { duration: 0.35, ease: "power3.out" });
  window.addEventListener("mousemove", (e) => { xTo(e.clientX); yTo(e.clientY); });
  document.querySelectorAll("[data-hover]").forEach((el) => {
    el.addEventListener("mouseenter", () => cursor.classList.add("is-hover"));
    el.addEventListener("mouseleave", () => cursor.classList.remove("is-hover"));
  });
}

/* ---------- nav: glass on scroll, hide on scroll down ---------- */
const nav = document.getElementById("nav");
let lastY = 0;
ScrollTrigger.create({
  start: 80,
  onUpdate: (self) => {
    const y = self.scroll();
    nav.classList.toggle("is-scrolled", y > 80);
    if (y > 500 && y > lastY + 4) nav.classList.add("is-hidden");
    else if (y < lastY - 4) nav.classList.remove("is-hidden");
    lastY = y;
  },
});

/* ---------- hero intro timeline ---------- */
const intro = gsap.timeline({ defaults: { ease: "power4.out" } });
intro
  .from(".hero-title .line-inner", { yPercent: 110, duration: 1.4, stagger: 0.12, delay: 0.15 })
  .from(".hero-eyebrow", { opacity: 0, y: 14, duration: 0.9 }, "-=1.0")
  .from(".hero-sub", { opacity: 0, y: 20, duration: 1 }, "-=0.9")
  .from(".hero-ctas .btn", { opacity: 0, y: 20, duration: 0.9, stagger: 0.08 }, "-=0.8")
  .from(".hero-foot", { opacity: 0, duration: 1.2 }, "-=0.6")
  .from(".nav", { y: -24, opacity: 0, duration: 0.9 }, "-=1.1");

/* subtle hero exit: content drifts up and dims as you leave */
gsap.to(".hero-inner", {
  yPercent: -12,
  opacity: 0.25,
  ease: "none",
  scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
});

/* ---------- page-wide background video, scrubbed by scroll ---------- */
const pageVideo = document.getElementById("page-video");
if (pageVideo) {
  pageVideo.pause();
  let dur = 0;
  const readMeta = () => { dur = pageVideo.duration || 8; };
  if (pageVideo.readyState >= 1) readMeta();
  pageVideo.addEventListener("loadedmetadata", readMeta);
  // prime the decoder so seeked frames actually paint
  const prime = pageVideo.play();
  if (prime) prime.then(() => pageVideo.pause()).catch(() => {});

  if (prefersReduced) {
    pageVideo.currentTime = 0;
  } else {
    // drive currentTime straight off Lenis's own (already-eased) scroll
    // progress — no second smoothing layer, so it can't fall behind and
    // "catch up" with a jump when heavy sections (pinned/sticky cards)
    // eat frames. The video is encoded with a keyframe every 4 frames
    // so any seek decodes instantly and lands on the correct frame.
    const setFromProgress = (p) => {
      if (!dur) return;
      const t = Math.max(0, Math.min(1, p)) * (dur - 0.03);
      if (Math.abs(pageVideo.currentTime - t) > 0.01) pageVideo.currentTime = t;
    };
    if (lenis) {
      lenis.on("scroll", (e) => setFromProgress(e.progress));
    } else {
      const max = () => document.documentElement.scrollHeight - window.innerHeight;
      window.addEventListener("scroll", () => setFromProgress(window.scrollY / max()), { passive: true });
    }
    // opens on an extreme close-up, pulls back through the hero, then stays put
    gsap.set(pageVideo, { xPercent: 0, yPercent: 0, scale: 3.6 });
    gsap.to(pageVideo, {
      scale: 1.16,
      ease: "power1.out",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 0.6 },
    });
  }
}

/* ---------- story: pinned word-by-word scrub ---------- */
const storyText = document.getElementById("story-text");
if (storyText) {
  // split into word spans, preserving <em> emphasis
  const splitWords = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(" "));
          else if (part) {
            const s = document.createElement("span");
            s.className = "w";
            s.textContent = part;
            frag.appendChild(s);
          }
        });
        node.replaceChild(frag, child);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        splitWords(child);
      }
    });
  };
  splitWords(storyText);

  gsap.to(storyText.querySelectorAll(".w"), {
    opacity: 1,
    stagger: 0.06,
    ease: "none",
    scrollTrigger: {
      trigger: ".story",
      start: "top top",
      end: "+=160%",
      pin: ".story-pin",
      scrub: 0.4,
    },
  });
}

/* ---------- generic line reveals for section headings ---------- */
document.querySelectorAll(".reveal-lines").forEach((el) => {
  // wrap each line-ish chunk: simple approach, wrap whole heading content per <br> block
  const html = el.innerHTML.split(/<br\s*\/?>/i);
  el.innerHTML = html
    .map((chunk) => `<span class="rline"><span class="rline-inner">${chunk}</span></span>`)
    .join("");
  gsap.from(el.querySelectorAll(".rline-inner"), {
    yPercent: 110,
    duration: 1.2,
    stagger: 0.1,
    ease: "power4.out",
    scrollTrigger: { trigger: el, start: "top 85%" },
  });
});

/* ---------- services: stacking cards scale/dim as next arrives ---------- */
const cards = gsap.utils.toArray(".s-card");
cards.forEach((card, i) => {
  if (i === cards.length - 1) return;
  gsap.to(card, {
    scale: 0.94,
    opacity: 0.5,
    filter: "blur(3px)",
    transformOrigin: "center top",
    ease: "none",
    scrollTrigger: {
      trigger: cards[i + 1],
      start: "top 80%",
      end: "top 20%",
      scrub: true,
    },
  });
});

/* ---------- work cards: scale in, fade out on exit ---------- */
gsap.utils.toArray(".w-card").forEach((card) => {
  gsap.fromTo(card,
    { scale: 0.92, opacity: 0.3 },
    {
      scale: 1, opacity: 1, ease: "none",
      scrollTrigger: { trigger: card, start: "top 95%", end: "top 55%", scrub: true },
    }
  );
  // inner image parallax
  const img = card.querySelector("img");
  gsap.fromTo(img,
    { yPercent: -6 },
    {
      yPercent: 6, ease: "none",
      scrollTrigger: { trigger: card, start: "top bottom", end: "bottom top", scrub: true },
    }
  );
});

/* ---------- misc fade-ups ---------- */
gsap.utils.toArray(".work-lede, .services-lede, .work-head .work-lede").forEach((el) => {
  gsap.from(el, {
    opacity: 0, y: 30, duration: 1.1, ease: "power3.out",
    scrollTrigger: { trigger: el, start: "top 88%" },
  });
});

/* ---------- CTA title reveal ---------- */
gsap.from(".cta-title .line-inner", {
  yPercent: 110,
  duration: 1.3,
  stagger: 0.12,
  ease: "power4.out",
  scrollTrigger: { trigger: ".cta", start: "top 70%" },
});
gsap.from(".cta-sub, .cta .btn", {
  opacity: 0, y: 24, duration: 1, stagger: 0.1, ease: "power3.out",
  scrollTrigger: { trigger: ".cta", start: "top 60%" },
});

/* ---------- magnetic button ---------- */
document.querySelectorAll("[data-magnetic]").forEach((el) => {
  if (!window.matchMedia("(hover: hover)").matches) return;
  const xTo = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3.out" });
  const yTo = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3.out" });
  el.addEventListener("mousemove", (e) => {
    const r = el.getBoundingClientRect();
    xTo((e.clientX - r.left - r.width / 2) * 0.3);
    yTo((e.clientY - r.top - r.height / 2) * 0.35);
  });
  el.addEventListener("mouseleave", () => { xTo(0); yTo(0); });
});


/* ---------- anchor links via lenis-friendly scroll ---------- */
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const id = a.getAttribute("href");
    if (id.length < 2) return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.4 });
    else target.scrollIntoView();
  });
});

/* ---------- scene-by-scene camera: pan the background video through
   each section after the hero. One timeline so the handoff between
   scenes is continuous instead of separate tweens fighting each other.
   Placed at the end of the file so section heights (incl. the story
   pin's spacer, already inserted above) measure correctly. ---------- */
if (pageVideo && !prefersReduced) {
  const heroEl = document.querySelector(".hero");
  const ctaEl = document.querySelector(".cta");
  const scenes = [
    { el: document.querySelector(".story"), x: 26, y: -10, scale: 1.32 },
    { el: document.querySelector(".services"), x: 30, y: 7, scale: 1.26 },
  ].filter((s) => s.el);

  if (heroEl) {
    const ctaRight = { xPercent: 16, yPercent: -4, scale: 0.7 };
    const resting = { xPercent: 16, yPercent: -4, scale: 0.6 };
    // the real scrollable distance across cta can be shorter than its own
    // offsetHeight (a short footer means the page can't scroll all the
    // way to cta's true bottom) — measured once for proportional weights
    const ctaSpanPx = ctaEl
      ? Math.max(200, Math.min(ctaEl.offsetTop + ctaEl.offsetHeight, document.documentElement.scrollHeight - window.innerHeight) - ctaEl.offsetTop)
      : 0;

    // a single timeline drives the video for the whole post-hero scroll —
    // story, services, then the cta composition, then the footer rest.
    // One timeline only: several independent scrub tweens on the same
    // properties will each hold their own value outside their own range
    // and silently overwrite each other (this bit us once already).
    const videoCamera = gsap.timeline({
      scrollTrigger: {
        trigger: document.documentElement,
        start: () => heroEl.offsetHeight,
        end: () => (ctaEl
          ? Math.min(ctaEl.offsetTop + ctaEl.offsetHeight, document.documentElement.scrollHeight - window.innerHeight)
          : document.documentElement.scrollHeight),
        scrub: 0.6,
      },
    });
    scenes.forEach((scene) => {
      videoCamera.to(pageVideo, {
        xPercent: scene.x, yPercent: scene.y, scale: scene.scale,
        ease: "none", duration: Math.max(scene.el.offsetHeight, 1),
      });
    });
    if (ctaEl) {
      // cta is a fixed composition: video settles to the right, text sits
      // left (see .cta-inner). Snaps in quickly, holds through the middle
      // of the section, then eases out to a wider frame and stays locked
      // into the footer.
      videoCamera
        .to(pageVideo, { ...ctaRight, ease: "none", duration: ctaSpanPx * 0.18 })
        .to(pageVideo, { ...ctaRight, ease: "none", duration: ctaSpanPx * 0.42 })
        .to(pageVideo, { ...resting, ease: "none", duration: ctaSpanPx * 0.4 });
    }
  }

  // story: flip its centred content to counter the camera's pan,
  // desktop only — on narrow screens it stays centred
  if (window.matchMedia("(min-width: 900px)").matches) {
    const storyPin = document.querySelector(".story-pin");
    const storyTextEl = document.getElementById("story-text");
    if (storyPin && storyTextEl) {
      ScrollTrigger.create({
        trigger: ".story", start: "top center", end: "bottom center",
        toggleClass: { targets: [storyPin, storyTextEl], className: "is-shifted" },
      });
    }
  }

  ScrollTrigger.refresh();
}
