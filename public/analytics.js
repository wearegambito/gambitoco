/* Gambito analytics — loaded site-wide via <script src="/analytics.js" defer>.
 *
 * One place to configure tracking. PostHog is our core (privacy-friendly,
 * cookieless; powers events, funnels and A/B experiments). Google Tag Manager
 * is the container for the ad pixels (GA4, Meta Pixel, Google Ads) so those are
 * managed in the GTM dashboard without code changes.
 *
 * These IDs are PUBLIC (client-side), safe to commit — same as the Supabase
 * publishable key. Fill them in to go live; until then this file no-ops with
 * no console noise or failed requests.
 *
 * Usage anywhere: window.gambitoTrack("cta_click", { location: "hero" })
 *   -> sends to PostHog AND pushes to the GTM dataLayer.
 */
(function () {
  var CONFIG = {
    // PostHog project API key (phc_… is a public client-side key by design).
    POSTHOG_KEY: "phc_mSX9TtXfRa6Wi4q84fNj3qsZNrhYMbALKGTKAdqmiGUu",
    // "https://us.i.posthog.com" (US cloud) or "https://eu.i.posthog.com" (EU).
    // NOTE: defaulting to US — switch to eu.i.posthog.com if the project is EU-hosted.
    POSTHOG_HOST: "https://us.i.posthog.com",
    // Google Tag Manager container id, e.g. "GTM-XXXXXXX".
    GTM_ID: "REPLACE_GTM_ID",
  };

  var hasPosthog = CONFIG.POSTHOG_KEY && CONFIG.POSTHOG_KEY.indexOf("REPLACE_") !== 0;
  var hasGtm = CONFIG.GTM_ID && CONFIG.GTM_ID.indexOf("REPLACE_") !== 0;

  // Always define the tracking helper so page code can call it unconditionally;
  // it just no-ops on whatever isn't configured yet.
  window.dataLayer = window.dataLayer || [];
  window.gambitoTrack = function (event, props) {
    props = props || {};
    try { if (window.posthog && window.posthog.capture) window.posthog.capture(event, props); } catch (e) {}
    try { window.dataLayer.push(Object.assign({ event: event }, props)); } catch (e) {}
  };

  // --- PostHog (cookieless) ---
  if (hasPosthog) {
    // Standard PostHog loader stub (queues calls until the library loads).
    !function (t, e) { var o, n, p, r; e.__SV || (window.posthog = e, e._i = [], e.init = function (i, s, a) { function g(t, e) { var o = e.split("."); 2 == o.length && (t = t[o[0]], e = o[1]), t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))) } } (p = t.createElement("script")).type = "text/javascript", p.crossOrigin = "anonymous", p.async = !0, p.src = s.api_host.replace(".i.posthog.com", "-assets.i.posthog.com") + "/static/array.js", (r = t.getElementsByTagName("script")[0]).parentNode.insertBefore(p, r); var u = e; for (void 0 !== a ? u = e[a] = [] : a = "posthog", u.people = u.people || [], u.toString = function (t) { var e = "posthog"; return "posthog" !== a && (e += "." + a), t || (e += " (stub)"), e }, u.people.toString = function () { return u.toString(1) + ".people (stub)" }, o = "init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug getPageViewId captureTraceFeedback captureTraceMetric".split(" "), n = 0; n < o.length; n++) g(u, o[n]); e._i.push([i, s, a]) }, e.__SV = 1) }(document, window.posthog || []);
    window.posthog.init(CONFIG.POSTHOG_KEY, {
      api_host: CONFIG.POSTHOG_HOST,
      persistence: "memory",              // cookieless: no cookies, no consent banner needed
      person_profiles: "identified_only",
      capture_pageview: true,
      autocapture: true,
    });
  }

  // --- Google Tag Manager (holds GA4 + Meta Pixel + Google Ads) ---
  if (hasGtm) {
    (function (w, d, s, l, i) {
      w[l] = w[l] || []; w[l].push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
      var f = d.getElementsByTagName(s)[0], j = d.createElement(s), dl = l != "dataLayer" ? "&l=" + l : "";
      j.async = true; j.src = "https://www.googletagmanager.com/gtm.js?id=" + i + dl;
      f.parentNode.insertBefore(j, f);
    })(window, document, "script", "dataLayer", CONFIG.GTM_ID);
  }

  // --- Auto-wire declarative click tracking ---
  // Any element with data-track="event_name" (+ optional data-track-* props)
  // fires gambitoTrack on click. Lets us tag CTAs in markup, no per-page JS.
  document.addEventListener("click", function (ev) {
    var el = ev.target && ev.target.closest ? ev.target.closest("[data-track]") : null;
    if (!el) return;
    var props = {};
    for (var i = 0; i < el.attributes.length; i++) {
      var a = el.attributes[i];
      if (a.name.indexOf("data-track-") === 0) props[a.name.slice("data-track-".length)] = a.value;
    }
    window.gambitoTrack(el.getAttribute("data-track"), props);
  }, { capture: true });
})();
