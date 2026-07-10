import { supabase } from "../src/supabase.js";

const ADMIN_EMAIL = "armic@gambito.co.nz";
const IMAGE_BUCKET = "case-studies"; // shared image bucket for all uploads

/* ---------- site content (homepage, live-fetch) ---------- */
// short explainer shown under each group heading, so it's clear what each
// block controls and whether it's live instantly or needs a Publish.
const GROUP_INFO = {
  "Navigation": "The header links and button, on every page. Live on the homepage instantly; other pages update when you Publish.",
  "Hero": "The big opening area of the homepage. Saves go live instantly.",
  "Background": "The video that plays behind the whole homepage.",
  "Story": "The line that reveals as you scroll under the hero.",
  "Services section": "The heading and intro above the service cards.",
  "Work section": "The heading and intro above the case studies.",
  "Call to action": "The band near the bottom of the homepage.",
  "Footer": "On every page. Homepage updates instantly; other pages on Publish.",
  "Insights page": "The /insights listing page — title, intro and how it looks in Google. Updates on Publish.",
  "FAQ page": "The /faq page — title, intro and how it looks in Google. Updates on Publish.",
  "Booking page": "The /book page copy and settings. Updates instantly.",
  "SEO & social": "How the homepage looks in Google and when shared. (Each Service / Insight has its own SEO fields on its card.)",
  "Deployment": "Connects the Publish button to your Netlify build.",
};

