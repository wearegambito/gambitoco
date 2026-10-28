/**
 * Build-time static site generation for Gambito's SEO content pages.
 *
 * Runs after `vite build`. Pulls published content from Supabase and writes
 * fully-rendered static HTML (with meta tags, Open Graph, Twitter cards and
 * JSON-LD structured data) into dist/, plus sitemap.xml and robots.txt.
 *
 * Static HTML — rather than the homepage's client-side fetch — is deliberate:
 * crawlers and social scrapers see real content and meta without executing JS.
 * Trade-off: new/edited CMS content needs a redeploy to appear on these pages
 * (wire a Netlify build hook to the admin "publish" action to automate that).
 */
import { createClient } from "@supabase/supabase-js";
import { marked } from "marked";
import { parse } from "node-html-parser";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, "..", "dist");

const SUPABASE_URL = "https://wtzklaumnzezgzgzllgn.supabase.co";
const SUPABASE_KEY = "sb_publishable_pecBj0lN9DEWnwMAxwiazw_5ik8Xj3-";
const FALLBACK_SITE_URL = "https://gambito.co";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
marked.setOptions({ mangle: false, headerIds: false });

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const abs = (base, path) => (/^https?:\/\//.test(path) ? path : base.replace(/\/$/, "") + (path.startsWith("/") ? path : "/" + path));

// treat empty / whitespace-only values as "not set", so an unfilled (or
// accidentally blank) field cleanly falls through to the next fallback
const nonBlank = (v) => { const s = (v == null ? "" : String(v)).trim(); return s || null; };
// resolve a share image: first non-blank of the candidates, else the favicon
const ogPick = (site, ...candidates) => abs(site, candidates.map(nonBlank).find(Boolean) || "/favicon.png");

async function write(relPath, html) {
  const full = join(DIST, relPath);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, html, "utf8");
  console.log("  prerendered", relPath);
}

/* ---------- shared chrome ---------- */
function head({ title, description, canonical, ogImage, ogType = "website", jsonLd = [], published, modified }) {
  const ld = jsonLd.filter(Boolean).map((o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join("\n  ");
  return `<meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <link rel="canonical" href="${esc(canonical)}" />
  <meta property="og:type" content="${ogType}" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:url" content="${esc(canonical)}" />
  <meta property="og:site_name" content="Gambito" />
  ${ogImage ? `<meta property="og:image" content="${esc(ogImage)}" />` : ""}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  ${ogImage ? `<meta name="twitter:image" content="${esc(ogImage)}" />` : ""}
  ${published ? `<meta property="article:published_time" content="${esc(published)}" />` : ""}
  ${modified ? `<meta property="article:modified_time" content="${esc(modified)}" />` : ""}
  <link rel="icon" type="image/png" href="/favicon.png" />
  <link rel="preconnect" href="https://api.fontshare.com" crossorigin />
  <link href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@500,700,800&f[]=satoshi@400,500,700&f[]=gambetta@2,500&display=swap" rel="stylesheet" />
  <script src="/analytics.js" defer></script>
  <link rel="stylesheet" href="/content.css" />
  ${ld}`;
}

const nav = (sc = {}) => {
  const s = esc(sc.nav_services || "Services");
  const w = esc(sc.nav_work || "Work");
  const d = esc(sc.nav_design || "Design");
  const i = esc(sc.nav_insights || "Insights");
  const f = esc(sc.nav_faq || "FAQ");
  const cta = esc(sc.nav_cta || "Start the conversation");
  return `<header class="nav">
    <a class="nav-brand" href="/" aria-label="Gambito"><img src="/logo-full.svg" alt="Gambito" class="nav-brand-logo" /></a>
    <nav class="nav-links" aria-label="Primary">
      <a href="/#services">${s}</a>
      <a href="/#work">${w}</a>
      <a href="/design/">${d}</a>
      <a href="/insights/">${i}</a>
      <a href="/faq/">${f}</a>
    </nav>
    <a class="nav-cta" href="/book/">${cta}</a>
    <button class="nav-toggle" id="nav-toggle" aria-label="Open menu" aria-expanded="false"><span></span><span></span></button>
  </header>
  <div class="mobile-menu" id="mobile-menu" aria-hidden="true">
    <nav class="mobile-menu-links" aria-label="Mobile">
      <a href="/#services">${s}</a>
      <a href="/#work">${w}</a>
      <a href="/design/">${d}</a>
      <a href="/insights/">${i}</a>
      <a href="/faq/">${f}</a>
      <a href="/book/" class="mobile-menu-cta">Book a Gameplan Session</a>
    </nav>
  </div>`;
};

function ctaBlock(sc) {
  return `<section class="cta-block">
    <div class="wrap">
      <h2>Make the <em>first move.</em></h2>
      <p>${esc(sc.cta_sub || "A Gameplan Session is one hour, zero jargon, and no obligation.")}</p>
      <a class="btn-solid" href="${esc(sc.cta_button_link || "mailto:hello@gambito.co")}">${esc(sc.cta_button || "Book a Gameplan Session")}</a>
    </div>
  </section>`;
}

function footer(sc) {
  return `<footer class="footer">
    <div class="footer-cols">
      <div class="footer-col"><span class="f-label">Explore</span><p><a href="/#services">Services</a><br /><a href="/insights/">Insights</a><br /><a href="/faq/">FAQ</a><br /><a href="/book/">Book a session</a></p></div>
      <div class="footer-col"><span class="f-label">Studio</span><p>${sc.footer_address || ""}</p></div>
      <div class="footer-col"><span class="f-label">Talk to us</span><p><a href="mailto:${esc(sc.footer_email || "hello@gambito.co")}">${esc(sc.footer_email || "hello@gambito.co")}</a><br /><a href="tel:${esc((sc.footer_phone || "").replace(/[^\d+]/g, ""))}">${esc(sc.footer_phone || "")}</a></p></div>
      <div class="footer-col"><span class="f-label">Elsewhere</span><p><a href="${esc(sc.footer_linkedin_url || "#")}">LinkedIn</a><br /><a href="${esc(sc.footer_instagram_url || "#")}">Instagram</a></p></div>
    </div>
    <div class="footer-base"><span>${esc(sc.footer_copyright || "© 2026 Gambito Ltd.")}</span><span>${esc(sc.footer_tagline || "")}</span></div>
  </footer>`;
}

function layout({ headHtml, main, sc }) {
  return `<!doctype html>
<html lang="en">
<head>
  ${headHtml}
</head>
<body>
  ${nav(sc)}
  ${main}
  <script src="/nav.js" defer></script>
</body>
</html>`;
}

const orgLd = (site) => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Gambito",
  url: site,
  logo: abs(site, "/logo-full.svg"),
  sameAs: [],
});

