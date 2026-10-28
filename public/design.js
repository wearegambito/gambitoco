/* Design service page (/design) — form, FAQ accordion, smooth scroll.
   No tracking pixels (deferred); UTM params are still captured into the
   stored lead so the source of each inquiry is known. */
(function () {
  const SUPABASE_URL = "https://wtzklaumnzezgzgzllgn.supabase.co";

  /* ---------- smooth scroll for in-page anchors ---------- */
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  /* ---------- FAQ accordion (keyboard-operable) ---------- */
  document.querySelectorAll(".dz-faq-item").forEach((item) => {
    const q = item.querySelector(".dz-faq-q");
    const a = item.querySelector(".dz-faq-a");
    if (!q || !a) return;
    q.addEventListener("click", () => {
      const open = item.classList.toggle("is-open");
      q.setAttribute("aria-expanded", open ? "true" : "false");
      a.style.maxHeight = open ? a.scrollHeight + "px" : "0";
    });
  });

  /* ---------- multi-select chips (needs) ---------- */
  document.querySelectorAll(".dz-check input").forEach((input) => {
    const sync = () => input.closest(".dz-check")?.classList.toggle("is-checked", input.checked);
    input.addEventListener("change", sync);
    sync();
  });

  /* ---------- lead form ---------- */
  const form = document.getElementById("dz-lead-form");
  if (!form) return;
  const statusEl = document.getElementById("dz-form-status");
  const submit = document.getElementById("dz-form-submit");
  const card = document.getElementById("dz-form-card");

  const params = new URLSearchParams(location.search);
  const meta = {
    utm_source: params.get("utm_source") || "",
    utm_medium: params.get("utm_medium") || "",
    utm_campaign: params.get("utm_campaign") || "",
    utm_content: params.get("utm_content") || "",
    fbclid: params.get("fbclid") || "",
    page_url: location.href,
    timestamp: new Date().toISOString(),
  };

  function setStatus(msg, kind) {
    statusEl.textContent = msg || "";
    statusEl.className = "dz-form-status" + (kind ? " is-" + kind : "");
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      whatsapp: form.whatsapp.value.trim(),
      business: form.business.value.trim(),
      stage: form.stage.value,
      needs: [...form.querySelectorAll('input[name="needs"]:checked')].map((c) => c.value),
      budget: form.budget.value,
      message: form.message.value.trim(),
      hp: form.company_website.value, // honeypot
      meta,
    };

    if (!data.name || !data.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) {
      setStatus("Please add your name and a valid email.", "error");
      return;
    }
    if (!data.stage) { setStatus("Let me know what stage you're at.", "error"); return; }
    if (!data.needs.length) { setStatus("Pick at least one thing you need.", "error"); return; }
    if (!data.budget) { setStatus("Choose a budget range.", "error"); return; }

    const label = submit.textContent;
    submit.disabled = true;
    submit.textContent = "Sending…";
    setStatus("");

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/design-lead`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || out.ok === false) throw new Error(out.error || `HTTP ${res.status}`);

      const bookingUrl = card.dataset.booking || "/book/";
      const replyText = card.dataset.reply || "within an hour";
      card.innerHTML = `
        <div class="dz-form-success">
          <h3>Thanks ${escapeHtml(data.name.split(" ")[0] || "")}, got it.</h3>
          <p>I'll reply personally ${escapeHtml(replyText)}. Want to skip the wait? Book a 20-minute call.</p>
          <a class="dz-btn dz-btn--solid dz-btn--block" href="${escapeAttr(bookingUrl)}">Book a 20-minute call</a>
        </div>`;
      card.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (err) {
      submit.disabled = false;
      submit.textContent = label;
      setStatus("Something went wrong: " + err.message + " Please try again, or email hello@gambito.co.", "error");
    }
  });

  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
  function escapeAttr(s) { return String(s).replace(/"/g, "&quot;"); }
})();
