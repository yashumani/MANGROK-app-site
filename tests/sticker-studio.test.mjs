import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { STICKER_CATALOG, STICKER_CATEGORIES, createStickerLayer, normalizeStickerLayers, renderStickerSvg, searchStickers } from "../src/sticker-library.js";
import { injectStickerLayers } from "../src/print-with-stickers.js";

test("sticker library provides 32 unique original assets across useful collections", () => {
  assert.equal(STICKER_CATALOG.length, 32);
  assert.equal(new Set(STICKER_CATALOG.map(item => item.id)).size, 32);
  assert.deepEqual(STICKER_CATEGORIES, ["All", "Botanical", "Kitchen", "Labels", "Dietary & status"]);
  assert.ok(searchStickers({ query: "alchemy" }).some(item => item.id === "alchemy-approved"));
  assert.ok(searchStickers({ category: "Kitchen" }).length >= 8);
});

test("editable label SVG is escaped and remains printable", () => {
  const svg = renderStickerSvg("family-favorite", { text: "<script>alert(1)</script>" });
  assert.match(svg, /^<svg/);
  assert.doesNotMatch(svg, /<script>/);
  assert.match(svg, /&lt;script&gt;/);
});

test("sticker layers are bounded, normalized, and deduplicated", () => {
  const layer = createStickerLayer("tomato-vine", { id: "a", x: 300, y: -40, scale: 99, rotation: 999, opacity: 0 });
  assert.equal(layer.x, 100); assert.equal(layer.y, 0); assert.equal(layer.scale, 2.5); assert.equal(layer.rotation, 180); assert.equal(layer.opacity, .15);
  assert.equal(normalizeStickerLayers([layer, layer], 48).length, 1);
});

test("print wrapper injects sticker layers into the generated cover", () => {
  const html = '<!doctype html><html><head><style></style></head><body><section class="book-cover"><h1>Mangrok</h1></section></body></html>';
  const output = injectStickerLayers(html, [createStickerLayer("alchemy-approved", { text: "Kitchen Approved" })]);
  assert.match(output, /mangrok-print-sticker-stage/);
  assert.match(output, /data:image\/svg\+xml/);
  assert.match(output, /mangrok-print-sticker-style/);
});

test("brand reveal and sticker studio are release-integrated", async () => {
  const [index, reveal, runtime, serviceWorker] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../src/brand-reveal.js", import.meta.url), "utf8"),
    readFile(new URL("../runtime-config.js", import.meta.url), "utf8"),
    readFile(new URL("../sw.js", import.meta.url), "utf8")
  ]);
  assert.match(index, /brand-reveal\.css/); assert.match(index, /brand-reveal\.js/);
  assert.match(reveal, /prefers-reduced-motion/); assert.match(reveal, />Skip</); assert.match(reveal, /sessionStorage/);
  assert.match(runtime, /sticker-studio\.js/); assert.match(runtime, /3\.6\.0-alpha\.7/);
  assert.match(serviceWorker, /mangrok-v11-logo-sticker-studio/);
});
