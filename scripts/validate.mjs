import { readFile, access, readdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const required = [
  "index.html", "styles.css", "runtime-config.js", "manifest.webmanifest", "sw.js", "release-status.json",
  "src/app.js", "src/cloud.js", "src/print.js", "src/print-with-stickers.js",
  "src/kitchen-library.js", "src/kitchen-ui.js", "src/ingredient-catalog.js", "src/ingredient-catalog-data.js", "src/ingredient-submissions.js",
  "src/culinary-engine.js", "src/local-ai.js", "src/entitlements.js", "src/readiness.js", "src/mobile-shell.js", "src/generated-images.js",
  "src/alchemy-ui.js", "src/alchemy-cuisine-ui.js",
  "src/atelier-reference-recipes.js", "src/atelier-reference-table.js",
  "src/agent-tools.js", "src/agent-router.js", "src/agent-memory.js", "src/agent-runtime.js", "src/agent-memory-ui.js",
  "src/brand-reveal.js", "src/sticker-library.js", "src/sticker-studio.js",
  "assets/mangrok-mark.svg", "assets/brand/mangrok-wordmark.svg", "assets/brand/mangrok-seal.svg",
  "assets/css/alchemy.css", "assets/css/recipe-atelier.css", "assets/css/brand-reveal.css", "assets/css/sticker-studio.css",
  "assets/generated/hero.svg", "assets/generated/ingredients.svg", "assets/generated/equipment.svg",
  "assets/generated/insights.svg", "assets/generated/evolution.svg",
  "supabase/migrations/001_platform.sql", "supabase/migrations/002_alchemy.sql", "supabase/migrations/003_alchemy_production.sql", "supabase/migrations/004_global_ingredient_agent_memory.sql",
  "supabase/functions/alchemy-ai/index.ts", "SECURITY.md"
];

for (const file of required) await access(path.join(root, file));
JSON.parse(await readFile(path.join(root, "manifest.webmanifest"), "utf8"));
const releaseStatus = JSON.parse(await readFile(path.join(root, "release-status.json"), "utf8"));

for (const file of required.filter(file => file.startsWith("assets/generated/") && file.endsWith(".svg"))) {
  const svg = await readFile(path.join(root, file), "utf8");
  assertSvgWellFormed(svg, file);
}
for (const file of ["assets/mangrok-mark.svg", "assets/brand/mangrok-wordmark.svg", "assets/brand/mangrok-seal.svg"]) {
  assertSvgWellFormed(await readFile(path.join(root, file), "utf8"), file);
}

for (const file of (await walk(path.join(root, "src"))).filter(file => file.endsWith(".js"))) {
  execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
}

const html = await readFile(path.join(root, "index.html"), "utf8");
for (const phrase of [
  "Content-Security-Policy",
  "wasm-unsafe-eval",
  "worker-src 'self' blob:",
  "https://esm.run",
  "http://127.0.0.1:11434",
  "Mangrok",
  "./assets/css/brand-reveal.css",
  "./assets/css/sticker-studio.css",
  'type="module" src="./src/brand-reveal.js"'
]) {
  if (!html.includes(phrase)) throw new Error(`Missing interface/CSP contract: ${phrase}`);
}

const browserFiles = [
  "runtime-config.js",
  ...(await walk(path.join(root, "src"))).filter(file => file.endsWith(".js")).map(file => path.relative(root, file))
];
const browserText = await Promise.all(browserFiles.map(file => readFile(path.join(root, file), "utf8")));
if (browserText.some(text => /SUPABASE_SERVICE_ROLE_KEY|AI_GATEWAY_KEY\s*[:=]\s*["'][^"']+/i.test(text))) {
  throw new Error("Private credential detected in browser source.");
}

const kitchenUi = await readFile(path.join(root, "src/kitchen-ui.js"), "utf8");
const kitchenLibrary = await readFile(path.join(root, "src/kitchen-library.js"), "utf8");
if (/item\.icon|iconFor\s*\(/.test(kitchenUi)) throw new Error("Legacy icon renderer remains in the kitchen UI.");
if (/[\u{1F300}-\u{1FAFF}]/u.test(`${kitchenUi}\n${kitchenLibrary}`)) {
  throw new Error("Emoji-based ingredient or equipment assets remain.");
}
for (const symbol of ["⌂", "⌕", "▤", "◇", "◎", "♢", "⚙", "✦", "＋"]) {
  if (html.includes(symbol)) throw new Error(`Symbol-based interface control remains: ${symbol}`);
}

const runtime = await readFile(path.join(root, "runtime-config.js"), "utf8");
const serviceWorker = await readFile(path.join(root, "sw.js"), "utf8");
for (const phrase of [
  "appVersion", "3.6.0-alpha.7", "alchemyFunctionName", "src/readiness.js", "src/entitlements.js", "src/mobile-shell.js",
  "src/atelier-reference-table.js", "src/alchemy-cuisine-ui.js", "src/agent-memory-ui.js", "src/sticker-studio.js"
]) {
  if (!runtime.includes(phrase) && !serviceWorker.includes(phrase)) throw new Error(`Missing production release contract: ${phrase}`);
}
if (!/mangrok-v11-logo-sticker-studio/.test(serviceWorker)) throw new Error("PWA cache was not advanced for the logo and sticker release.");
for (const phrase of ["src/brand-reveal.js", "src/sticker-library.js", "src/sticker-studio.js", "src/print-with-stickers.js", "src/ingredient-catalog-data.js"]) {
  if (!serviceWorker.includes(phrase)) throw new Error(`Missing offline application-shell asset: ${phrase}`);
}

if (releaseStatus.applicationVersion !== "3.6.0-alpha.7") throw new Error("Release-status application version mismatch.");
if (releaseStatus.pwaCache !== "mangrok-v11-logo-sticker-studio") throw new Error("Release-status PWA cache mismatch.");
if (releaseStatus.ingredientCatalogEntries !== 4301) throw new Error("Release-status ingredient count mismatch.");
if (releaseStatus.stickerAssets !== 32) throw new Error("Release-status sticker count mismatch.");
if (!releaseStatus.alchemyRestored || !releaseStatus.logoReveal || !releaseStatus.printStickerLayers) throw new Error("Release-status feature contract is incomplete.");

const alchemyFunction = await readFile(path.join(root, "supabase/functions/alchemy-ai/index.ts"), "utf8");
for (const phrase of ["p_request_id", "refund_alchemy_credit", "model_gateway_timeout", "origin_not_allowed"]) {
  if (!alchemyFunction.includes(phrase)) throw new Error(`Missing Alchemy gateway safety contract: ${phrase}`);
}

console.log("Mangrok logo, sticker, ingredient, and Alchemy static validation passed.");

function assertSvgWellFormed(svg, file) {
  const stack = [];
  const tokens = String(svg).match(/<\/?[A-Za-z][^>]*>/g) || [];
  for (const token of tokens) {
    if (/^<\//.test(token)) {
      const name = token.match(/^<\/([A-Za-z][\w:-]*)/)?.[1];
      const open = stack.pop();
      if (!name || open !== name) throw new Error(`Malformed SVG ${file}: expected </${open || "none"}> but found </${name || "unknown"}>.`);
    } else if (!/\/>$/.test(token)) {
      const name = token.match(/^<([A-Za-z][\w:-]*)/)?.[1];
      if (name) stack.push(name);
    }
  }
  if (stack.length) throw new Error(`Malformed SVG ${file}: unclosed <${stack.at(-1)}>.`);
}

async function walk(directory) {
  const output = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const current = path.join(directory, item.name);
    if (item.isDirectory()) output.push(...await walk(current));
    else output.push(current);
  }
  return output;
}
