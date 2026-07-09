// Mobile menu toggle for the static (non-homepage) pages, which don't load
// the homepage's main.js. Mirrors that header's behaviour so the nav is
// identical everywhere.
(function () {
  var toggle = document.getElementById("nav-toggle");
  var menu = document.getElementById("mobile-menu");
  if (!toggle || !menu) return;
  function set(open) {
    toggle.classList.toggle("is-open", open);
    menu.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    menu.setAttribute("aria-hidden", String(!open));
    document.body.style.overflow = open ? "hidden" : "";
  }
  toggle.addEventListener("click", function () {
    set(!menu.classList.contains("is-open"));
  });
  menu.querySelectorAll("a").forEach(function (a) {
    a.addEventListener("click", function () { set(false); });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") set(false);
  });
})();
