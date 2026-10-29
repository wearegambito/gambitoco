#!/usr/bin/env node
/* One-off: upload the optimised portfolio images in assets/portfolio/ to the Supabase
   Storage `portfolio` bucket (paths "<project>/<file>.webp", matching services/design/projects.js).

   Needs the service-role key, read from the environment — never commit it or paste it in chat:
     SUPABASE_SERVICE_ROLE_KEY=... node scripts/upload-portfolio.mjs
   Safe to re-run (upserts). */
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { createClient } from "@supabase/supabase-js";

const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!KEY) { console.error("Set SUPABASE_SERVICE_ROLE_KEY (Supabase Dashboard → Project Settings → API keys)."); process.exit(1); }
const supabase = createClient("https://wtzklaumnzezgzgzllgn.supabase.co", KEY, { auth: { persistSession: false } });

const ROOT = join(process.cwd(), "assets/portfolio");
const files = readdirSync(ROOT).flatMap((dir) =>
  dir.startsWith(".") ? [] : readdirSync(join(ROOT, dir)).filter((f) => f.endsWith(".webp")).map((f) => `${dir}/${f}`));

let done = 0, failed = 0;
const queue = files.slice();
async function worker() {
  for (let path; (path = queue.shift()); ) {
    const { error } = await supabase.storage.from("portfolio").upload(path, readFileSync(join(ROOT, path)), {
      contentType: "image/webp", cacheControl: "31536000", upsert: true,
    });
    if (error) { failed++; console.error(`✗ ${path}: ${error.message}`); } else done++;
  }
}
await Promise.all(Array.from({ length: 6 }, worker));
console.log(`Uploaded ${done}/${files.length} files${failed ? `, ${failed} failed` : ""}.`);
process.exit(failed ? 1 : 0);