const CONTENT_FIELDS = [
  // header links + button (each is a nav button name)
  { group: "Navigation", key: "nav_services", label: "Link 1 — Services", type: "input" },
  { group: "Navigation", key: "nav_work", label: "Link 2 — Work", type: "input" },
  { group: "Navigation", key: "nav_insights", label: "Link 3 — Insights", type: "input" },
  { group: "Navigation", key: "nav_faq", label: "Link 4 — FAQ", type: "input" },
  { group: "Navigation", key: "nav_cta", label: "Button", type: "input", hint: "The pill button in the top-right, e.g. “Start the conversation”." },

  { group: "Hero", key: "hero_eyebrow", label: "Eyebrow line", type: "input", hint: "Small label above the headline." },
  { group: "Hero", key: "hero_title_1", label: "Headline — line 1", type: "input" },
  { group: "Hero", key: "hero_title_2", label: "Headline — line 2", type: "input", hint: "HTML allowed — wrap a word in <em>…</em> for the italic accent." },
  { group: "Hero", key: "hero_sub", label: "Sub-heading", type: "textarea" },
  { group: "Hero", key: "hero_cta_primary", label: "Primary button", type: "input" },
  { group: "Hero", key: "hero_cta_secondary", label: "Secondary button", type: "input" },

  { group: "Background", key: "hero_video", label: "Background video", type: "media", hint: "Scroll-scrubbed — for smooth playback the clip must be re-encoded with frequent keyframes and kept small (the bundled /hero.mp4 is pre-optimised for this). A raw upload will stutter; ask the studio to optimise a new clip before swapping it in." },

  { group: "Story", key: "story_text", label: "Story paragraph", type: "textarea", hint: "HTML allowed — <em>…</em> for the coral emphasis word." },

  { group: "Services section", key: "services_title", label: "Heading", type: "input" },
  { group: "Services section", key: "services_lede", label: "Intro line", type: "textarea" },

  { group: "Work section", key: "work_title", label: "Heading", type: "input" },
  { group: "Work section", key: "work_lede", label: "Intro line", type: "textarea" },

  { group: "Call to action", key: "cta_title_1", label: "Headline — line 1", type: "input" },
  { group: "Call to action", key: "cta_title_2", label: "Headline — line 2", type: "input", hint: "HTML allowed — <em>…</em>." },
  { group: "Call to action", key: "cta_sub", label: "Sub-text", type: "textarea" },
  { group: "Call to action", key: "cta_button", label: "Button label", type: "input" },
  { group: "Call to action", key: "cta_button_link", label: "Button link", type: "input", hint: "e.g. mailto:hello@gambito.co or /book/" },

  { group: "Footer", key: "footer_address", label: "Studio address", type: "textarea", hint: "HTML allowed — <br /> for line breaks." },
  { group: "Footer", key: "footer_email", label: "Email", type: "input" },
  { group: "Footer", key: "footer_phone", label: "Phone", type: "input" },
  { group: "Footer", key: "footer_linkedin_url", label: "LinkedIn URL", type: "input" },
  { group: "Footer", key: "footer_instagram_url", label: "Instagram URL", type: "input" },
  { group: "Footer", key: "footer_copyright", label: "Copyright line", type: "input" },
  { group: "Footer", key: "footer_tagline", label: "Tagline", type: "input" },

  { group: "Insights page", key: "insights_title", label: "Page heading", type: "input" },
  { group: "Insights page", key: "insights_lede", label: "Intro line", type: "textarea" },
  { group: "Insights page", key: "insights_seo_title", label: "SEO title", type: "input", hint: "Browser tab & Google result title." },
  { group: "Insights page", key: "insights_seo_description", label: "SEO description", type: "textarea", hint: "~155 characters. Shows in Google results." },

  { group: "FAQ page", key: "faq_title", label: "Page heading", type: "input" },
  { group: "FAQ page", key: "faq_lede", label: "Intro line", type: "textarea" },
  { group: "FAQ page", key: "faq_seo_title", label: "SEO title", type: "input", hint: "Browser tab & Google result title." },
  { group: "FAQ page", key: "faq_seo_description", label: "SEO description", type: "textarea", hint: "~155 characters. Shows in Google results." },

  { group: "Booking page", key: "booking_enabled", label: "Booking enabled", type: "input", hint: "Type true or false to turn the /book page on or off." },
  { group: "Booking page", key: "booking_title", label: "Heading", type: "input" },
  { group: "Booking page", key: "booking_intro", label: "Intro text", type: "textarea" },
  { group: "Booking page", key: "booking_confirm", label: "Confirmation message", type: "textarea" },
  { group: "Booking page", key: "booking_duration", label: "Session length (minutes)", type: "input" },
  { group: "Booking page", key: "booking_timezone", label: "Your timezone", type: "input", hint: "IANA name, e.g. Pacific/Auckland — used in emails & labels." },
  { group: "Booking page", key: "booking_from_email", label: "Sender email for booking emails", type: "input", hint: "Must be a verified sender in MailerSend, e.g. no-reply@gambito.co." },

  { group: "SEO & social", key: "meta_title", label: "Homepage title tag", type: "input", hint: "The browser tab & Google result title for the homepage." },
  { group: "SEO & social", key: "meta_description", label: "Homepage meta description", type: "textarea", hint: "~155 characters. Shows in Google results." },
  { group: "SEO & social", key: "site_url", label: "Canonical site URL", type: "input", hint: "e.g. https://gambito.co — used for canonical tags & sitemap." },
  { group: "SEO & social", key: "og_image", label: "Default share image", type: "input", hint: "Path or URL used for social previews when a page has none. Ideally 1200×630." },
  { group: "SEO & social", key: "twitter_handle", label: "Twitter/X handle", type: "input" },

  { group: "Deployment", key: "netlify_build_hook", label: "Netlify build hook URL", type: "input", hint: "Paste your Netlify build hook here to enable the Publish button (Netlify → Site config → Build & deploy → Build hooks)." },
];

