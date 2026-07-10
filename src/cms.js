import { supabase } from "./supabase.js";

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export async function loadCmsContent() {
  const [contentRes, servicesRes, caseStudiesRes] = await Promise.all([
    supabase.from("site_content").select("key, value"),
    supabase.from("services").select("*").eq("published", true).order("order_index"),
    supabase.from("case_studies").select("*").eq("published", true).order("order_index"),
  ]);
  if (contentRes.error) throw contentRes.error;
  if (servicesRes.error) throw servicesRes.error;
  if (caseStudiesRes.error) throw caseStudiesRes.error;

  const content = {};
  for (const row of contentRes.data) content[row.key] = row.value;

  return { content, services: servicesRes.data, caseStudies: caseStudiesRes.data };
}

export function applyCmsContent({ content, services, caseStudies }) {
  // singleton text/html fields, matched by data-cms attribute
  document.querySelectorAll("[data-cms]").forEach((el) => {
    const key = el.dataset.cms;
    if (!(key in content)) return;
    const value = content[key];
    if (el.dataset.cmsAttr) {
      el.setAttribute(el.dataset.cmsAttr, value);
    } else if (el.dataset.cmsHref) {
      // keep visible text and the link's href in sync from one field
      el.textContent = value;
      const clean = el.dataset.cmsHref === "tel:" ? value.replace(/[^\d+]/g, "") : value;
      el.setAttribute("href", el.dataset.cmsHref + clean);
    } else {
      el.innerHTML = value;
    }
  });

  if (content.meta_title) document.title = content.meta_title;
  if (content.meta_description) {
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", content.meta_description);
  }

  // background video — swap the source if a custom one is set in the CMS.
  // Runs before main.js wires up the scroll-scrub, so it reads the new file.
  if (content.hero_video) {
    const video = document.getElementById("page-video");
    const source = video && video.querySelector("source");
    if (source && content.hero_video !== source.getAttribute("src")) {
      source.setAttribute("src", content.hero_video);
      video.load();
    }
  }

  // services cards
  const servicesStack = document.querySelector(".services-stack");
  if (servicesStack && services && services.length) {
    servicesStack.innerHTML = services
      .map(
        (s) => `
        <a class="s-card" href="/services/${escapeHtml(s.slug)}/" data-hover>
          <div class="s-card-top"><span class="s-num">${escapeHtml(s.number)}</span><h3>${escapeHtml(s.title)}</h3></div>
          <p>${escapeHtml(s.description)}</p>
          <span class="s-tag">${escapeHtml(s.tag)}</span>
          <span class="s-go">Explore ${escapeHtml(s.title)} →</span>
        </a>`
      )
      .join("");
  }

  // case study cards
  const workGrid = document.querySelector(".work-grid");
  if (workGrid && caseStudies && caseStudies.length) {
    workGrid.innerHTML = caseStudies
      .map((c) => {
        const href = c.link_url || "#contact";
        const external = /^https?:\/\//i.test(href);
        const linkAttrs = external ? ' target="_blank" rel="noopener noreferrer"' : "";
        const extBadge = external ? `<span class="w-ext" aria-hidden="true">↗</span>` : "";
        const extLabel = external ? " (opens in a new tab)" : "";
        return `
        <a class="w-card w-span${c.span === "7" ? "7" : "5"}" href="${escapeHtml(href)}"${linkAttrs} data-hover aria-label="${escapeHtml(c.title)}${extLabel}">
          <figure class="w-media"><img src="${escapeHtml(c.image_url)}" alt="${escapeHtml(c.title)}" loading="lazy" />${extBadge}</figure>
          <div class="w-meta"><h3>${escapeHtml(c.title)}</h3><span>${escapeHtml(c.category)}</span></div>
        </a>`;
      })
      .join("");
  }
}
