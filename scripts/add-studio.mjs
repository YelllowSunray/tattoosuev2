#!/usr/bin/env node
/**
 * Add a studio preview to data/studios.json.
 *
 * Usage:
 *   npm run add-studio -- --name "Ink & Iron Tattoo" --slug ink-and-iron \
 *     --logo https://example.com/logo.png --accent "#e8c547" \
 *     --booking https://example.com/book
 *
 * A bot can run this, commit data/studios.json, and Vercel will deploy
 * https://<host>/s/<slug>.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = join(root, "data", "studios.json");

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function printHelp() {
  console.log(`Add a studio preview entry to data/studios.json

Required:
  --name              Studio display name
  --booking           Booking / contact URL (https:// or mailto:)

Optional:
  --slug              URL slug (default: slugified name)
  --logo              Logo URL (remote OK; omitted = text wordmark)
  --accent            Hex accent color (default: #ffffff)
  --accent-foreground Hex text color on accent (default: #000000)
  --highlight         Hex highlight (default: accent)
  --name-short        Short name for tight headers
  --booking-label     CTA label (default: Book a consultation)
  --plan              demo | paid (default: demo)
  --trial-days        Demo length (default: 14)
  --force             Overwrite an existing slug

Example:
  npm run add-studio -- --name "Ink & Iron Tattoo" --slug ink-and-iron \\
    --accent "#e8c547" --booking "https://example.com/book"
`);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

const args = parseArgs(process.argv.slice(2));
if (args.help || args.h) {
  printHelp();
  process.exit(0);
}

const name = typeof args.name === "string" ? args.name.trim() : "";
const bookingLink =
  typeof args.booking === "string" ? args.booking.trim() : "";

if (!name) fail("Missing --name. See --help.");
if (!bookingLink) fail("Missing --booking. See --help.");

const slug =
  (typeof args.slug === "string" && args.slug.trim()) || slugify(name);
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
  fail(`Invalid slug "${slug}". Use lowercase letters, numbers, and hyphens.`);
}

const plan = args.plan === "paid" ? "paid" : "demo";
const now = new Date();
const trialDays = Number.parseInt(String(args["trial-days"] || "14"), 10);
const trialEndsAt = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

const entry = {
  slug,
  name,
  nameShort:
    typeof args["name-short"] === "string" && args["name-short"].trim()
      ? args["name-short"].trim()
      : name,
  logoUrl: typeof args.logo === "string" ? args.logo.trim() : "",
  accent: typeof args.accent === "string" ? args.accent.trim() : "#ffffff",
  accentForeground:
    typeof args["accent-foreground"] === "string"
      ? args["accent-foreground"].trim()
      : "#000000",
  highlight:
    typeof args.highlight === "string"
      ? args.highlight.trim()
      : typeof args.accent === "string"
        ? args.accent.trim()
        : "#ffffff",
  bookingLink,
  bookingLabel:
    typeof args["booking-label"] === "string" && args["booking-label"].trim()
      ? args["booking-label"].trim()
      : "Book a consultation",
  plan,
  createdAt: now.toISOString(),
};

if (plan === "demo") {
  entry.trialEndsAt = trialEndsAt.toISOString();
}

const studios = JSON.parse(readFileSync(dataPath, "utf8"));
if (!Array.isArray(studios)) fail("data/studios.json must be a JSON array.");

const existingIndex = studios.findIndex((studio) => studio.slug === slug);
if (existingIndex >= 0) {
  if (!args.force) {
    fail(`Slug "${slug}" already exists. Pass --force to overwrite.`);
  }
  studios[existingIndex] = { ...studios[existingIndex], ...entry };
} else {
  studios.push(entry);
}

writeFileSync(dataPath, `${JSON.stringify(studios, null, 2)}\n`);
console.log(
  `Wrote ${slug} (${plan}) to data/studios.json. Preview path: /s/${slug}`
);
if (plan === "demo") {
  console.log(`Trial ends: ${entry.trialEndsAt}`);
}