/* ---------- resource definitions (tables with card editors) ---------- */
const RESOURCES = {
  services: {
    table: "services",
    listSel: "#services-list", statusSel: "#services-status", addBtnSel: "#add-service",
    order: { column: "order_index", ascending: true }, orderable: true,
    savedMsg: "Saved. Homepage card is live now; the detail page updates on Publish.",
    fields: [
      { name: "number", label: "Number", type: "input" },
      { name: "title", label: "Title", type: "input" },
      { name: "slug", label: "URL slug", type: "input", hint: "Page lives at /services/{slug}/" },
      { name: "tag", label: "Tag line", type: "input" },
      { name: "description", label: "Card description (homepage)", type: "textarea", full: true },
      { name: "body", label: "Detail page content", type: "markdown", full: true, hint: "Markdown. Use ## for headings, - for bullets, **bold**." },
      { name: "hero_image", label: "Hero image", type: "image", full: true },
      { name: "seo_title", label: "SEO title", type: "input", full: true, hint: "Browser tab & Google result title. Falls back to the page title." },
      { name: "seo_description", label: "SEO description", type: "textarea", full: true, hint: "~155 characters. Shows in Google results." },
      { name: "og_image", label: "Social share image", type: "image", full: true, hint: "Shown when the page is shared. 1200×630 ideal; falls back to the default share image." },
    ],
    newRow: (n) => ({ order_index: n, number: String(n).padStart(2, "0"), title: "New service", slug: "new-service-" + Date.now(), description: "", tag: "", body: "", published: false }),
  },
  offerings: {
    table: "offerings",
    listSel: "#offerings-list", statusSel: "#offerings-status", addBtnSel: "#add-offering",
    order: { column: "order_index", ascending: true }, orderable: true,
    savedMsg: "Saved. Hit Publish to rebuild the live page.",
    fields: [
      { name: "service_slug", label: "Parent service slug", type: "input", hint: "e.g. discovery — must match a service's slug." },
      { name: "slug", label: "URL slug", type: "input", hint: "Lives at /services/{service}/{slug}/" },
      { name: "title", label: "Title", type: "input" },
      { name: "eyebrow", label: "Eyebrow", type: "input", hint: "e.g. Discovery · Sprint" },
      { name: "tagline", label: "Tagline", type: "input", full: true },
      { name: "intro", label: "Intro", type: "textarea", full: true },
      { name: "hero_image", label: "Hero image", type: "image", full: true },
      { name: "formats", label: "Formats", type: "json", full: true, hint: 'JSON array of {"name","meta","detail"}.' },
      { name: "highlights", label: "Stat highlights", type: "json", full: true, hint: 'JSON array of {"value","label"}.' },
      { name: "process", label: "Process phases", type: "json", full: true, hint: 'JSON array of {"phase","title","items":[...]}.' },
      { name: "deliverables", label: "Deliverables", type: "json", full: true, hint: 'JSON array of strings.' },
      { name: "good_for", label: "Works well for", type: "json", full: true, hint: 'JSON array of strings.' },
      { name: "not_for", label: "Not the right fit for", type: "json", full: true, hint: 'JSON array of strings.' },
      { name: "body", label: "Extra body (optional)", type: "markdown", full: true, hint: "Markdown, appended below the structured sections." },
      { name: "cta_label", label: "CTA label", type: "input" },
      { name: "cta_link", label: "CTA link", type: "input" },
      { name: "seo_title", label: "SEO title", type: "input", full: true, hint: "Browser tab & Google result title. Falls back to the page title." },
      { name: "seo_description", label: "SEO description", type: "textarea", full: true, hint: "~155 characters. Shows in Google results." },
      { name: "og_image", label: "Social share image", type: "image", full: true, hint: "Shown when the page is shared. 1200×630 ideal; falls back to the default share image." },
    ],
    newRow: (n) => ({ order_index: n, service_slug: "discovery", slug: "new-offering-" + Date.now(), title: "New offering", tagline: "", published: false }),
  },
  case_studies: {
    table: "case_studies",
    listSel: "#work-list", statusSel: "#work-status", addBtnSel: "#add-case-study",
    order: { column: "order_index", ascending: true }, orderable: true,
    savedMsg: "Saved — live on the homepage now.",
    fields: [
      { name: "image_url", label: "Image", type: "image", full: true },
      { name: "title", label: "Title", type: "input" },
      { name: "category", label: "Category", type: "input" },
      { name: "link_url", label: "Link (optional)", type: "input" },
      { name: "span", label: "Card width", type: "select", options: [["7", "Wide"], ["5", "Narrow"]] },
      { name: "description", label: "Description", type: "textarea", full: true, hint: "Reserved for future case study detail pages." },
    ],
    newRow: (n) => ({ order_index: n, title: "New case study", category: "", image_url: "", link_url: "#contact", span: "5", published: false }),
  },
  insights: {
    table: "insights",
    listSel: "#insights-list", statusSel: "#insights-status", addBtnSel: "#add-insight",
    order: { column: "published_at", ascending: false }, orderable: false,
    savedMsg: "Saved. Hit Publish to rebuild the live pages.",
    fields: [
      { name: "title", label: "Title", type: "input", full: true },
      { name: "slug", label: "URL slug", type: "input", hint: "Lives at /insights/{slug}/" },
      { name: "category", label: "Category", type: "input" },
      { name: "author", label: "Author", type: "input" },
      { name: "published_at", label: "Publish date", type: "date" },
      { name: "excerpt", label: "Excerpt", type: "textarea", full: true, hint: "Short summary for the card & search results." },
      { name: "cover_image", label: "Cover image", type: "image", full: true },
      { name: "body", label: "Article body", type: "markdown", full: true, tall: true, hint: "Markdown. ## heading, - bullet, **bold**, > quote, [text](url)." },
      { name: "seo_title", label: "SEO title", type: "input", full: true, hint: "Browser tab & Google result title. Falls back to the page title." },
      { name: "seo_description", label: "SEO description", type: "textarea", full: true, hint: "~155 characters. Shows in Google results." },
      { name: "og_image", label: "Social share image", type: "image", full: true, hint: "Shown when the page is shared. 1200×630 ideal; falls back to the default share image." },
    ],
    newRow: () => ({ slug: "new-article-" + Date.now(), title: "New article", excerpt: "", body: "", category: "", author: "Gambito", published_at: new Date().toISOString().slice(0, 10), published: false }),
  },
  faqs: {
    table: "faqs",
    listSel: "#faq-list", statusSel: "#faq-status", addBtnSel: "#add-faq",
    order: { column: "order_index", ascending: true }, orderable: true,
    savedMsg: "Saved. Hit Publish to rebuild the live pages.",
    fields: [
      { name: "question", label: "Question", type: "input", full: true },
      { name: "category", label: "Category", type: "input", hint: "Groups questions on the page, e.g. Getting started." },
      { name: "answer", label: "Answer", type: "textarea", full: true },
    ],
    newRow: (n) => ({ order_index: n, question: "New question", answer: "", category: "General", published: true }),
  },
};

