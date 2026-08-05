import { supabase } from "./supabase.js";

/* Landing-page CMS hydration + A/B testing.
 *
 * Copy: each page ships full copy in static HTML (SEO + first paint + no-JS).
 * A `landing_pages` row holds a `content` map of per-field OVERRIDES applied to
 * the matching [data-cms] nodes at runtime. Empty content = static HTML shows.
 *
 * A/B: if `content.experiment` is set, PostHog assigns the visitor a variant
 * (control/test) and we apply that variant's field overrides on top. PostHog
 * owns the split + goal metric; the CMS owns the variant copy. Tested elements
 * are hidden until the variant resolves so visitors never see a flip.
 */
export async function initLanding(slug) {
  let content = {};
  try {
    const { data } = await supabase
      .from("landing_pages")
      .select("content")
      .eq("slug", slug)
      .eq("published", true)
      .single();
    content = (data && data.content) || {};
  } catch {
    /* keep the static fallback */
  }
  applyLanding(content);
  runExperiment(content);
}

function applyLanding(map) {
  if (!map) return;
  document.querySelectorAll("[data-cms]").forEach((el) => {
    const key = el.dataset.cms;
    if (!(key in map) || map[key] == null || map[key] === "") return;
    const value = map[key];
    if (el.dataset.cmsAttr) el.setAttribute(el.dataset.cmsAttr, value);
    else el.innerHTML = value;
  });
  if (map.seo_title) document.title = map.seo_title;
  if (map.seo_description) {
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", map.seo_description);
  }
}

function runExperiment(content) {
  const exp = content && content.experiment;
  if (!exp || !exp.flag || !exp.variants) return;

  // hide the fields under test (visibility, not display — no layout shift)
  const testedKeys = new Set();
  Object.values(exp.variants).forEach((v) => Object.keys(v || {}).forEach((k) => testedKeys.add(k)));
  const hidden = [];
  testedKeys.forEach((k) => {
    document.querySelectorAll(`[data-cms="${k}"]`).forEach((el) => {
      if (el.tagName === "META" || el.tagName === "TITLE") return;
      el.style.visibility = "hidden";
      hidden.push(el);
    });
  });
  const reveal = () => hidden.forEach((el) => (el.style.visibility = ""));

  let done = false;
  const apply = () => {
    if (done) return;
    done = true;
    try {
      const variant = window.posthog && window.posthog.getFeatureFlag ? window.posthog.getFeatureFlag(exp.flag) : null;
      const overrides = variant && exp.variants[variant];
      if (overrides) applyLanding(overrides);
    } catch {
      /* fall back to control copy */
    }
    reveal();
  };

  // wait for PostHog + its flags, with a hard fallback so copy never stays hidden
  const start = Date.now();
  (function wait() {
    if (window.posthog && window.posthog.onFeatureFlags) {
      window.posthog.onFeatureFlags(apply);
      setTimeout(apply, 2500);
    } else if (Date.now() - start > 2000) {
      apply();
    } else {
      setTimeout(wait, 100);
    }
  })();
}
