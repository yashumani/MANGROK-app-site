import { readFile, access, readdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const required = [
  "index.html", "styles.css", "runtime-config.js", "manifest.webmanifest", "sw.js",
  "src/app.js", "src/cloud.js", "src/print.js", "src/kitchen-library.js", "src/kitchen-ui.js",
  "src/culinary-engine.js", "src/local-ai.js", "src/generated-images.js",
  "assets/generated/hero.svg", "assets/generated/ingredients.svg", "assets/generated/equipment.svg",
  "assets/generated/insights.svg", "assets/generated/evolution.svg",
  "src/alchemy-ui.js",
  "src/print-decor.js", "assets/css/alchemy.css",
  "supabase/migrations/001_platform.sql", "supabase/migrations/002_alchemy.sql",
  "supabase/functions/alchemy-ai/index.ts", "SECURITY.md"
];

for (const file of required) await access(path.join(root, file));
JSON.parse(await readFile(path.join(root, "manifest.webmanifest"), "utf8"));

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

console.log("Mangrok Alchemy static validation passed.");

async function walk(directory) {
  const output = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const current = path.join(directory, item.name);
    if (item.isDirectory()) output.push(...await walk(current));
    else output.push(current);
  }
  return output;
}