const el = (sel) => document.querySelector(sel);
const setStatus = (target, msg, kind) => {
  if (typeof target === "string") target = el(target);
  target.textContent = msg;
  target.className = "panel-status" + (kind ? ` is-${kind}` : "");
};
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
const attr = (s) => String(s ?? "").replace(/"/g, "&quot;");

/* ---------- auth ---------- */
async function checkSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) showApp(); else showLogin();
}
function showLogin() { el("#login-screen").hidden = false; el("#admin-app").hidden = true; }
function showApp() {
  el("#login-screen").hidden = true;
  el("#admin-app").hidden = false;
  initTabs();
  loadContentTab();
  Object.keys(RESOURCES).forEach(loadResource);
  wireAddButtons();
  initBookings();
}

el("#login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = el("#login-email").value.trim();
  const status = el("#login-status");
  const submit = el("#login-submit");
  submit.disabled = true;
  status.className = "login-status";
  status.textContent = "Sending...";
  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin + "/admin/" } });
  submit.disabled = false;
  if (error) { status.textContent = error.message; status.classList.add("is-error"); }
  else status.textContent = "Check your email for a sign-in link.";
});
el("#signout-btn").addEventListener("click", async () => { await supabase.auth.signOut(); showLogin(); });
supabase.auth.onAuthStateChange((_e, session) => { if (session) showApp(); });

/* ---------- tabs ---------- */
function initTabs() {
  document.querySelectorAll(".admin-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".admin-tab").forEach((t) => t.classList.remove("is-active"));
      document.querySelectorAll(".admin-panel").forEach((p) => p.classList.remove("is-active"));
      tab.classList.add("is-active");
      el(`.admin-panel[data-panel="${tab.dataset.tab}"]`).classList.add("is-active");
    });
  });
}

