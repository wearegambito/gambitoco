import { supabase } from "../src/supabase.js";

/* ---------- field config for the Content tab ---------- */
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
  { group: "SEO", key: "meta_title", label: "Page title", type: "input" },
  { group: "SEO", key: "meta_description", label: "Meta description", type: "textarea" },
];

const ADMIN_EMAIL = "armic@gambito.co.nz";

const el = (sel) => document.querySelector(sel);
const setStatus = (target, msg, kind) => {
  target.textContent = msg;
  target.className = "panel-status" + (kind ? ` is-${kind}` : "");
};

/* ---------- auth ---------- */
async function checkSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) showApp();
  else showLogin();
}

function showLogin() {
  el("#login-screen").hidden = false;
  el("#admin-app").hidden = true;
}

function showApp() {
  el("#login-screen").hidden = true;
  el("#admin-app").hidden = false;
  initTabs();
  loadContentTab();
  loadServicesTab();
  loadWorkTab();
}

el("#login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = el("#login-email").value.trim();
  const status = el("#login-status");
  const submit = el("#login-submit");
  submit.disabled = true;
  status.className = "login-status";
  status.textContent = "Sending...";
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin + "/admin/" },
  });
  submit.disabled = false;
  if (error) {
    status.textContent = error.message;
    status.classList.add("is-error");
  } else {
    status.textContent = "Check your email for a sign-in link.";
  }
});

el("#signout-btn").addEventListener("click", async () => {
  await supabase.auth.signOut();
  showLogin();
});

supabase.auth.onAuthStateChange((_event, session) => {
  if (session) showApp();
});

