const PALETTE = Object.freeze({
  plum: "#4a1537", cream: "#fff7e7", paper: "#f5e6c8", gold: "#d49a28",
  tomato: "#c94335", olive: "#718346", leaf: "#668a4c", ink: "#3a2a24", blue: "#3e6f8c", honey: "#d99024"
});

const rows = [
  ["basil-bundle","Basil bundle","Botanical","basil herbs green garden","basil"],
  ["tomato-vine","Tomato vine","Botanical","tomato vine red produce","tomato"],
  ["lemon-slice","Lemon slice","Botanical","lemon citrus bright","lemon"],
  ["garlic-clove","Garlic clove","Botanical","garlic aromatic","garlic"],
  ["rosemary-sprig","Rosemary sprig","Botanical","rosemary herb","rosemary"],
  ["mushroom-cluster","Mushroom cluster","Botanical","mushroom fungi","mushroom"],
  ["chili-ribbon","Chili ribbon","Botanical","chili pepper spicy","chili"],
  ["olive-branch","Olive branch","Botanical","olive botanical mediterranean","olive"],
  ["red-dutch-oven","Red Dutch oven","Kitchen","pot dutch oven cookware","pot"],
  ["bow-whisk","Bow whisk","Kitchen","whisk baking bow","whisk"],
  ["heart-spoon","Heart spoon","Kitchen","wooden spoon heart","spoon"],
  ["measuring-cup","Measuring cup","Kitchen","measurement baking cup","cup"],
  ["mortar-herbs","Mortar and herbs","Kitchen","mortar pestle spice","mortar"],
  ["herb-oil-bottle","Herb oil bottle","Kitchen","oil bottle herb","bottle"],
  ["hearth-bread","Hearth bread","Kitchen","bread sourdough loaf","bread"],
  ["pasta-nest","Pasta nest","Kitchen","pasta noodle italian","pasta"],
  ["family-favorite","Family Favorite","Labels","family favorite heirloom","label","Family Favorite"],
  ["secret-ingredient","Secret Ingredient","Labels","secret ingredient family","label","Secret Ingredient"],
  ["tested-recipe","Tested Recipe","Labels","tested approved recipe","label","Tested Recipe"],
  ["alchemy-approved","Alchemy Approved","Labels","alchemy approved experiment","label","Alchemy Approved"],
  ["passed-down","Passed Down","Labels","passed down heritage","label","Passed Down"],
  ["seasonal","Seasonal","Labels","season seasonal produce","label","Seasonal"],
  ["spicy","Spicy","Labels","spicy chili heat","label","Spicy"],
  ["sweet","Sweet","Labels","sweet dessert","label","Sweet"],
  ["vegan-seal","Vegan","Dietary & status","vegan plant dietary","seal","Vegan"],
  ["gluten-free-seal","Gluten Free","Dietary & status","gluten free wheat dietary","seal","Gluten Free"],
  ["dairy-free-seal","Dairy Free","Dietary & status","dairy free milk dietary","seal","Dairy Free"],
  ["nut-free-seal","Nut Free","Dietary & status","nut free allergen","seal","Nut Free"],
  ["test-kitchen-seal","Test Kitchen","Dietary & status","test kitchen draft","seal","Test Kitchen"],
  ["heritage-ingredient-seal","Heritage Ingredient","Dietary & status","heritage ingredient archive","seal","Heritage"],
  ["first-draft-seal","First Draft","Dietary & status","first draft pencil","seal","First Draft"],
  ["bake-day-seal","Bake Day","Dietary & status","bake day baking","seal","Bake Day"]
];

export const STICKER_CATALOG = Object.freeze(rows.map(([id,name,category,keywords,kind,defaultText=""]) => Object.freeze({ id,name,category,keywords,kind,defaultText,editableText: kind === "label" || kind === "seal" })));
export const STICKER_CATEGORIES = Object.freeze(["All", ...new Set(STICKER_CATALOG.map(item => item.category))]);

