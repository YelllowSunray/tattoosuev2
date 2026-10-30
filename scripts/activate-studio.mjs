#!/usr/bin/env node
/**
 * Activate a studio preview (bank transfer paid).
 *
 * One-field change: sets plan to "paid" in data/studios.json.
 * Paid is lifetime — no expiry, no Preview by SamirDev banner.
 *
 *   npm run activate-studio -- ink-and-iron
 *   git add data/studios.json && git commit -m "Activate ink-and-iron" && git push
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = join(root, "data", "studios.json");

function printHelp() {
  console.log(`Activate a studio (set plan to paid)

Usage:
  npm run activate-studio -- <slug>

Example:
  npm run activate-studio -- ink-and-iron

This only changes the "plan" field to "paid". Commit data/studios.json
and push; Vercel deploys a lifetime gallery with no demo banner.
`);
}

const slug = process.argv.slice(2).find((token) => !token.startsWith("--"));
if (!slug || slug === "help" || process.argv.includes("--help")) {
  printHelp();
  process.exit(slug ? 0 : 1);
}

const studios = JSON.parse(readFileSync(dataPath, "utf8"));
if (!Array.isArray(studios)) {
  console.error("data/studios.json must be a JSON array.");
  process.exit(1);
}

const studio = studios.find((entry) => entry.slug === slug);
if (!studio) {
  console.error(`No studio with slug "${slug}" in data/studios.json.`);
  process.exit(1);
}

if (studio.plan === "paid") {
  console.log(`${slug} is already paid (lifetime). Nothing to change.`);
  process.exit(0);
}

studio.plan = "paid";
writeFileSync(dataPath, `${JSON.stringify(studios, null, 2)}\n`);
console.log(
  `Activated ${slug}: plan is now "paid" (lifetime, banner off). Commit data/studios.json to deploy.`
);