/* ---------- content tab ---------- */
async function loadContentTab() {
  const status = el("#content-status");
  const { data, error } = await supabase.from("site_content").select("key, value");
  if (error) { setStatus(status, error.message, "error"); return; }
  const values = Object.fromEntries(data.map((r) => [r.key, r.value]));
  const groups = {};
  CONTENT_FIELDS.forEach((f) => { (groups[f.group] ||= []).push(f); });
  el("#content-groups").innerHTML = Object.entries(groups).map(([groupName, fields]) => `
    <div class="content-group">
      <h3>${groupName}</h3>
      ${GROUP_INFO[groupName] ? `<p class="group-desc">${GROUP_INFO[groupName]}</p>` : ""}
      ${fields.map((f) => `
        <div class="field${f.type === "media" ? " field-full" : ""}">
          <label for="cf-${f.key}">${f.label}</label>
          ${contentControl(f, values[f.key] ?? "")}
          ${f.hint ? `<div class="field-hint">${f.hint}</div>` : ""}
        </div>`).join("")}
    </div>`).join("");
  wireContentUploads();
}

function contentControl(f, v) {
  if (f.type === "textarea") return `<textarea id="cf-${f.key}" data-key="${f.key}">${esc(v)}</textarea>`;
  if (f.type === "media") return `
    <div class="image-field">
      <video class="image-preview" data-role="preview" src="${attr(v)}" muted playsinline preload="metadata"></video>
      <div class="image-field-controls">
        <input id="cf-${f.key}" data-key="${f.key}" value="${attr(v)}" placeholder="Paste a video URL" />
        <input type="file" accept="video/*" data-role="content-upload" />
      </div>
    </div>`;
  return `<input id="cf-${f.key}" data-key="${f.key}" value="${attr(v)}" />`;
}

// upload handler for "media" fields on the Content tab (mirrors the image
// uploader used on resource cards, but writes into a plain URL input)
function wireContentUploads() {
  document.querySelectorAll('#content-groups [data-role="content-upload"]').forEach((fileInput) => {
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files[0];
      if (!file) return;
      const wrap = fileInput.closest(".image-field");
      const urlInput = wrap.querySelector("[data-key]");
      setStatus("#content-status", `Uploading ${file.name}…`);
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const path = `media/${Date.now()}-${safe}`;
      const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, file, { upsert: true, contentType: file.type });
      if (error) { setStatus("#content-status", error.message, "error"); return; }
      const { data: pub } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
      urlInput.value = pub.publicUrl;
      const preview = wrap.querySelector('[data-role="preview"]');
      if (preview) preview.src = pub.publicUrl;
      setStatus("#content-status", "Uploaded — click Save changes to apply.", "success");
    });
  });
}
el("#save-content").addEventListener("click", async () => {
  const btn = el("#save-content");
  btn.disabled = true;
  setStatus("#content-status", "Saving...");
  const rows = [...document.querySelectorAll("#content-groups [data-key]")].map((i) => ({ key: i.dataset.key, value: i.value }));
  const { error } = await supabase.from("site_content").upsert(rows, { onConflict: "key" });
  btn.disabled = false;
  if (error) setStatus("#content-status", error.message, "error");
  else setStatus("#content-status", "Saved — live on the homepage now.", "success");
});

/* ---------- generic resource CRUD ---------- */
async function loadResource(key) {
  const cfg = RESOURCES[key];
  const { data, error } = await supabase.from(cfg.table).select("*").order(cfg.order.column, { ascending: cfg.order.ascending });
  if (error) { setStatus(cfg.statusSel, error.message, "error"); return; }
  renderList(key, data || []);
}

function fieldHtml(f, row) {
  const v = row[f.name];
  const cls = f.full ? "field field-full" : "field";
  let control;
  if (f.type === "textarea") control = `<textarea data-field="${f.name}">${esc(v)}</textarea>`;
  else if (f.type === "markdown") control = `<textarea data-field="${f.name}" class="mono${f.tall ? " tall" : ""}">${esc(v)}</textarea>`;
  else if (f.type === "json") control = `<textarea data-field="${f.name}" data-json="1" class="mono tall">${esc(JSON.stringify(v ?? [], null, 2))}</textarea>`;
  else if (f.type === "date") control = `<input type="date" data-field="${f.name}" value="${attr((v || "").slice(0, 10))}" />`;
  else if (f.type === "select") control = `<select data-field="${f.name}">${f.options.map(([val, lab]) => `<option value="${val}" ${String(v) === val ? "selected" : ""}>${lab}</option>`).join("")}</select>`;
  else if (f.type === "image") control = `
      <div class="image-field">
        <img class="image-preview" src="${attr(v)}" data-role="preview" alt="" />
        <div class="image-field-controls">
          <input type="file" accept="image/*" data-role="upload" />
          <input data-field="${f.name}" value="${attr(v)}" placeholder="or paste an image URL" />
        </div>
      </div>`;
  else control = `<input data-field="${f.name}" value="${attr(v)}" />`;
  return `<div class="${cls}"><label>${f.label}</label>${control}${f.hint ? `<div class="field-hint">${f.hint}</div>` : ""}</div>`;
}

