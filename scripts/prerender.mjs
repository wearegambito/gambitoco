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
import { mkdir, writeFile } from "node:fs/promises";
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
  <link rel="stylesheet" href="/content.css" />
  ${ld}`;
}

const nav = () => `<header class="nav">
    <a class="nav-brand" href="/" aria-label="Gambito"><img src="/logo-full.svg" alt="Gambito" class="nav-brand-logo" /></a>
    <nav class="nav-links" aria-label="Primary">
      <a href="/#services">Services</a>
      <a href="/#work">Work</a>
      <a href="/insights/">Insights</a>
      <a href="/faq/">FAQ</a>
    </nav>
    <a class="nav-cta" href="/book/">Start the conversation</a>
    <button class="nav-toggle" id="nav-toggle" aria-label="Open menu" aria-expanded="false"><span></span><span></span></button>
  </header>
  <div class="mobile-menu" id="mobile-menu" aria-hidden="true">
    <nav class="mobile-menu-links" aria-label="Mobile">
      <a href="/#services">Services</a>
      <a href="/#work">Work</a>
      <a href="/insights/">Insights</a>
      <a href="/faq/">FAQ</a>
      <a href="/book/" class="mobile-menu-cta">Book a Gameplan Session</a>
    </nav>
  </div>`;

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

function layout({ headHtml, main }) {
  return `<!doctype html>
<html lang="en">
<head>
  ${headHtml}
</head>
<body>
  ${nav()}
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
  const ogImage = abs(site, svc.og_image || sc.og_image || "/favicon.png");
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
  return layout({ headHtml: head({ title, description: desc, canonical: url, ogImage, jsonLd: [serviceLd, crumbs] }), main });
}

function offeringPage(off, serviceTitle, sc, site) {
  const path = `/services/${off.service_slug}/${off.slug}/`;
  const url = abs(site, path);
  const title = off.seo_title || `${off.title} | Gambito`;
  const desc = off.seo_description || off.tagline;
  const ogImage = abs(site, off.og_image || sc.og_image || "/favicon.png");
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

  const main = `<nav class="crumb" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><a href="/services/${esc(off.service_slug)}/">${esc(serviceTitle)}</a><span>/</span>${esc(off.title)}</nav>
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
  return layout({ headHtml: head({ title, description: desc, canonical: url, ogImage, jsonLd: [offeringLd, crumbs] }), main });
}

function insightsIndex(posts, sc, site) {
  const url = abs(site, "/insights/");
  const title = "Insights — Field notes for founders | Gambito";
  const desc = "Ideas, essays and field notes on moving from hesitation to action — building, validating and growing ventures. From the Gambito studio.";
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
  const main = `<nav class="crumb" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span>Insights</nav>
  <div class="wrap-wide">
    <div class="page-head">
      <p class="page-eyebrow">Insights</p>
      <h1 class="page-title">Field notes for founders.</h1>
      <p class="page-lede">Essays and ideas on moving from hesitation to action — validating, building and growing ventures.</p>
    </div>
    <div class="card-grid">
      ${cards}
    </div>
  </div>
  ${ctaBlock(sc)}
  ${footer(sc)}`;
  return layout({ headHtml: head({ title, description: desc, canonical: url, ogImage: abs(site, sc.og_image || "/favicon.png"), jsonLd: [orgLd(site), crumbs] }), main });
}

function insightPage(post, sc, site) {
  const url = abs(site, `/insights/${post.slug}/`);
  const title = post.seo_title || `${post.title} | Gambito`;
  const desc = post.seo_description || post.excerpt;
  const ogImage = abs(site, post.og_image || post.cover_image || sc.og_image || "/favicon.png");
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
  return layout({ headHtml: head({ title, description: desc, canonical: url, ogImage, ogType: "article", published: post.published_at, modified: post.updated_at, jsonLd: [articleLd, crumbs] }), main });
}

function faqPage(faqs, sc, site) {
  const url = abs(site, "/faq/");
  const title = "Frequently Asked Questions | Gambito";
  const desc = "Answers to common questions about working with Gambito — our venture studio, services, Gameplan Sessions and how we help founders move from hesitation to action.";
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
      <h1 class="page-title">Frequently asked questions.</h1>
      <p class="page-lede">Everything founders usually want to know before making the first move.</p>
    </div>
    ${listHtml}
  </div>
  ${ctaBlock(sc)}
  ${footer(sc)}`;
  return layout({ headHtml: head({ title, description: desc, canonical: url, ogImage: abs(site, sc.og_image || "/favicon.png"), jsonLd: [faqLd, crumbs] }), main });
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

Sitemap: ${abs(site, "/sitemap.xml")}`;

/* ---------- run ---------- */
async function run() {
  const [{ data: content }, { data: services }, { data: insights }, { data: faqs }, { data: offerings }] = await Promise.all([
    supabase.from("site_content").select("key, value"),
    supabase.from("services").select("*").eq("published", true).order("order_index"),
    supabase.from("insights").select("*").eq("published", true).order("published_at", { ascending: false }),
    supabase.from("faqs").select("*").eq("published", true).order("order_index"),
    supabase.from("offerings").select("*").eq("published", true).order("order_index"),
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

  await write("sitemap.xml", sitemapXml(site, urls));
  await write("robots.txt", robotsTxt(site));

  console.log(`\nPrerender complete: ${(services || []).length} services, ${allOfferings.length} offerings, ${(insights || []).length} insights, ${(faqs || []).length} faqs.`);
}

run().catch((err) => {
  // don't hard-fail the whole deploy if the CMS is briefly unreachable — the
  // homepage build already succeeded; just skip the dynamic pages this time.
  console.error("\n[prerender] WARNING — could not generate content pages:", err.message);
  console.error("[prerender] The site will still deploy; re-run the build once Supabase is reachable.");
});
