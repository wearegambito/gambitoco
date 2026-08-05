import { supabase } from "./supabase.js";

/* Landing-page CMS hydration.
 *
 * Each campaign page ships its full copy in static HTML (great for SEO + first
 * paint + no-JS). A row in `landing_pages` holds a `content` map of per-field
 * OVERRIDES; anything set there replaces the matching [data-cms] node at
 * runtime. Empty content = the static HTML shows as-is. This lets the admin
 * tweak copy/images without redeploying, while the page still works if the DB
 * is unreachable.
 */
export async function initLanding(slug) {
  try {
    const { data, error } = await supabase
      .from("landing_pages")
      .select("content")
      .eq("slug", slug)
      .eq("published", true)
      .single();
    if (error || !data || !data.content) return;
    applyLanding(data.content);
  } catch {
    /* keep the static fallback */
  }
}

function applyLanding(content) {
  document.querySelectorAll("[data-cms]").forEach((el) => {
    const key = el.dataset.cms;
    if (!(key in content) || content[key] == null || content[key] === "") return;
    const value = content[key];
    if (el.dataset.cmsAttr) el.setAttribute(el.dataset.cmsAttr, value);
    else el.innerHTML = value;
  });
  if (content.seo_title) document.title = content.seo_title;
  if (content.seo_description) {
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", content.seo_description);
  }
}