function renderList(key, rows) {
  const cfg = RESOURCES[key];
  el(cfg.listSel).innerHTML = rows.map((r, i) => `
    <div class="edit-card" data-id="${r.id}">
      <div class="edit-card-top">
        <div class="edit-card-order">
          ${cfg.orderable ? `<button class="icon-btn" data-action="up" ${i === 0 ? "disabled" : ""}>↑</button>
          <button class="icon-btn" data-action="down" ${i === rows.length - 1 ? "disabled" : ""}>↓</button>` : ""}
        </div>
        <div class="edit-card-actions">
          <label class="publish-toggle"><input type="checkbox" data-field="published" ${r.published ? "checked" : ""} /> Published</label>
          <button class="btn btn-ghost btn-small" data-action="save"><span>Save</span></button>
          <button class="btn btn-danger btn-small" data-action="delete"><span>Delete</span></button>
        </div>
      </div>
      <div class="edit-card-grid">
        ${cfg.fields.map((f) => fieldHtml(f, r)).join("")}
      </div>
    </div>`).join("");
  wireCards(key, rows);
}

function wireCards(key, rows) {
  const cfg = RESOURCES[key];
  el(cfg.listSel).querySelectorAll(".edit-card").forEach((card, i) => {
    const id = card.dataset.id;

    card.querySelector('[data-action="save"]').addEventListener("click", async () => {
      const patch = {};
      let jsonError = null;
      card.querySelectorAll("[data-field]").forEach((input) => {
        if (input.dataset.json) {
          const raw = input.value.trim();
          try { patch[input.dataset.field] = raw ? JSON.parse(raw) : []; }
          catch { jsonError = input.dataset.field; }
        } else {
          patch[input.dataset.field] = input.type === "checkbox" ? input.checked : input.value;
        }
      });
      if (jsonError) { setStatus(cfg.statusSel, `Invalid JSON in "${jsonError}" — check the brackets and quotes.`, "error"); return; }
      setStatus(cfg.statusSel, "Saving...");
      const { error } = await supabase.from(cfg.table).update(patch).eq("id", id);
      if (error) setStatus(cfg.statusSel, error.message, "error");
      else setStatus(cfg.statusSel, cfg.savedMsg, "success");
    });

    card.querySelector('[data-action="delete"]').addEventListener("click", async () => {
      if (!confirm("Delete this? This can't be undone.")) return;
      const { error } = await supabase.from(cfg.table).delete().eq("id", id);
      if (error) setStatus(cfg.statusSel, error.message, "error"); else loadResource(key);
    });

    if (cfg.orderable) {
      card.querySelector('[data-action="up"]')?.addEventListener("click", () => swapOrder(key, rows, i, i - 1));
      card.querySelector('[data-action="down"]')?.addEventListener("click", () => swapOrder(key, rows, i, i + 1));
    }

    card.querySelectorAll('[data-role="upload"]').forEach((fileInput) => {
      fileInput.addEventListener("change", async () => {
        const file = fileInput.files[0];
        if (!file) return;
        setStatus(cfg.statusSel, "Uploading image...");
        const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const path = `${key}/${id}-${Date.now()}-${safe}`;
        const { error: upErr } = await supabase.storage.from(IMAGE_BUCKET).upload(path, file, { upsert: true });
        if (upErr) { setStatus(cfg.statusSel, upErr.message, "error"); return; }
        const { data: pub } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
        const wrap = fileInput.closest(".image-field");
        wrap.querySelector("[data-field]").value = pub.publicUrl;
        wrap.querySelector('[data-role="preview"]').src = pub.publicUrl;
        setStatus(cfg.statusSel, "Image uploaded — click Save to apply.", "success");
      });
    });
  });
}

