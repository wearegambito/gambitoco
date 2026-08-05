# A/B testing landing pages

PostHog runs the experiment (who sees what, and which variant wins); the CMS
holds the variant copy. You can start, change and stop a test without any code
change or redeploy.

## How it fits together

- **PostHog** owns the split and the stats: it assigns each visitor a variant,
  records the goal metric (e.g. `lead_captured`), and tells you which won.
- **The CMS** (`landing_pages` row) owns the copy: the alternative text a visitor
  in the "test" group sees.
- `src/landing.js` reads the visitor's assigned variant from PostHog and swaps in
  that variant's copy. The tested element is hidden until the variant resolves,
  so nobody sees a flip.

Variant **A = control** is the page's current copy. Variant **B = test** is the
alternative you enter in the CMS.

## Running a test (start to finish)

1. **In the CMS** (`/admin/` → Landing pages → the page → "A/B test"):
   - **Experiment flag key** — a short key, e.g. `idea-to-launch-hero`.
   - **Field to test** — pick the field, e.g. `Hero Title`.
   - **Variant B value** — the alternative copy.
   - **Save**.

2. **In PostHog** (Experiments → New experiment):
   - **Feature flag key**: the *same* key you used in the CMS
     (`idea-to-launch-hero`).
   - **Variants**: keep the two defaults, named exactly **`control`** and
     **`test`** (these names matter — the CMS uses them).
   - **Goal metric**: the conversion you care about, usually the `lead_captured`
     event (or `cta_click`, `booking_completed`).
   - **Launch** the experiment.

3. **That's it.** Visitors are split 50/50 (adjust in PostHog), each sees their
   variant, and PostHog reports conversions per variant plus significance.

## Notes

- **Turning it off**: clear the flag key in the CMS (or stop the experiment in
  PostHog). With no matching flag, everyone sees control.
- **Variant names are load-bearing**: they must be `control` and `test` to match
  the CMS. If you use different names in PostHog, tell us and we'll map them.
- **One field per test** for now (the common case: a headline or CTA). Multi-field
  variants are a small extension when you need them.
- **Results**: read them in PostHog under the experiment. Give it enough traffic
  to reach significance before calling a winner.