const breadcrumbLd = (site, items) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: abs(site, it.path) })),
});

/* ---------- page renderers ---------- */
function servicePage(svc, offerings, sc, site) {
  const url = abs(site, `/services/${svc.slug}/`);
  const title = svc.seo_title || `${svc.title} | Gambito`;
  const desc = svc.seo_description || svc.description;
  const ogImage = ogPick(site, svc.og_image, svc.hero_image, sc.og_image);
  const bodyHtml = marked.parse(svc.body || "");
  const serviceLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: svc.title,
    description: desc,
    provider: { "@type": "Organization", name: "Gambito", url: site },
    areaServed: "Worldwide",
    url,
  };
  const crumbs = breadcrumbLd(site, [{ name: "Home", path: "/" }, { name: svc.title, path: `/services/${svc.slug}/` }]);
  const offeringsHtml = offerings.length
    ? `<div class="offer-list">
        <h2 class="offer-list-title">Ways to start</h2>
        <div class="offer-cards">
          ${offerings.map((o) => `<a class="offer-card" href="/services/${esc(svc.slug)}/${esc(o.slug)}/">
            <span class="offer-card-eyebrow">${esc(o.eyebrow || "Programme")}</span>
            <h3>${esc(o.title)}</h3>
            <p>${esc(o.tagline)}</p>
            <span class="offer-card-go">Explore →</span>
          </a>`).join("")}
        </div>
      </div>`
    : "";
  const main = `<nav class="crumb" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span>${esc(svc.title)}</nav>
  <article class="wrap">
    <div class="page-head">
      <p class="page-eyebrow">Services</p>
      <h1 class="page-title">${esc(svc.title)}</h1>
      ${svc.tag ? `<p class="page-meta"><b>${esc(svc.tag)}</b></p>` : ""}
    </div>
    ${svc.hero_image ? `<div class="cover"><img src="${esc(svc.hero_image)}" alt="${esc(svc.title)}" /></div>` : ""}
    <div class="prose">${bodyHtml}</div>
    ${offeringsHtml}
  </article>
  ${ctaBlock(sc)}
  ${footer(sc)}`;
  return layout({ headHtml: head({ title, description: desc, canonical: url, ogImage, jsonLd: [serviceLd, crumbs] }), main, sc });
}

