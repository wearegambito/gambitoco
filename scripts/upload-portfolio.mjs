#!/usr/bin/env node
/* One-off: upload the optimised portfolio images in assets/portfolio/ to the Supabase
   Storage `portfolio` bucket (paths "<project>/<file>.webp", matching the seeded portfolio_projects rows).

   Run `node scripts/upload-portfolio.mjs` and paste the service-role key when asked (input is
   hidden), or set SUPABASE_SERVICE_ROLE_KEY. Never commit the key or paste it in chat.
   Safe to re-run (upserts). */
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

// ask for the key (hidden) when it isn't in the environment
async function askHidden(q) {
  const { createInterface } = await import("readline");
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  rl._writeToOutput = (s) => { if (s.includes(q)) rl.output.write(s); }; // echo the prompt, not the key
  const answer = await new Promise((r) => rl.question(q, r));
  rl.close(); process.stdout.write("\n");
  return answer.trim();
}
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  await askHidden("Paste the service-role key (Supabase → Project Settings → API keys), then Enter: ");
if (!KEY) { console.error("No key given."); process.exit(1); }
const supabase = createClient("https://wtzklaumnzezgzgzllgn.supabase.co", KEY, { auth: { persistSession: false } });

const ROOT = fileURLToPath(new URL("../assets/portfolio", import.meta.url)); // works from any folder
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
