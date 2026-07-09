import { supabase } from "../src/supabase.js";

const ADMIN_EMAIL = "armic@gambito.co.nz";
const IMAGE_BUCKET = "case-studies"; // shared image bucket for all uploads

/* ---------- site content (homepage, live-fetch) ---------- */
const CONTENT_FIELDS = [
  { group: "Navigation", key: "nav_cta", label: "Nav button", type: "input" },
  { group: "Hero", key: "hero_eyebrow", label: "Eyebrow line", type: "input" },
  { group: "Hero", key: "hero_title_1", label: "Headline — line 1", type: "input" },
  { group: "Hero", key: "hero_title_2", label: "Headline — line 2", type: "input", hint: "HTML allowed, e.g. wrap a word in <em>...</em> for the italic accent." },
  { group: "Hero", key: "hero_sub", label: "Subheading", type: "textarea" },
  { group: "Hero", key: "hero_cta_primary", label: "Primary button", type: "input" },
  { group: "Hero", key: "hero_cta_secondary", label: "Secondary button", type: "input" },
  { group: "Story", key: "story_text", label: "Story paragraph", type: "textarea", hint: "HTML allowed, e.g. <em>...</em> for the coral emphasis word." },
  { group: "Services section", key: "services_title", label: "Heading", type: "input" },
  { group: "Services section", key: "services_lede", label: "Lede", type: "textarea" },
  { group: "Work section", key: "work_title", label: "Heading", type: "input" },
  { group: "Work section", key: "work_lede", label: "Lede", type: "textarea" },
  { group: "Call to action", key: "cta_title_1", label: "Headline — line 1", type: "input" },
  { group: "Call to action", key: "cta_title_2", label: "Headline — line 2", type: "input", hint: "HTML allowed, e.g. <em>...</em>." },
  { group: "Call to action", key: "cta_sub", label: "Subtext", type: "textarea" },
  { group: "Call to action", key: "cta_button", label: "Button label", type: "input" },
  { group: "Call to action", key: "cta_button_link", label: "Button link", type: "input", hint: "e.g. mailto:hello@gambito.co" },
  { group: "Footer", key: "footer_address", label: "Studio address", type: "textarea", hint: "HTML allowed, e.g. <br /> for line breaks." },
  { group: "Footer", key: "footer_email", label: "Email", type: "input" },
  { group: "Footer", key: "footer_phone", label: "Phone", type: "input" },
  { group: "Footer", key: "footer_linkedin_url", label: "LinkedIn URL", type: "input" },
  { group: "Footer", key: "footer_instagram_url", label: "Instagram URL", type: "input" },
  { group: "Footer", key: "footer_definition", label: "\"Gambito\" definition", type: "input" },
  { group: "Footer", key: "footer_copyright", label: "Copyright line", type: "input" },
  { group: "Footer", key: "footer_tagline", label: "Tagline", type: "input" },
  { group: "SEO & social", key: "meta_title", label: "Homepage title tag", type: "input" },
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
      { name: "slug", label: "URL slug", type: "input", hint: "Page lives at /services/<slug>/" },
      { name: "tag", label: "Tag line", type: "input" },
      { name: "description", label: "Card description (homepage)", type: "textarea", full: true },
      { name: "body", label: "Detail page content", type: "markdown", full: true, hint: "Markdown. Use ## for headings, - for bullets, **bold**." },
      { name: "hero_image", label: "Hero image", type: "image", full: true },
      { name: "seo_title", label: "SEO title", type: "input", full: true },
      { name: "seo_description", label: "SEO description", type: "textarea", full: true },
    ],
    newRow: (n) => ({ order_index: n, number: String(n).padStart(2, "0"), title: "New service", slug: "new-service-" + Date.now(), description: "", tag: "", body: "", published: false }),
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
      { name: "slug", label: "URL slug", type: "input", hint: "Lives at /insights/<slug>/" },
      { name: "category", label: "Category", type: "input" },
      { name: "author", label: "Author", type: "input" },
      { name: "published_at", label: "Publish date", type: "date" },
      { name: "excerpt", label: "Excerpt", type: "textarea", full: true, hint: "Short summary for the card & search results." },
      { name: "cover_image", label: "Cover image", type: "image", full: true },
      { name: "body", label: "Article body", type: "markdown", full: true, tall: true, hint: "Markdown. ## heading, - bullet, **bold**, > quote, [text](url)." },
      { name: "seo_title", label: "SEO title", type: "input", full: true },
      { name: "seo_description", label: "SEO description", type: "textarea", full: true },
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
      ${fields.map((f) => `
        <div class="field">
          <label for="cf-${f.key}">${f.label}</label>
          ${f.type === "textarea"
            ? `<textarea id="cf-${f.key}" data-key="${f.key}">${esc(values[f.key] ?? "")}</textarea>`
            : `<input id="cf-${f.key}" data-key="${f.key}" value="${attr(values[f.key] ?? "")}" />`}
          ${f.hint ? `<div class="field-hint">${f.hint}</div>` : ""}
        </div>`).join("")}
    </div>`).join("");
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
      card.querySelectorAll("[data-field]").forEach((input) => {
        patch[input.dataset.field] = input.type === "checkbox" ? input.checked : input.value;
      });
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

checkSession();
