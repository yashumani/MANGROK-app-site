import { readFile, access, readdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const required = [
  "index.html", "styles.css", "runtime-config.js", "manifest.webmanifest", "sw.js",
  "src/app.js", "src/cloud.js", "src/print.js", "src/kitchen-library.js", "src/kitchen-ui.js",
  "src/culinary-engine.js", "src/local-ai.js", "src/entitlements.js", "src/readiness.js", "src/mobile-shell.js", "src/generated-images.js",
  "assets/generated/hero.svg", "assets/generated/ingredients.svg", "assets/generated/equipment.svg",
  "assets/generated/insights.svg", "assets/generated/evolution.svg",
  "src/alchemy-ui.js",
  "src/print-decor.js", "assets/css/alchemy.css",
  "supabase/migrations/001_platform.sql", "supabase/migrations/002_alchemy.sql", "supabase/migrations/003_alchemy_production.sql",
  "supabase/functions/alchemy-ai/index.ts", "SECURITY.md"
];

for (const file of required) await access(path.join(root, file));
JSON.parse(await readFile(path.join(root, "manifest.webmanifest"), "utf8"));

for (const file of required.filter(file => file.startsWith("assets/generated/") && file.endsWith(".svg"))) {
  const svg = await readFile(path.join(root, file), "utf8");
  assertSvgWellFormed(svg, file);
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
  "Mangrok"
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
for (const phrase of ["appVersion", "alchemyFunctionName", "src/readiness.js", "src/entitlements.js", "src/mobile-shell.js"]) {
  if (!runtime.includes(phrase) && !serviceWorker.includes(phrase)) throw new Error(`Missing production-readiness contract: ${phrase}`);
}
if (!/mangrok-v7-mobile-app-shell/.test(serviceWorker)) throw new Error("PWA cache was not advanced for the mobile app-shell release.");

const alchemyFunction = await readFile(path.join(root, "supabase/functions/alchemy-ai/index.ts"), "utf8");
for (const phrase of ["p_request_id", "refund_alchemy_credit", "model_gateway_timeout", "origin_not_allowed"]) {
  if (!alchemyFunction.includes(phrase)) throw new Error(`Missing Alchemy gateway safety contract: ${phrase}`);
}

console.log("Mangrok Alchemy static validation passed.");

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