export function getSticker(id) { return STICKER_CATALOG.find(item => item.id === String(id)) || null; }
export function searchStickers({ query = "", category = "All" } = {}) {
  const needle = normalize(query);
  return Object.freeze(STICKER_CATALOG.filter(item => (category === "All" || item.category === category) && (!needle || normalize(`${item.name} ${item.keywords} ${item.category}`).includes(needle))));
}
export function createStickerLayer(stickerId, overrides = {}) {
  const sticker = getSticker(stickerId); if (!sticker) throw new Error("Unknown sticker.");
  return normalizeStickerLayer({ id: overrides.id || `layer-${cryptoId()}`, stickerId: sticker.id, page: overrides.page || "cover", x: overrides.x ?? 50, y: overrides.y ?? 50, scale: overrides.scale ?? 1, rotation: overrides.rotation ?? 0, opacity: overrides.opacity ?? 1, text: overrides.text ?? sticker.defaultText });
}
export function normalizeStickerLayer(value = {}) {
  const sticker = getSticker(value.stickerId); if (!sticker) throw new Error("Sticker layer references an unknown asset.");
  return Object.freeze({ id: String(value.id || `layer-${cryptoId()}`).slice(0,100), stickerId: sticker.id, page: ["cover","all","recipe"].includes(value.page) ? value.page : "cover", x: clamp(Number(value.x),0,100,50), y: clamp(Number(value.y),0,100,50), scale: clamp(Number(value.scale),.35,2.5,1), rotation: clamp(Number(value.rotation),-180,180,0), opacity: clamp(Number(value.opacity),.15,1,1), text: sticker.editableText ? String(value.text || sticker.defaultText).trim().slice(0,42) : "" });
}
export function normalizeStickerLayers(values, maximum = 48) {
  const out=[], ids=new Set();
  for (const value of Array.isArray(values) ? values : []) { try { const layer=normalizeStickerLayer(value); if(ids.has(layer.id)) continue; ids.add(layer.id); out.push(layer); if(out.length>=maximum) break; } catch {} }
  return Object.freeze(out);
}
export function renderStickerSvg(stickerOrId, options = {}) {
  const sticker = typeof stickerOrId === "string" ? getSticker(stickerOrId) : stickerOrId; if (!sticker) throw new Error("Unknown sticker.");
  const text=String(options.text ?? sticker.defaultText ?? "").trim().slice(0,42);
  const body=sticker.kind === "label" ? labelMarkup(sticker.id,text) : sticker.kind === "seal" ? sealMarkup(sticker.id,text) : artMarkup(sticker.kind,sticker.id);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 260" role="img" aria-label="${escapeXml(text || sticker.name)}"><defs><filter id="s"><feDropShadow dx="0" dy="7" stdDeviation="6" flood-color="#29121e" flood-opacity=".25"/></filter><linearGradient id="paper" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fffaf0"/><stop offset="1" stop-color="#ead8b6"/></linearGradient></defs><g filter="url(#s)">${body}</g></svg>`;
}
export function stickerDataUri(stickerOrId, options = {}) { return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderStickerSvg(stickerOrId, options))}`; }

function labelMarkup(id,text){const accent=id.includes("spicy")?PALETTE.tomato:id.includes("sweet")?"#ba4b68":id.includes("alchemy")?PALETTE.gold:PALETTE.leaf;return `<path d="M24 66Q24 42 50 42h260q26 0 26 24v128q0 24-26 24H50q-26 0-26-24Z" fill="url(#paper)" stroke="${accent}" stroke-width="7"/><path d="M48 63c30 13 53 13 79 0M233 63c28 13 52 13 79 0" fill="none" stroke="${accent}" stroke-width="5" stroke-linecap="round"/><path d="M51 192c27-13 51-13 78 0M232 192c27-13 51-13 78 0" fill="none" stroke="${accent}" stroke-width="5" stroke-linecap="round"/><circle cx="43" cy="130" r="8" fill="${accent}"/><circle cx="317" cy="130" r="8" fill="${accent}"/><text x="180" y="141" text-anchor="middle" fill="${PALETTE.plum}" font-family="Georgia,serif" font-size="${text.length>20?25:31}" font-weight="700">${escapeXml(text || "Recipe Label")}</text>`;}
function sealMarkup(id,text){const color=id.includes("vegan")?"#4f7f43":id.includes("gluten")?"#b98021":id.includes("dairy")?PALETTE.blue:id.includes("nut")?"#8a5434":id.includes("heritage")?"#506e36":PALETTE.tomato;const symbol=id.includes("vegan")?"V":id.includes("gluten")?"G":id.includes("dairy")?"D":id.includes("nut")?"N":id.includes("test-kitchen")?"T":id.includes("first-draft")?"1":id.includes("bake")?"B":"H";return `<circle cx="180" cy="126" r="94" fill="${color}" stroke="#f1cf82" stroke-width="9"/><circle cx="180" cy="126" r="74" fill="none" stroke="#fff4cf" stroke-opacity=".7" stroke-width="3" stroke-dasharray="4 8"/><text x="180" y="119" text-anchor="middle" fill="#fff5d9" font-family="Georgia,serif" font-size="54" font-weight="700">${symbol}</text><path d="M118 150h124" stroke="#f7daa0" stroke-width="3"/><text x="180" y="180" text-anchor="middle" fill="#fff8e9" font-family="Arial,sans-serif" font-size="${text.length>13?16:19}" font-weight="700" letter-spacing="1">${escapeXml(text.toUpperCase())}</text><path d="M128 214l-24 37 48-18 28 22 28-22 48 18-24-37" fill="${color}" stroke="#f1cf82" stroke-width="5"/>`;}
function artMarkup(kind,id){const ribbon=`<path d="M82 214h196l-20 30-78-15-78 15Z" fill="#f3dfbd" stroke="#b77b37" stroke-width="5"/>`;const names={basil:"Basil",tomato:"Tomatoes",lemon:"Lemon",garlic:"Garlic",rosemary:"Rosemary",mushroom:"Mushrooms",chili:"Chili",olive:"Olives",pot:"Dutch Oven",whisk:"Whisk",spoon:"Wooden Spoon",cup:"Measure",mortar:"Mortar",bottle:"Herb Oil",bread:"Bread",pasta:"Pasta"};const label=names[kind]||id;const plant={
  basil:`<path d="M180 203V62" stroke="#486a3b" stroke-width="9"/><g fill="#6f9b54" stroke="#39572f" stroke-width="4"><ellipse cx="143" cy="92" rx="34" ry="18" transform="rotate(25 143 92)"/><ellipse cx="216" cy="88" rx="34" ry="18" transform="rotate(-25 216 88)"/><ellipse cx="138" cy="137" rx="36" ry="19" transform="rotate(18 138 137)"/><ellipse cx="219" cy="136" rx="36" ry="19" transform="rotate(-18 219 136)"/><ellipse cx="180" cy="65" rx="28" ry="17"/></g>`,
  tomato:`<path d="M180 70v135M180 105l-56 26M180 122l62 27" stroke="#51723f" stroke-width="8"/><g fill="#d94b3c" stroke="#8f2b25" stroke-width="5"><circle cx="118" cy="139" r="35"/><circle cx="178" cy="169" r="38"/><circle cx="245" cy="153" r="35"/></g><g fill="#62854b"><path d="m118 103 10 22 24-2-18 16 7 23-23-12-22 12 6-23-18-16 24 2Z"/><path d="m178 130 9 20 22-2-16 15 6 21-21-11-20 11 6-21-16-15 22 2Z"/><path d="m245 117 9 20 22-2-16 15 6 21-21-11-20 11 6-21-16-15 22 2Z"/></g>`,
  lemon:`<ellipse cx="180" cy="130" rx="82" ry="65" fill="#f3c93c" stroke="#b98216" stroke-width="7"/><ellipse cx="180" cy="130" rx="58" ry="46" fill="#fff0a5" stroke="#e0b12f" stroke-width="4"/><path d="M180 84v92M122 130h116M139 97l82 66M221 97l-82 66" stroke="#e5b72e" stroke-width="4"/>`,
  garlic:`<path d="M180 47c17 31 44 31 59 65 20 46-8 96-59 96s-79-50-59-96c15-34 42-34 59-65Z" fill="#fff4d8" stroke="#b7a078" stroke-width="7"/><path d="M180 73v122M151 91c-16 39-11 77 7 104M209 91c16 39 11 77-7 104" fill="none" stroke="#d5c39e" stroke-width="5"/><path d="M170 53c-12-19-7-34 7-45M190 53c12-19 7-34-7-45" stroke="#70834d" stroke-width="6"/>`,
  rosemary:`<path d="M180 207V48" stroke="#5a6d38" stroke-width="9"/><g stroke="#688542" stroke-width="7" stroke-linecap="round"><path d="m179 74-38-21m39 39 42-24m-42 43-46-18m46 36 47-17m-47 37-42-13m42 31 42-10m-42 30-35-6"/></g>`,
  mushroom:`<g stroke="#8b5c3a" stroke-width="6"><path d="M98 129c0-46 35-76 78-76s78 30 78 76Z" fill="#c89262"/><path d="M136 126c8 15 9 40 0 75h80c-9-35-8-60 0-75Z" fill="#f1d6ad"/><path d="M205 136c0-32 27-53 57-53 31 0 57 21 57 53Z" fill="#ad754b"/><path d="M234 134c6 13 7 35 0 63h56c-7-28-6-50 0-63Z" fill="#edd0a8"/></g>`,
  chili:`<path d="M108 70c72 6 96 66 47 128-23 29-58 25-77 8 46 7 71-28 63-63-8-36-32-54-61-58Z" fill="#d64436" stroke="#89261f" stroke-width="6"/><path d="M215 66c63 14 76 73 27 123-22 22-52 15-66 0 38 8 59-17 55-48-4-32-24-51-48-59Z" fill="#f08e2e" stroke="#9f4c16" stroke-width="6"/><path d="M98 72c-9-24 0-39 20-48M207 68c-6-21 3-35 21-41" stroke="#5f7b42" stroke-width="8"/>`,
  olive:`<path d="M105 198 247 53" stroke="#5e713d" stroke-width="9"/><g fill="#73884b" stroke="#46582e" stroke-width="3"><ellipse cx="139" cy="160" rx="31" ry="14" transform="rotate(-20 139 160)"/><ellipse cx="167" cy="126" rx="31" ry="14" transform="rotate(25 167 126)"/><ellipse cx="196" cy="98" rx="31" ry="14" transform="rotate(-20 196 98)"/><ellipse cx="220" cy="72" rx="29" ry="13" transform="rotate(25 220 72)"/></g><g fill="#36243c"><ellipse cx="126" cy="181" rx="13" ry="18"/><ellipse cx="163" cy="144" rx="13" ry="18"/><ellipse cx="202" cy="110" rx="13" ry="18"/></g>`,
  pot:`<path d="M95 99h170v100H95Z" fill="#c94235" stroke="#87271f" stroke-width="7"/><path d="M76 108h20m170 0h20" stroke="#87271f" stroke-width="14" stroke-linecap="round"/><path d="M112 96c0-30 136-30 136 0Z" fill="#df5a49" stroke="#87271f" stroke-width="7"/><path d="M165 61h30" stroke="#87271f" stroke-width="13" stroke-linecap="round"/>`,
  whisk:`<path d="M180 202V126" stroke="#81542f" stroke-width="16" stroke-linecap="round"/><path d="M180 126c-62-31-58-91-30-91 24 0 31 44 30 91Zm0 0c62-31 58-91 30-91-24 0-31 44-30 91Zm0 0c-31-59-7-96 12-82 17 12 3 53-12 82Zm0 0c31-59 7-96-12-82-17 12-3 53 12 82Z" fill="none" stroke="#9ca0a0" stroke-width="6"/>`,
  spoon:`<ellipse cx="180" cy="75" rx="44" ry="58" fill="#a86f36" stroke="#68421f" stroke-width="7"/><path d="M180 128v84" stroke="#8a572b" stroke-width="22" stroke-linecap="round"/><path d="M180 59c-17-20-42 7 0 37 42-30 17-57 0-37Z" fill="#f3e0bd"/>`,
  cup:`<path d="M101 63h145v139H101Z" fill="#f4eee4" fill-opacity=".8" stroke="#a77f49" stroke-width="7"/><path d="M246 83h21c39 0 39 74 0 74h-21" fill="none" stroke="#a77f49" stroke-width="12"/><path d="M126 165h82M126 136h62M126 107h42" stroke="#c04a3f" stroke-width="6"/><text x="180" y="92" text-anchor="middle" fill="#a24135" font-family="Arial" font-size="18">1 CUP</text>`,
  mortar:`<path d="M95 112h174l-24 91H119Z" fill="#5b4d47" stroke="#2f2825" stroke-width="8"/><path d="M217 116 281 38" stroke="#4a3b35" stroke-width="24" stroke-linecap="round"/><g fill="#728b4a"><ellipse cx="135" cy="89" rx="31" ry="14" transform="rotate(25 135 89)"/><ellipse cx="178" cy="81" rx="31" ry="14" transform="rotate(-22 178 81)"/></g>`,
  bottle:`<path d="M150 67h60l12 31v104H138V98Z" fill="#d8a936" fill-opacity=".78" stroke="#8b5b21" stroke-width="7"/><path d="M161 28h38v42h-38Z" fill="#ead7ad" stroke="#8b5b21" stroke-width="7"/><path d="M153 127c25-38 54-22 50 19-28-19-46-8-50 20" fill="none" stroke="#557b42" stroke-width="8"/>`,
  bread:`<path d="M76 164c5-70 51-108 104-108s99 38 104 108c3 40-34 51-104 51S73 204 76 164Z" fill="#c8873e" stroke="#7d4c22" stroke-width="8"/><path d="M123 91c14 17 21 35 18 55m39-78c12 21 16 44 10 68m48-45c-16 17-23 36-20 55" fill="none" stroke="#f0c477" stroke-width="10" stroke-linecap="round"/>`,
  pasta:`<g fill="none" stroke="#d89a2c" stroke-width="12" stroke-linecap="round"><path d="M86 157c34-69 76-85 105-44s64 37 83-17"/><path d="M87 183c44-45 74-47 98-10s61 39 93 5"/><path d="M99 126c31-49 67-54 91-13s55 38 77 14"/></g>`}[kind]||"";return `${plant}${ribbon}<text x="180" y="236" text-anchor="middle" fill="${PALETTE.plum}" font-family="Georgia,serif" font-size="20" font-weight="700">${escapeXml(label)}</text>`;}
function escapeXml(value){return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;"})[char]);}
function normalize(value){return String(value||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();}
function clamp(value,min,max,fallback){return Number.isFinite(value)?Math.min(max,Math.max(min,value)):fallback;}
function cryptoId(){return globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2);}