async function swapOrder(key, rows, i, j) {
  const cfg = RESOURCES[key];
  const a = rows[i], b = rows[j];
  if (!a || !b) return;
  setStatus(cfg.statusSel, "Reordering...");
  const [{ error: e1 }, { error: e2 }] = await Promise.all([
    supabase.from(cfg.table).update({ order_index: b.order_index }).eq("id", a.id),
    supabase.from(cfg.table).update({ order_index: a.order_index }).eq("id", b.id),
  ]);
  if (e1 || e2) setStatus(cfg.statusSel, (e1 || e2).message, "error"); else loadResource(key);
}

function wireAddButtons() {
  Object.entries(RESOURCES).forEach(([key, cfg]) => {
    const btn = el(cfg.addBtnSel);
    if (!btn || btn.dataset.wired) return;
    btn.dataset.wired = "1";
    btn.addEventListener("click", async () => {
      let next = 1;
      if (cfg.orderable) {
        const { data } = await supabase.from(cfg.table).select("order_index").order("order_index", { ascending: false }).limit(1);
        next = (data?.[0]?.order_index ?? 0) + 1;
      }
      const { error } = await supabase.from(cfg.table).insert(cfg.newRow(next));
      if (error) setStatus(cfg.statusSel, error.message, "error"); else loadResource(key);
    });
  });
}

/* ---------- publish (trigger Netlify rebuild) ---------- */
el("#publish-btn").addEventListener("click", async () => {
  const btn = el("#publish-btn");
  const { data } = await supabase.from("site_content").select("value").eq("key", "netlify_build_hook").maybeSingle();
  const hook = data?.value?.trim();
  if (!hook) {
    alert("No build hook set yet.\n\nAdd your Netlify build hook URL under Content → Deployment, then Publish will rebuild the site.");
    return;
  }
  btn.disabled = true;
  const original = btn.textContent;
  btn.textContent = "Publishing…";
  try {
    await fetch(hook, { method: "POST", mode: "no-cors" });
    btn.textContent = "Build started ✓";
    setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 4000);
  } catch (err) {
    btn.textContent = original;
    btn.disabled = false;
    alert("Could not trigger the build: " + err.message);
  }
});

/* ---------- bookings & availability ---------- */
let bookingsWired = false;
const bStatus = "#bookings-status";
const fmtDayLocal = (d) => d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
const fmtTimeLocal = (d) => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

function initBookings() {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  el("#book-tz-label").textContent = `Times are in your timezone (${tz}).`;
  const today = new Date();
  const plus = new Date(); plus.setDate(plus.getDate() + 14);
  el("#gen-from").value = today.toISOString().slice(0, 10);
  el("#gen-to").value = plus.toISOString().slice(0, 10);
  el("#oneoff-date").value = today.toISOString().slice(0, 10);
  el("#gen-dur").value = "30";

  if (!bookingsWired) {
    bookingsWired = true;
    el("#gen-slots").addEventListener("click", generateSlots);
    el("#add-oneoff").addEventListener("click", addOneoff);
  }
  loadSlotsAdmin();
  loadBookingsAdmin();
}

function localSlot(dateStr, timeStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0); // interpreted in admin's local timezone
}