/* ---------- tabs ---------- */
function initTabs() {
  document.querySelectorAll(".admin-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".admin-tab").forEach((t) => t.classList.remove("is-active"));
      document.querySelectorAll(".admin-panel").forEach((p) => p.classList.remove("is-active"));
      tab.classList.add("is-active");
      document.querySelector(`.admin-panel[data-panel="${tab.dataset.tab}"]`).classList.add("is-active");
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

  el("#content-groups").innerHTML = Object.entries(groups)
    .map(
      ([groupName, fields]) => `
      <div class="content-group">
        <h3>${groupName}</h3>
        ${fields
          .map(
            (f) => `
          <div class="field">
            <label for="cf-${f.key}">${f.label}</label>
            ${f.type === "textarea"
              ? `<textarea id="cf-${f.key}" data-key="${f.key}">${values[f.key] ?? ""}</textarea>`
              : `<input id="cf-${f.key}" data-key="${f.key}" value="${(values[f.key] ?? "").replace(/"/g, "&quot;")}" />`}
            ${f.hint ? `<div class="field-hint">${f.hint}</div>` : ""}
          </div>`
          )
          .join("")}
      </div>`
    )
    .join("");
}

el("#save-content").addEventListener("click", async () => {
  const status = el("#content-status");
  const btn = el("#save-content");
  btn.disabled = true;
  setStatus(status, "Saving...");
  const rows = [...document.querySelectorAll("#content-groups [data-key]")].map((input) => ({
    key: input.dataset.key,
    value: input.value,
  }));
  const { error } = await supabase.from("site_content").upsert(rows, { onConflict: "key" });
  btn.disabled = false;
  if (error) setStatus(status, error.message, "error");
  else setStatus(status, "Saved. Refresh the live site to see changes.", "success");
});

/* ---------- services tab ---------- */
async function loadServicesTab() {
  const status = el("#services-status");
  const { data, error } = await supabase.from("services").select("*").order("order_index");
  if (error) { setStatus(status, error.message, "error"); return; }
  renderServicesList(data);
}

function renderServicesList(rows) {
  el("#services-list").innerHTML = rows
    .map(
      (r, i) => `
    <div class="edit-card" data-id="${r.id}">
      <div class="edit-card-top">
        <div class="edit-card-order">
          <button class="icon-btn" data-action="up" ${i === 0 ? "disabled" : ""}>↑</button>
          <button class="icon-btn" data-action="down" ${i === rows.length - 1 ? "disabled" : ""}>↓</button>
        </div>
        <div class="edit-card-actions">
          <label class="publish-toggle"><input type="checkbox" data-field="published" ${r.published ? "checked" : ""} /> Published</label>
          <button class="btn btn-ghost btn-small" data-action="save"><span>Save</span></button>
          <button class="btn btn-danger btn-small" data-action="delete"><span>Delete</span></button>
        </div>
      </div>
      <div class="edit-card-grid">
        <div class="field"><label>Number</label><input data-field="number" value="${esc(r.number)}" /></div>
        <div class="field"><label>Title</label><input data-field="title" value="${esc(r.title)}" /></div>
        <div class="field field-full"><label>Description</label><textarea data-field="description">${esc(r.description)}</textarea></div>
        <div class="field field-full"><label>Tag line</label><input data-field="tag" value="${esc(r.tag)}" /></div>
      </div>
    </div>`
    )
    .join("");
  wireCardList(el("#services-list"), "services", rows, el("#services-status"));
}

el("#add-service").addEventListener("click", async () => {
  const status = el("#services-status");
  const { data: existing } = await supabase.from("services").select("order_index").order("order_index", { ascending: false }).limit(1);
  const nextOrder = (existing?.[0]?.order_index ?? 0) + 1;
  const { error } = await supabase.from("services").insert({
    order_index: nextOrder, number: String(nextOrder).padStart(2, "0"), title: "New service", description: "", tag: "",
  });
  if (error) setStatus(status, error.message, "error");
  else loadServicesTab();
});

/* ---------- work / case studies tab ---------- */
async function loadWorkTab() {
  const status = el("#work-status");
  const { data, error } = await supabase.from("case_studies").select("*").order("order_index");
  if (error) { setStatus(status, error.message, "error"); return; }
  renderWorkList(data);
}

function renderWorkList(rows) {
  el("#work-list").innerHTML = rows
    .map(
      (r, i) => `
    <div class="edit-card" data-id="${r.id}">
      <div class="edit-card-top">
        <div class="edit-card-order">
          <button class="icon-btn" data-action="up" ${i === 0 ? "disabled" : ""}>↑</button>
          <button class="icon-btn" data-action="down" ${i === rows.length - 1 ? "disabled" : ""}>↓</button>
        </div>
        <div class="edit-card-actions">
          <label class="publish-toggle"><input type="checkbox" data-field="published" ${r.published ? "checked" : ""} /> Published</label>
          <button class="btn btn-ghost btn-small" data-action="save"><span>Save</span></button>
          <button class="btn btn-danger btn-small" data-action="delete"><span>Delete</span></button>
        </div>
      </div>
      <div class="edit-card-grid">
        <div class="field field-full">
          <label>Image</label>
          <div class="image-field">
            <img class="image-preview" src="${esc(r.image_url)}" data-role="preview" />
            <div class="image-field-controls">
              <input type="file" accept="image/*" data-role="upload" />
              <input data-field="image_url" value="${esc(r.image_url)}" placeholder="or paste an image URL" />
            </div>
          </div>
        </div>
        <div class="field"><label>Title</label><input data-field="title" value="${esc(r.title)}" /></div>
        <div class="field"><label>Category</label><input data-field="category" value="${esc(r.category)}" /></div>
        <div class="field"><label>Link (optional)</label><input data-field="link_url" value="${esc(r.link_url)}" /></div>
        <div class="field">
          <label>Card width</label>
          <select data-field="span">
            <option value="7" ${r.span === "7" ? "selected" : ""}>Wide</option>
            <option value="5" ${r.span === "5" ? "selected" : ""}>Narrow</option>
          </select>
        </div>
        <div class="field field-full">
          <label>Description</label>
          <textarea data-field="description">${esc(r.description)}</textarea>
          <div class="field-hint">Not shown on the homepage yet — reserved for future case study detail pages.</div>
        </div>
      </div>
    </div>`
    )
    .join("");
  wireCardList(el("#work-list"), "case_studies", rows, el("#work-status"), true);
}

el("#add-case-study").addEventListener("click", async () => {
  const status = el("#work-status");
  const { data: existing } = await supabase.from("case_studies").select("order_index").order("order_index", { ascending: false }).limit(1);
  const nextOrder = (existing?.[0]?.order_index ?? 0) + 1;
  const { error } = await supabase.from("case_studies").insert({
    order_index: nextOrder, title: "New case study", category: "", image_url: "", link_url: "#contact", span: "5",
  });
  if (error) setStatus(status, error.message, "error");
  else loadWorkTab();
});

/* ---------- shared card-list wiring (save / delete / reorder / upload) ---------- */
function wireCardList(container, table, rows, status, hasImageUpload) {
  container.querySelectorAll(".edit-card").forEach((card, i) => {
    const id = card.dataset.id;

    card.querySelector('[data-action="save"]').addEventListener("click", async () => {
      const patch = {};
      card.querySelectorAll("[data-field]").forEach((input) => {
        patch[input.dataset.field] = input.type === "checkbox" ? input.checked : input.value;
      });
      setStatus(status, "Saving...");
      const { error } = await supabase.from(table).update(patch).eq("id", id);
      if (error) setStatus(status, error.message, "error");
      else setStatus(status, "Saved. Refresh the live site to see changes.", "success");
    });

    card.querySelector('[data-action="delete"]').addEventListener("click", async () => {
      if (!confirm("Delete this? This can't be undone.")) return;
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) setStatus(status, error.message, "error");
      else (table === "services" ? loadServicesTab() : loadWorkTab());
    });

    const upBtn = card.querySelector('[data-action="up"]');
    const downBtn = card.querySelector('[data-action="down"]');
    if (upBtn) upBtn.addEventListener("click", () => swapOrder(table, rows, i, i - 1, status));
    if (downBtn) downBtn.addEventListener("click", () => swapOrder(table, rows, i, i + 1, status));

    if (hasImageUpload) {
      const fileInput = card.querySelector('[data-role="upload"]');
      fileInput.addEventListener("change", async () => {
        const file = fileInput.files[0];
        if (!file) return;
        setStatus(status, "Uploading image...");
        const path = `${id}-${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("case-studies").upload(path, file, { upsert: true });
        if (upErr) { setStatus(status, upErr.message, "error"); return; }
        const { data: pub } = supabase.storage.from("case-studies").getPublicUrl(path);
        card.querySelector('[data-field="image_url"]').value = pub.publicUrl;
        card.querySelector('[data-role="preview"]').src = pub.publicUrl;
        setStatus(status, "Image uploaded — click Save to apply.", "success");
      });
    }
  });
}

async function swapOrder(table, rows, i, j, status) {
  const a = rows[i], b = rows[j];
  setStatus(status, "Reordering...");
  const [{ error: e1 }, { error: e2 }] = await Promise.all([
    supabase.from(table).update({ order_index: b.order_index }).eq("id", a.id),
    supabase.from(table).update({ order_index: a.order_index }).eq("id", b.id),
  ]);
  if (e1 || e2) setStatus(status, (e1 || e2).message, "error");
  else (table === "services" ? loadServicesTab() : loadWorkTab());
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

checkSession();
