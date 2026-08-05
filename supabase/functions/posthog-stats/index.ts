// posthog-stats: read-only analytics for the admin dashboard. Queries the
// PostHog HogQL API with a PRIVATE personal API key (never exposed to the
// browser) and returns site-wide totals + per-path / per-source breakdowns for
// the last N days.
//
// Deployed with verify_jwt=FALSE so the CORS preflight isn't blocked by the
// gateway; the caller's Supabase session token is validated INSIDE (getUser)
// and the email must be the admin.
//
// Secrets (set in the Supabase dashboard):
//   POSTHOG_API_KEY      personal API key with query-read scope (phx_…)
//   POSTHOG_PROJECT_ID   the numeric PostHog project id
//   POSTHOG_HOST         optional, defaults to https://us.posthog.com
import { createClient } from "npm:@supabase/supabase-js@2";

const ADMIN_EMAIL = "armic@gambito.co.nz";
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "content-type, authorization, apikey", "access-control-allow-methods": "POST, OPTIONS" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b, null, 2), { status: s, headers: { "content-type": "application/json", ...CORS } });

async function hogql(host: string, projectId: string, key: string, query: string) {
  const res = await fetch(`${host}/api/projects/${projectId}/query/`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`PostHog ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
  return (data.results || []) as any[][];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    // validate the caller's Supabase session token (signature-checked) + admin
    const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const authClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user } } = await authClient.auth.getUser(token);
    if (!user || user.email !== ADMIN_EMAIL) return json({ ok: false, error: "forbidden" }, 403);

    const key = Deno.env.get("POSTHOG_API_KEY");
    const projectId = Deno.env.get("POSTHOG_PROJECT_ID");
    const host = (Deno.env.get("POSTHOG_HOST") || "https://us.posthog.com").replace(/\/+$/, "");
    if (!key || !projectId) return json({ ok: true, configured: false });

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const days = Math.min(365, Math.max(1, parseInt(String(body.days || 30), 10) || 30));

    const totalsRows = await hogql(host, projectId, key, `
      SELECT
        countIf(event = '$pageview') AS pageviews,
        count(DISTINCT person_id) AS visitors,
        countIf(event = 'lead_captured') AS leads,
        countIf(event = 'cta_click') AS cta_clicks,
        countIf(event = 'booking_completed') AS bookings
      FROM events
      WHERE timestamp > now() - INTERVAL ${days} DAY`);
    const r = totalsRows[0] || [];
    const totals = { pageviews: r[0] ?? 0, visitors: r[1] ?? 0, leads: r[2] ?? 0, cta_clicks: r[3] ?? 0, bookings: r[4] ?? 0 };

    const pathRows = await hogql(host, projectId, key, `
      SELECT properties.$pathname AS path, count() AS views
      FROM events
      WHERE event = '$pageview' AND timestamp > now() - INTERVAL ${days} DAY
      GROUP BY path ORDER BY views DESC LIMIT 50`);
    const views_by_path = pathRows.map((x) => ({ path: x[0], views: x[1] }));

    const srcRows = await hogql(host, projectId, key, `
      SELECT properties.source AS source, count() AS leads
      FROM events
      WHERE event = 'lead_captured' AND timestamp > now() - INTERVAL ${days} DAY
      GROUP BY source ORDER BY leads DESC`);
    const leads_by_source = srcRows.map((x) => ({ source: x[0], leads: x[1] }));

    return json({ ok: true, configured: true, range_days: days, totals, views_by_path, leads_by_source });
  } catch (err) {
    return json({ ok: false, error: String((err as Error)?.message ?? err) }, 500);
  }
});