async function generateSlots() {
  const from = el("#gen-from").value, to = el("#gen-to").value;
  const start = el("#gen-start").value, end = el("#gen-end").value;
  const dur = Math.max(10, parseInt(el("#gen-dur").value, 10) || 30);
  const days = [...document.querySelectorAll("#gen-days input:checked")].map((c) => Number(c.value));
  if (!from || !to || !start || !end || !days.length) { setStatus(bStatus, "Fill in the date range, days and times.", "error"); return; }

  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const startMin = sh * 60 + sm, endMin = eh * 60 + em;
  if (endMin <= startMin) { setStatus(bStatus, "End time must be after start time.", "error"); return; }

  const now = Date.now();
  const rows = [];
  const cur = localSlot(from, "00:00");
  const last = localSlot(to, "00:00");
  while (cur <= last) {
    if (days.includes(cur.getDay())) {
      for (let mins = startMin; mins + dur <= endMin; mins += dur) {
        const s = new Date(cur); s.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
        if (s.getTime() > now) rows.push({ start_time: s.toISOString(), duration_minutes: dur });
      }
    }
    cur.setDate(cur.getDate() + 1);
  }
  if (!rows.length) { setStatus(bStatus, "No future slots fell in that range.", "error"); return; }

  el("#gen-slots").disabled = true;
  setStatus(bStatus, `Adding ${rows.length} slots…`);
  const { error } = await supabase.from("booking_slots").upsert(rows, { onConflict: "start_time", ignoreDuplicates: true });
  el("#gen-slots").disabled = false;
  if (error) { setStatus(bStatus, error.message, "error"); return; }
  setStatus(bStatus, `Added availability (${rows.length} slots requested; duplicates skipped).`, "success");
  loadSlotsAdmin();
}

async function addOneoff() {
  const date = el("#oneoff-date").value, time = el("#oneoff-time").value;
  if (!date || !time) { setStatus(bStatus, "Pick a date and time for the slot.", "error"); return; }
  const s = localSlot(date, time);
  if (s.getTime() <= Date.now()) { setStatus(bStatus, "That time is in the past.", "error"); return; }
  const dur = Math.max(10, parseInt(el("#gen-dur").value, 10) || 30);
  const { error } = await supabase.from("booking_slots").upsert([{ start_time: s.toISOString(), duration_minutes: dur }], { onConflict: "start_time", ignoreDuplicates: true });
  if (error) { setStatus(bStatus, error.message, "error"); return; }
  setStatus(bStatus, "Slot added.", "success");
  loadSlotsAdmin();
}

async function loadSlotsAdmin() {
  const { data, error } = await supabase.from("booking_slots").select("*").gt("start_time", new Date().toISOString()).order("start_time");
  if (error) { setStatus(bStatus, error.message, "error"); return; }
  const box = el("#slots-list");
  if (!data.length) { box.innerHTML = `<p class="slots-empty">No upcoming slots yet. Generate some availability on the left.</p>`; return; }
  const groups = new Map();
  for (const s of data) { const k = new Date(s.start_time).toDateString(); (groups.get(k) || groups.set(k, []).get(k)).push(s); }
  box.innerHTML = [...groups.values()].map((day) => {
    const title = fmtDayLocal(new Date(day[0].start_time));
    const chips = day.map((s) => {
      const t = fmtTimeLocal(new Date(s.start_time));
      if (s.status === "booked") return `<span class="slot-chip booked">${t} <span class="tag">booked</span></span>`;
      return `<span class="slot-chip">${t} <button class="x" data-del="${s.id}" title="Remove">×</button></span>`;
    }).join("");
    return `<div><div class="slots-admin-day-title">${title}</div><div class="slots-admin-row">${chips}</div></div>`;
  }).join("");
  box.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", async () => {
    const { error } = await supabase.from("booking_slots").delete().eq("id", b.dataset.del).eq("status", "available");
    if (error) setStatus(bStatus, error.message, "error"); else loadSlotsAdmin();
  }));
}

async function loadBookingsAdmin() {
  const { data, error } = await supabase.from("bookings").select("*").gte("start_time", new Date(Date.now() - 3600e3).toISOString()).order("start_time");
  if (error) { setStatus(bStatus, error.message, "error"); return; }
  const box = el("#bookings-list");
  if (!data.length) { box.innerHTML = `<p class="bookings-empty">No upcoming bookings yet.</p>`; return; }
  box.innerHTML = data.map((b) => {
    const d = new Date(b.start_time);
    return `<div class="booking-row">
      <div class="when">${fmtDayLocal(d)}<br />${fmtTimeLocal(d)}</div>
      <div class="who"><span class="name">${esc(b.name)}</span>${b.company ? " · " + esc(b.company) : ""}<br /><a href="mailto:${esc(b.email)}">${esc(b.email)}</a></div>
      ${b.notes ? `<div class="notes">${esc(b.notes)}</div>` : ""}
    </div>`;
  }).join("");
}

checkSession();