function offeringPage(off, serviceTitle, sc, site) {
  const path = `/services/${off.service_slug}/${off.slug}/`;
  const url = abs(site, path);
  const title = off.seo_title || `${off.title} | Gambito`;
  const desc = off.seo_description || off.tagline;
  const ogImage = ogPick(site, off.og_image, off.hero_image, sc.og_image);
  const arr = (v) => (Array.isArray(v) ? v : []);

  const formats = arr(off.formats).map((f) => `<div class="fmt-card">
      <h3>${esc(f.name)}</h3>
      ${f.meta ? `<span class="fmt-meta">${esc(f.meta)}</span>` : ""}
      <p>${esc(f.detail)}</p>
    </div>`).join("");
  const highlights = arr(off.highlights).map((h) => `<div class="stat"><span class="stat-value">${esc(h.value)}</span><span class="stat-label">${esc(h.label)}</span></div>`).join("");
  const process = arr(off.process).map((p) => `<div class="phase">
      <div class="phase-head"><span class="phase-tag">${esc(p.phase)}</span><h3>${esc(p.title)}</h3></div>
      <ul>${arr(p.items).map((i) => `<li>${esc(i)}</li>`).join("")}</ul>
    </div>`).join("");
  const deliverables = arr(off.deliverables).map((d) => `<li>${esc(d)}</li>`).join("");
  const goodFor = arr(off.good_for).map((d) => `<li>${esc(d)}</li>`).join("");
  const notFor = arr(off.not_for).map((d) => `<li>${esc(d)}</li>`).join("");

  const offeringLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: off.title,
    serviceType: serviceTitle,
    description: desc,
    provider: { "@type": "Organization", name: "Gambito", url: site },
    areaServed: "Worldwide",
    url,
  };
  const crumbs = breadcrumbLd(site, [
    { name: "Home", path: "/" },
    { name: serviceTitle, path: `/services/${off.service_slug}/` },
    { name: off.title, path },
  ]);

  const main = `<nav class="crumb crumb-wide" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><a href="/services/${esc(off.service_slug)}/">${esc(serviceTitle)}</a><span>/</span>${esc(off.title)}</nav>
  <div class="wrap-wide offering">
    <header class="offer-hero">
      ${off.eyebrow ? `<p class="page-eyebrow">${esc(off.eyebrow)}</p>` : ""}
      <h1 class="page-title">${esc(off.title)}</h1>
      <p class="offer-tagline">${esc(off.tagline)}</p>
      ${off.intro ? `<p class="offer-intro">${esc(off.intro)}</p>` : ""}
      <a class="btn-solid" href="${esc(off.cta_link || "/book/")}">${esc(off.cta_label || "Book a Gameplan Session")}</a>
    </header>

    ${highlights ? `<div class="stats-row">${highlights}</div>` : ""}
    ${formats ? `<section class="offer-section"><h2 class="offer-h2">Two ways to run it</h2><div class="fmt-cards">${formats}</div></section>` : ""}
    ${process ? `<section class="offer-section"><h2 class="offer-h2">How the sprint runs</h2><div class="phases">${process}</div></section>` : ""}
    ${deliverables ? `<section class="offer-section"><h2 class="offer-h2">What's included</h2><ul class="tick-list">${deliverables}</ul></section>` : ""}
    ${(goodFor || notFor) ? `<section class="offer-section"><div class="fit-grid">
      ${goodFor ? `<div class="fit-col fit-good"><h3>Works well for</h3><ul>${goodFor}</ul></div>` : ""}
      ${notFor ? `<div class="fit-col fit-bad"><h3>Not the right fit for</h3><ul>${notFor}</ul></div>` : ""}
    </div></section>` : ""}
    ${off.body ? `<section class="offer-section wrap prose">${marked.parse(off.body)}</section>` : ""}
  </div>
  ${ctaBlock(sc)}
  ${footer(sc)}`;
  return layout({ headHtml: head({ title, description: desc, canonical: url, ogImage, jsonLd: [offeringLd, crumbs] }), main, sc });
}

function insightsIndex(posts, sc, site) {
  const url = abs(site, "/insights/");
  const title = sc.insights_seo_title || "Insights — Field notes for founders | Gambito";
  const desc = sc.insights_seo_description || "Ideas, essays and field notes on moving from hesitation to action — building, validating and growing ventures. From the Gambito studio.";
  const cards = posts
    .map(
      (p) => `<a class="post-card" href="/insights/${esc(p.slug)}/">
        <div class="post-card-media">${p.cover_image ? `<img src="${esc(p.cover_image)}" alt="${esc(p.title)}" loading="lazy" />` : ""}</div>
        <div class="post-card-body">
          ${p.category ? `<span class="post-card-cat">${esc(p.category)}</span>` : ""}
          <h3>${esc(p.title)}</h3>
          <p>${esc(p.excerpt)}</p>
          <time datetime="${esc(p.published_at)}">${fmtDate(p.published_at)}</time>
        </div>
      </a>`
    )
    .join("\n      ");
  const crumbs = breadcrumbLd(site, [{ name: "Home", path: "/" }, { name: "Insights", path: "/insights/" }]);
  const main = `<nav class="crumb crumb-wide" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span>Insights</nav>
  <div class="wrap-wide">
    <div class="page-head">
      <p class="page-eyebrow">Insights</p>
      <h1 class="page-title">${esc(sc.insights_title || "Field notes for founders.")}</h1>
      <p class="page-lede">${esc(sc.insights_lede || "Essays and ideas on moving from hesitation to action — validating, building and growing ventures.")}</p>
    </div>
    <div class="card-grid">
      ${cards}
    </div>
  </div>
  ${ctaBlock(sc)}
  ${footer(sc)}`;
  return layout({ headHtml: head({ title, description: desc, canonical: url, ogImage: ogPick(site, sc.og_image), jsonLd: [orgLd(site), crumbs] }), main, sc });
}

function insightPage(post, sc, site) {
  const url = abs(site, `/insights/${post.slug}/`);
  const title = post.seo_title || `${post.title} | Gambito`;
  const desc = post.seo_description || post.excerpt;
  // a blog post's share image: its own og_image, else its cover image, else the site default
  const ogImage = ogPick(site, post.og_image, post.cover_image, sc.og_image);
  const bodyHtml = marked.parse(post.body || "");
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: desc,
    image: post.cover_image ? [abs(site, post.cover_image)] : undefined,
    datePublished: post.published_at,
    dateModified: post.updated_at || post.published_at,
    author: { "@type": "Organization", name: post.author || "Gambito" },
    publisher: { "@type": "Organization", name: "Gambito", logo: { "@type": "ImageObject", url: abs(site, "/logo-full.svg") } },
    mainEntityOfPage: url,
  };
  const crumbs = breadcrumbLd(site, [{ name: "Home", path: "/" }, { name: "Insights", path: "/insights/" }, { name: post.title, path: `/insights/${post.slug}/` }]);
  const main = `<nav class="crumb" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><a href="/insights/">Insights</a><span>/</span>${esc(post.title)}</nav>
  <article class="wrap">
    <div class="page-head">
      ${post.category ? `<p class="page-eyebrow">${esc(post.category)}</p>` : ""}
      <h1 class="page-title">${esc(post.title)}</h1>
      <p class="page-meta"><b>${esc(post.author || "Gambito")}</b> · <time datetime="${esc(post.published_at)}">${fmtDate(post.published_at)}</time></p>
    </div>
    ${post.cover_image ? `<div class="cover"><img src="${esc(post.cover_image)}" alt="${esc(post.title)}" /></div>` : ""}
    <div class="prose">${bodyHtml}</div>
  </article>
  ${ctaBlock(sc)}
  ${footer(sc)}`;
  return layout({ headHtml: head({ title, description: desc, canonical: url, ogImage, ogType: "article", published: post.published_at, modified: post.updated_at, jsonLd: [articleLd, crumbs] }), main, sc });
}

function faqPage(faqs, sc, site) {
  const url = abs(site, "/faq/");
  const title = sc.faq_seo_title || "Frequently Asked Questions | Gambito";
  const desc = sc.faq_seo_description || "Answers to common questions about working with Gambito — our venture studio, services, Gameplan Sessions and how we help founders move from hesitation to action.";
  // group by category, preserving order
  const groups = [];
  for (const f of faqs) {
    let g = groups.find((x) => x.cat === (f.category || ""));
    if (!g) { g = { cat: f.category || "", items: [] }; groups.push(g); }
    g.items.push(f);
  }
  const listHtml = groups
    .map(
      (g) => `${g.cat ? `<p class="faq-cat">${esc(g.cat)}</p>` : ""}
      <div class="faq-list">
        ${g.items.map((f) => `<div class="faq-item"><h3>${esc(f.question)}</h3><p>${esc(f.answer)}</p></div>`).join("\n        ")}
      </div>`
    )
    .join("\n      ");
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
  };
  const crumbs = breadcrumbLd(site, [{ name: "Home", path: "/" }, { name: "FAQ", path: "/faq/" }]);
  const main = `<nav class="crumb" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span>FAQ</nav>
  <div class="wrap">
    <div class="page-head">
      <p class="page-eyebrow">Answers</p>
      <h1 class="page-title">${esc(sc.faq_title || "Frequently asked questions.")}</h1>
      <p class="page-lede">${esc(sc.faq_lede || "Everything founders usually want to know before making the first move.")}</p>
    </div>
    ${listHtml}
  </div>
  ${ctaBlock(sc)}
  ${footer(sc)}`;
  return layout({ headHtml: head({ title, description: desc, canonical: url, ogImage: ogPick(site, sc.og_image), jsonLd: [faqLd, crumbs] }), main, sc });
}

function fmtDate(d) {
  try {
    return new Date(d).toLocaleDateString("en-NZ", { year: "numeric", month: "long", day: "numeric" });
  } catch { return d; }
}

function sitemapXml(site, urls) {
  const body = urls
    .map((u) => `  <url><loc>${abs(site, u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}<changefreq>${u.changefreq || "weekly"}</changefreq><priority>${u.priority ?? "0.7"}</priority></url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`;
}

const robotsTxt = (site) => `User-agent: *
Allow: /
Disallow: /admin
Disallow: /style-guide

Sitemap: ${abs(site, "/sitemap.xml")}`;

/* ---------- homepage bake ----------
   The homepage renders its live CMS content client-side (src/cms.js). If the
   static markup in index.html differs from the CMS, the first paint shows the
   stale fallback and then visibly swaps. Bake the current CMS content straight
   into dist/index.html at build time so the first paint already matches — the
   client fetch then confirms it with no visible change (and still updates
   instantly if the CMS was edited after this deploy). Mirrors applyCmsContent
   + the card renderers in src/cms.js. */
async function bakeHomepage(sc, services, caseStudies) {
  const file = join(DIST, "index.html");
  let html;
  try { html = await readFile(file, "utf8"); }
  catch { console.warn("[prerender] dist/index.html not found — skipping homepage bake."); return; }
  const root = parse(html, { comment: true });

  root.querySelectorAll("[data-cms]").forEach((el) => {
    const key = el.getAttribute("data-cms");
    if (!(key in sc)) return;
    const value = sc[key];
    const attrName = el.getAttribute("data-cms-attr");
    const hrefPrefix = el.getAttribute("data-cms-href");
    if (attrName) {
      el.setAttribute(attrName, value);
    } else if (hrefPrefix) {
      const clean = hrefPrefix === "tel:" ? value.replace(/[^\d+]/g, "") : value;
      el.setAttribute("href", hrefPrefix + clean);
      el.set_content(esc(value));
    } else {
      el.set_content(value); // value may contain <em>, <br> etc.
    }
  });

  if (sc.meta_title) root.querySelector("title")?.set_content(esc(sc.meta_title));
  if (sc.meta_description) root.querySelector('meta[name="description"]')?.setAttribute("content", sc.meta_description);
  if (sc.hero_video) root.querySelector("#page-video source")?.setAttribute("src", sc.hero_video);

  const stack = root.querySelector(".services-stack");
  if (stack && services.length) {
    stack.set_content(services.map((s) => `
        <a class="s-card" href="/services/${esc(s.slug)}/" data-hover>
          <div class="s-card-top"><span class="s-num">${esc(s.number)}</span><h3>${esc(s.title)}</h3></div>
          <p>${esc(s.description)}</p>
          <span class="s-tag">${esc(s.tag)}</span>
          <span class="s-go">Explore ${esc(s.title)} →</span>
        </a>`).join(""));
  }

  const grid = root.querySelector(".work-grid");
  if (grid && caseStudies.length) {
    grid.set_content(caseStudies.map((c) => {
      const href = c.link_url || "#contact";
      const external = /^https?:\/\//i.test(href);
      const linkAttrs = external ? ' target="_blank" rel="noopener noreferrer"' : "";
      const extBadge = external ? `<span class="w-ext" aria-hidden="true">↗</span>` : "";
      const extLabel = external ? " (opens in a new tab)" : "";
      return `
        <a class="w-card w-span${c.span === "7" ? "7" : "5"}" href="${esc(href)}"${linkAttrs} data-hover aria-label="${esc(c.title)}${extLabel}">
          <figure class="w-media"><img src="${esc(c.image_url)}" alt="${esc(c.title)}" loading="lazy" />${extBadge}</figure>
          <div class="w-meta"><h3>${esc(c.title)}</h3><span>${esc(c.category)}</span></div>
        </a>`;
    }).join(""));
  }

  await writeFile(file, root.toString(), "utf8");
  console.log("  baked homepage index.html with live CMS content");
}

/* ---------- design service page ---------- */
const DESIGN_DEFAULTS = {
  ad_headline: "Senior design. AI speed. A website that runs your business.",
  hero_subhead: "I'm Armic, founder of Gambito. 15 years designing for companies like Vodafone, Apple and Air New Zealand. Now I build complete website systems for founders, faster than an agency can.",
  capacity_count: 2,
  next_opening: "",
  starting_price: "",
  reply_time_text: "within an hour",
  booking_url: "/book/",
  budget_bands: ["Under $5k", "$5k–$10k", "$10k–$25k", "$25k+", "Not sure yet"],
};

const attrLabel = (cs) => {
  if (cs.attribution === "employed") return `Armic, while at ${cs.attribution_company || cs.client_name}`;
  if (cs.attribution === "agency") return `Armic for ${cs.client_name}, via ${cs.attribution_company || "agency"}`;
  return "Gambito";
};
const tagChips = (tags) => (Array.isArray(tags) ? tags : []).map((t) => `<span class="dz-tag">${esc(t)}</span>`).join("");

const ICONS = {
  design: '<svg class="dz-card-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>',
  cms: '<svg class="dz-card-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 4v16"/></svg>',
  auto: '<svg class="dz-card-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h11M4 7l3-3M4 7l3 3"/><path d="M20 17H9m11 0l-3-3m3 3l-3 3"/></svg>',
  dash: '<svg class="dz-card-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 17v-5M12 17V7M16 17v-8"/></svg>',
};

function designLogosRow(logos) {
  if (!logos.length) return "";
  return `<div class="dz-logos-row">${logos.map((l) =>
    (l.can_show_logo && l.logo_svg)
      ? (/^https?:\/\//.test(l.logo_svg) ? `<img class="dz-logo-img" src="${esc(l.logo_svg)}" alt="${esc(l.name)}" />` : l.logo_svg)
      : `<span class="dz-logo-name">${esc(l.name)}</span>`
  ).join("")}</div>`;
}

function designCaseCard(cs, site) {
  const media = cs.hero_image
    ? `<div class="dz-cs-media"><img src="${esc(cs.hero_image)}" alt="${esc(cs.title)}" loading="lazy" /></div>`
    : `<div class="dz-cs-media"><span class="dz-cs-media-ph">${esc(cs.client_name || cs.title)}</span></div>`;
  const inner = `${cs.can_show_work ? media : ""}
      <div class="dz-cs-body">
        <span class="dz-cs-client">${esc(cs.can_show_logo ? cs.client_name : cs.client_name)}</span>
        <h3 class="dz-cs-title">${esc(cs.title)}</h3>
        <p class="dz-cs-summary">${esc(cs.summary)}</p>
        ${tagChips(cs.system_tags) ? `<div class="dz-tags">${tagChips(cs.system_tags)}</div>` : ""}
        ${cs.timeline ? `<p class="dz-cs-foot">${esc(cs.timeline)}</p>` : ""}
      </div>`;
  return cs.can_show_work
    ? `<a class="dz-cs-card" href="/design/${esc(cs.slug)}/">${inner}</a>`
    : `<div class="dz-cs-card">${inner}</div>`;
}

function designPage(settings, startups, corporates, logos, faqs, sc, site) {
  const s = { ...DESIGN_DEFAULTS, ...(settings || {}) };
  const bands = Array.isArray(s.budget_bands) && s.budget_bands.length ? s.budget_bands : DESIGN_DEFAULTS.budget_bands;
  const booking = s.booking_url || "/book/";
  const url = abs(site, "/design/");
  const title = "Website design + AI systems for startups | Armic, Gambito";
  const desc = "Senior design plus AI, by Armic, founder of Gambito. Complete website systems for founders — site, CMS, automations and dashboards. You own all of it.";

  const personLd = {
    "@context": "https://schema.org", "@type": "Person", name: "Armic", jobTitle: "Designer, founder of Gambito",
    worksFor: { "@type": "Organization", name: "Gambito" }, url,
  };
  const serviceLd = {
    "@context": "https://schema.org", "@type": "ProfessionalService", name: "Gambito — website design + AI systems",
    description: desc, url, areaServed: ["AE", "US", "GB", "CA", "SG", "SA", "QA", "KW", "NZ"], provider: { "@type": "Person", name: "Armic" },
  };
  const crumbs = breadcrumbLd(site, [{ name: "Home", path: "/" }, { name: "Design", path: "/design/" }]);

  const startupCards = startups.length
    ? `<div class="dz-cs-grid">${startups.slice(0, 4).map((c) => designCaseCard(c, site)).join("")}</div>`
    : "";

  const corporateHighlights = corporates.length
    ? `<div class="dz-highlights">${corporates.slice(0, 2).map((c) => `
        <div class="dz-highlight">
          <div class="dz-highlight-attr">${esc(attrLabel(c))}</div>
          <h3>${esc(c.title)}</h3>
          <p>${esc(c.summary)}</p>
        </div>`).join("")}</div>`
    : "";

  const faqHtml = faqs.length
    ? `<div class="dz-faq">${faqs.map((f) => `
        <div class="dz-faq-item">
          <button class="dz-faq-q" aria-expanded="false">${esc(f.question)}</button>
          <div class="dz-faq-a"><div class="dz-faq-a-inner">${esc(f.answer)}</div></div>
        </div>`).join("")}</div>`
    : "";

  const main = `<main class="dz">
    <!-- 1. HERO -->
    <section class="dz-hero">
      <div class="dz-wrap">
        <p class="dz-eyebrow">Design + AI, by Armic</p>
        <h1 class="dz-hero-title">${esc(s.ad_headline || DESIGN_DEFAULTS.ad_headline)}</h1>
        <p class="dz-hero-sub">${esc(s.hero_subhead || DESIGN_DEFAULTS.hero_subhead)}</p>
        <div class="dz-hero-ctas">
          <a class="dz-btn dz-btn--solid" href="#get-started">Tell me about your project</a>
          <a class="dz-textlink" href="#work">See the work ↓</a>
        </div>
        ${logos.length ? `<div class="dz-logos"><p class="dz-logos-label">Craft behind it</p>${designLogosRow(logos)}</div>` : ""}
        <div class="dz-hero-portrait dz-hero-portrait--placeholder">Portrait or short muted loop goes here</div>
      </div>
    </section>

    <!-- 2. WHY DESIGN + AI -->
    <section class="dz-section dz-why">
      <div class="dz-wrap">
        <p>AI can build a website in an afternoon. Most look the same. The difference is who's directing it: I bring <em>15 years of design and UX</em> to every decision the AI makes, so you get the speed without the template look.</p>
      </div>
    </section>

    <!-- 3. WHAT YOU GET -->
    <section class="dz-section">
      <div class="dz-wrap">
        <h2 class="dz-h2">What you get</h2>
        <div class="dz-cards">
          <div class="dz-card">${ICONS.design}<h3>A site designed around your business</h3><p>Not a template. Designed around how your business actually works and what it needs to do.</p></div>
          <div class="dz-card">${ICONS.cms}<h3>A CMS you control</h3><p>Edit your content yourself, anytime, without waiting on a developer.</p></div>
          <div class="dz-card">${ICONS.auto}<h3>Automations &amp; notifications</h3><p>Leads, bookings and form submissions go exactly where they need to.</p></div>
          <div class="dz-card">${ICONS.dash}<h3>Dashboards</h3><p>See what's working, so you can make decisions with real numbers.</p></div>
        </div>
        <p class="dz-own"><strong>You own all of it.</strong> No retainer, no monthly fees. I hand it over and teach you to build new pages with AI.</p>
      </div>
    </section>

    <!-- 4. SELECTED WORK: STARTUPS -->
    <section class="dz-section" id="work">
      <div class="dz-wrap-wide">
        <h2 class="dz-h2">Selected work</h2>
        <p class="dz-lead">Recent builds for founders and small teams.</p>
        ${startupCards}
      </div>
    </section>

    <!-- 5. 15 YEARS OF CRAFT (corporate) -->
    <section class="dz-section dz-corporate">
      <div class="dz-wrap">
        <h2 class="dz-h2">15 years of craft behind it</h2>
        <p class="dz-lead">Before Gambito, I spent 15 years in UX design and research for companies like Vodafone, Apple and Air New Zealand. <em>That's where the taste comes from.</em></p>
        ${logos.length ? `<div class="dz-logos">${designLogosRow(logos)}</div>` : ""}
        ${corporateHighlights}
      </div>
    </section>

    <!-- 6. HOW IT WORKS -->
    <section class="dz-section">
      <div class="dz-wrap">
        <h2 class="dz-h2">How it works</h2>
        <div class="dz-steps">
          <div class="dz-step"><p>A 20-minute call about your business and what the site needs to do.</p></div>
          <div class="dz-step"><p>A fixed quote within 48 hours.</p></div>
          <div class="dz-step"><p>The build, usually 3 to 5 weeks. You see progress every week.</p></div>
          <div class="dz-step"><p>Handover: you own everything, and I show you how to add pages with AI.</p></div>
        </div>
      </div>
    </section>

    <!-- 7. CAPACITY -->
    <section class="dz-section dz-capacity">
      <div class="dz-wrap">
        <div class="dz-capacity-card">
          <p class="dz-capacity-line"><span class="dz-capacity-dot"></span>It's just me, so I take on ${esc(String(s.capacity_count))} projects at a time.</p>
          ${s.next_opening ? `<p class="dz-capacity-sub">Next opening: <b>${esc(s.next_opening)}</b></p>` : ""}
        </div>
      </div>
    </section>

    <!-- 8. ABOUT ARMIC -->
    <section class="dz-section">
      <div class="dz-wrap">
        <h2 class="dz-h2">About Armic</h2>
        <div class="dz-about-grid dz-about">
          <div class="dz-about-portrait">Portrait</div>
          <div>
            <p>I started as a developer, then spent 15+ years in UX design and research, working with teams from startups to large companies.</p>
            <p>Now I run Gambito, where I use AI to build complete website systems, fast, with the design judgement that only comes from doing the work for that long.</p>
            <p>I'm based in New Zealand and work with founders across the UAE, US, UK, Canada, Singapore and the wider Gulf.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 9. FAQ -->
    <section class="dz-section">
      <div class="dz-wrap">
        <h2 class="dz-h2">Questions</h2>
        ${faqHtml}
      </div>
    </section>

    <!-- 10. FINAL CTA + FORM -->
    <section class="dz-section dz-form-section" id="get-started">
      <div class="dz-wrap">
        <h2 class="dz-h2" style="text-align:center">Tell me about your project</h2>
        <p class="dz-lead" style="margin-left:auto;margin-right:auto;text-align:center">I reply personally ${esc(s.reply_time_text || "within an hour")}.</p>
        <div class="dz-form-card" id="dz-form-card" data-booking="${esc(booking)}" data-reply="${esc(s.reply_time_text || "within an hour")}">
          <form class="dz-form" id="dz-lead-form" novalidate>
            <div class="dz-field"><label for="dz-name">Name <span class="req">*</span></label><input id="dz-name" name="name" type="text" autocomplete="name" required /></div>
            <div class="dz-field"><label for="dz-email">Email <span class="req">*</span></label><input id="dz-email" name="email" type="email" autocomplete="email" required /></div>
            <div class="dz-field"><label for="dz-whatsapp">WhatsApp number</label><input id="dz-whatsapp" name="whatsapp" type="tel" placeholder="With country code" autocomplete="tel" /></div>
            <div class="dz-field"><label for="dz-business">Business name or website</label><input id="dz-business" name="business" type="text" /></div>
            <div class="dz-field"><label for="dz-stage">What stage are you at? <span class="req">*</span></label>
              <select id="dz-stage" name="stage" required>
                <option value="">Choose one…</option>
                <option>Idea</option>
                <option>Pre-launch</option>
                <option>Launched (under 2 years)</option>
                <option>Established business</option>
              </select>
            </div>
            <div class="dz-field"><label>What do you need? <span class="req">*</span></label>
              <div class="dz-checks">
                <label class="dz-check"><input type="checkbox" name="needs" value="New website" /> New website</label>
                <label class="dz-check"><input type="checkbox" name="needs" value="Website + system" /> Website + system</label>
                <label class="dz-check"><input type="checkbox" name="needs" value="Redesign" /> Redesign</label>
                <label class="dz-check"><input type="checkbox" name="needs" value="Not sure yet" /> Not sure yet</label>
              </div>
            </div>
            <div class="dz-field"><label for="dz-budget">Budget <span class="req">*</span></label>
              <select id="dz-budget" name="budget" required>
                <option value="">Choose a range…</option>
                ${bands.map((b) => `<option>${esc(b)}</option>`).join("")}
              </select>
            </div>
            <div class="dz-field"><label for="dz-message">Anything else?</label><textarea id="dz-message" name="message" rows="3"></textarea></div>
            <input type="text" name="company_website" class="dz-hp" tabindex="-1" autocomplete="off" aria-hidden="true" />
            <button type="submit" class="dz-btn dz-btn--solid dz-btn--block dz-form-submit" id="dz-form-submit">Send</button>
            <p class="dz-form-status" id="dz-form-status" role="status"></p>
          </form>
        </div>
        <p class="dz-form-note">Prefer to talk? <a href="${esc(booking)}" style="color:var(--ember)">Book a 20-minute call</a>.</p>
      </div>
    </section>
  </main>`;

  const headHtml = head({ title, description: desc, canonical: url, ogImage: ogPick(site, sc.og_image), jsonLd: [personLd, serviceLd, crumbs] })
    + `\n  <link rel="stylesheet" href="/design.css" />`;
  return layout({ headHtml, main, sc }).replace("<script src=\"/nav.js\" defer></script>", "<script src=\"/nav.js\" defer></script>\n  <script src=\"/design.js\" defer></script>");
}

function designCaseStudyPage(cs, nextCs, sc, site) {
  const url = abs(site, `/design/${cs.slug}/`);
  const title = `${cs.title} — ${cs.client_name} | Gambito`;
  const desc = cs.summary || `${cs.title} by Armic, Gambito.`;
  const ogImage = ogPick(site, cs.hero_image, sc.og_image);
  const show = cs.can_show_work;
  const gallery = Array.isArray(cs.gallery) ? cs.gallery : [];
  const articleLd = {
    "@context": "https://schema.org", "@type": "CreativeWork", name: cs.title,
    about: cs.client_name, dateCreated: cs.year ? String(cs.year) : undefined, description: desc, url,
  };
  const crumbs = breadcrumbLd(site, [{ name: "Home", path: "/" }, { name: "Design", path: "/design/" }, { name: cs.title, path: `/design/${cs.slug}/` }]);

  const main = `<main class="dz">
    <article class="dz-wrap dz-cs-page">
      <nav class="crumb" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><a href="/design/">Design</a><span>/</span>${esc(cs.title)}</nav>
      <div class="dz-cs-head">
        <span class="dz-cs-client">${esc(attrLabel(cs))}</span>
        <h1 class="dz-cs-h1">${esc(cs.title)}</h1>
        <p class="dz-cs-meta">${esc([cs.client_name, cs.year].filter(Boolean).join(" · "))}</p>
      </div>
      <p class="dz-cs-summary-lead">${esc(cs.summary)}</p>
      ${show && cs.hero_image ? `<div class="dz-cs-gallery" style="grid-template-columns:1fr"><img src="${esc(cs.hero_image)}" alt="${esc(cs.title)}" /></div>` : ""}
      ${cs.problem ? `<div class="dz-cs-block"><h2>The problem</h2><p>${esc(cs.problem)}</p></div>` : ""}
      ${cs.what_i_built ? `<div class="dz-cs-block"><h2>What I built</h2>${tagChips(cs.system_tags) ? `<div class="dz-tags" style="margin-bottom:0.8rem">${tagChips(cs.system_tags)}</div>` : ""}<p>${esc(cs.what_i_built)}</p></div>` : ""}
      ${cs.timeline ? `<div class="dz-cs-block"><h2>Timeline</h2><p>${esc(cs.timeline)}</p></div>` : ""}
      ${cs.result || cs.testimonial_quote ? `<div class="dz-cs-block"><h2>Result</h2><div class="dz-cs-result"><p>${esc(cs.testimonial_quote ? `“${cs.testimonial_quote}”${cs.testimonial_name ? ` — ${cs.testimonial_name}${cs.testimonial_role ? `, ${cs.testimonial_role}` : ""}` : ""}` : cs.result)}</p></div></div>` : ""}
      ${show && gallery.length ? `<div class="dz-cs-gallery">${gallery.map((g) => `<img src="${esc(g.url || g)}" alt="${esc(g.alt || cs.title)}" loading="lazy" />`).join("")}</div>` : ""}
      ${show && cs.live_url ? `<p><a class="dz-btn dz-btn--ghost" href="${esc(cs.live_url)}" target="_blank" rel="noopener">Visit the live site ↗</a></p>` : ""}
      <div class="dz-cs-next">
        ${nextCs ? `<a href="/design/${esc(nextCs.slug)}/">Next: ${esc(nextCs.title)} →</a>` : "<span></span>"}
        <a href="/design/#get-started">Start a project →</a>
      </div>
    </article>
  </main>`;

  const headHtml = head({ title, description: desc, canonical: url, ogImage, ogType: "article", jsonLd: [articleLd, crumbs] })
    + `\n  <link rel="stylesheet" href="/design.css" />`;
  return layout({ headHtml, main, sc });
}

/* ---------- run ---------- */
async function run() {
  const [{ data: content }, { data: services }, { data: insights }, { data: faqs }, { data: offerings }, { data: caseStudies },
    { data: designSettingsRows }, { data: designCases }, { data: designLogos }, { data: designFaqs }] = await Promise.all([
    supabase.from("site_content").select("key, value"),
    supabase.from("services").select("*").eq("published", true).order("order_index"),
    supabase.from("insights").select("*").eq("published", true).order("published_at", { ascending: false }),
    supabase.from("faqs").select("*").eq("published", true).order("order_index"),
    supabase.from("offerings").select("*").eq("published", true).order("order_index"),
    supabase.from("case_studies").select("*").eq("published", true).order("order_index"),
    supabase.from("design_settings").select("*").eq("id", "default"),
    supabase.from("design_case_studies").select("*").eq("published", true).order("order_index"),
    supabase.from("design_logos").select("*").eq("published", true).order("order_index"),
    supabase.from("design_faqs").select("*").eq("published", true).order("order_index"),
  ]);

  const sc = Object.fromEntries((content || []).map((r) => [r.key, r.value]));
  const site = sc.site_url || FALLBACK_SITE_URL;
  const allOfferings = offerings || [];
  const serviceTitle = Object.fromEntries((services || []).map((s) => [s.slug, s.title]));

  const urls = [
    { loc: "/", changefreq: "weekly", priority: "1.0" },
    { loc: "/book/", changefreq: "weekly", priority: "0.9" },
    { loc: "/insights/", changefreq: "weekly", priority: "0.8" },
    { loc: "/faq/", changefreq: "monthly", priority: "0.6" },
  ];

  for (const svc of services || []) {
    const svcOfferings = allOfferings.filter((o) => o.service_slug === svc.slug);
    await write(`services/${svc.slug}/index.html`, servicePage(svc, svcOfferings, sc, site));
    urls.push({ loc: `/services/${svc.slug}/`, changefreq: "monthly", priority: "0.8", lastmod: (svc.updated_at || "").slice(0, 10) });
  }

  for (const off of allOfferings) {
    await write(`services/${off.service_slug}/${off.slug}/index.html`, offeringPage(off, serviceTitle[off.service_slug] || "Services", sc, site));
    urls.push({ loc: `/services/${off.service_slug}/${off.slug}/`, changefreq: "monthly", priority: "0.8", lastmod: (off.updated_at || "").slice(0, 10) });
  }

  if (insights && insights.length) {
    await write("insights/index.html", insightsIndex(insights, sc, site));
    for (const post of insights) {
      await write(`insights/${post.slug}/index.html`, insightPage(post, sc, site));
      urls.push({ loc: `/insights/${post.slug}/`, changefreq: "monthly", priority: "0.7", lastmod: (post.updated_at || post.published_at || "").slice(0, 10) });
    }
  }

  if (faqs && faqs.length) {
    await write("faq/index.html", faqPage(faqs, sc, site));
  }

  // design service page + its case studies
  {
    const settings = (designSettingsRows || [])[0] || null;
    const cases = designCases || [];
    const startups = cases.filter((c) => c.client_type === "startup");
    const corporates = cases.filter((c) => c.client_type === "corporate");
    const logos = designLogos || [];
    const dFaqs = designFaqs || [];
    await write("design/index.html", designPage(settings, startups, corporates, logos, dFaqs, sc, site));
    urls.push({ loc: "/design/", changefreq: "weekly", priority: "0.9" });

    // case study detail pages (only those whose work can be shown)
    const linkable = cases.filter((c) => c.can_show_work);
    for (let i = 0; i < linkable.length; i++) {
      const cs = linkable[i];
      const next = linkable[(i + 1) % linkable.length];
      await write(`design/${cs.slug}/index.html`, designCaseStudyPage(cs, linkable.length > 1 ? next : null, sc, site));
      urls.push({ loc: `/design/${cs.slug}/`, changefreq: "monthly", priority: "0.7", lastmod: (cs.updated_at || "").slice(0, 10) });
    }
  }

  await write("sitemap.xml", sitemapXml(site, urls));
  await write("robots.txt", robotsTxt(site));

  await bakeHomepage(sc, services || [], caseStudies || []);

  console.log(`\nPrerender complete: ${(services || []).length} services, ${allOfferings.length} offerings, ${(insights || []).length} insights, ${(faqs || []).length} faqs, ${(designCases || []).length} design case studies.`);
}

run().catch((err) => {
  // don't hard-fail the whole deploy if the CMS is briefly unreachable — the
  // homepage build already succeeded; just skip the dynamic pages this time.
  console.error("\n[prerender] WARNING — could not generate content pages:", err.message);
  console.error("[prerender] The site will still deploy; re-run the build once Supabase is reachable.");
});
