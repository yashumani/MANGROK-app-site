import * as base from "./print.js";
import { normalizeStickerLayers, stickerDataUri, getSticker } from "./sticker-library.js";

export * from "./print.js";

export function buildBookHtml(...args) {
  const html = base.buildBookHtml(...args);
  const layers = layersFromArgs(args);
  return layers.length ? injectStickerLayers(String(html), layers) : html;
}

export function analyzePrintProject(...args) {
  const result = base.analyzePrintProject(...args);
  const layers = layersFromArgs(args);
  if (!layers.length || !result || typeof result !== "object") return result;
  const warnings = [...(result.warnings || [])];
  if (layers.length > 32) warnings.push("This book uses more than 32 sticker layers; inspect every page for visual crowding and print performance.");
  if (layers.some(layer => layer.x < 5 || layer.x > 95 || layer.y < 5 || layer.y > 95)) warnings.push("One or more stickers are close to the trim edge. Verify bleed and safe-area placement before ordering.");
  return Object.freeze({ ...result, warnings: Object.freeze(warnings), stickerLayerCount: layers.length });
}

export function buildPrintProofManifest(...args) {
  const manifest = base.buildPrintProofManifest(...args);
  const layers = layersFromArgs(args);
  if (!manifest || typeof manifest !== "object") return manifest;
  return Object.freeze({ ...manifest, stickerLayers: Object.freeze(layers.map(layer => Object.freeze({ id: layer.id, stickerId: layer.stickerId, name: getSticker(layer.stickerId)?.name || layer.stickerId, page: layer.page, x: layer.x, y: layer.y, scale: layer.scale, rotation: layer.rotation, opacity: layer.opacity, text: layer.text }))) });
}

export function injectStickerLayers(html, rawLayers) {
  const layers = normalizeStickerLayers(rawLayers, 48); if (!layers.length) return html;
  const cover = layers.filter(layer => layer.page === "cover" || layer.page === "all");
  const recipe = layers.filter(layer => layer.page === "recipe" || layer.page === "all");
  const style = `<style id="mangrok-print-sticker-style">.mangrok-print-sticker-stage{position:absolute;inset:0;z-index:40;pointer-events:none;overflow:hidden}.mangrok-print-sticker-stage img{position:absolute;width:1.42in;max-width:30%;transform-origin:center}.mangrok-print-sticker-fixed{position:fixed;inset:0;z-index:40;pointer-events:none}.mangrok-print-sticker-fixed img{position:absolute;width:1.1in;max-width:20%;transform-origin:center}@media screen{.mangrok-print-sticker-stage img,.mangrok-print-sticker-fixed img{filter:drop-shadow(0 3px 4px rgba(35,14,25,.2))}}</style>`;
  let output = html.includes("</head>") ? html.replace("</head>", `${style}</head>`) : style + html;
  if (cover.length) {
    const stage = `<div class="mangrok-print-sticker-stage" aria-hidden="true">${cover.map(renderLayer).join("")}</div>`;
    const coverPattern = /(<(?:section|article|div)[^>]*class=["'][^"']*(?:book-cover|cover-page|\bcover\b)[^"']*["'][^>]*>)/i;
    if (coverPattern.test(output)) output = output.replace(coverPattern, `$1${stage}`); else output = output.replace(/<body([^>]*)>/i, `<body$1>${stage}`);
  }
  if (recipe.length) output = output.replace(/<\/body>/i, `<div class="mangrok-print-sticker-fixed" aria-hidden="true">${recipe.map(renderLayer).join("")}</div></body>`);
  return output;
}

function renderLayer(layer) { const src = stickerDataUri(layer.stickerId, { text: layer.text }); const style = `left:${layer.x}%;top:${layer.y}%;opacity:${layer.opacity};transform:translate(-50%,-50%) rotate(${layer.rotation}deg) scale(${layer.scale})`; return `<img src="${src}" alt="" style="${style}">`; }
function layersFromArgs(args) { for (let index = args.length - 1; index >= 0; index -= 1) { const value = args[index]; if (!value || typeof value !== "object" || Array.isArray(value)) continue; if (Array.isArray(value.decorations)) return normalizeStickerLayers(value.decorations, 48); if (Array.isArray(value.stickerLayers)) return normalizeStickerLayers(value.stickerLayers, 48); } return Object.freeze([]); }
