import { PRIVACY } from "./model.js";

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" })[char]);
}
export function assertSecretApproval(includeSecrets, approvedAt) {
  if (includeSecrets && !approvedAt) throw new Error("Confirm that sealed notes may appear in this irreversible print output.");
}
export function buildBookHtml({ title, dedication = "", theme = "heritage", recipes = [], includeSecrets = false, secretApprovalAt = null, unlockedSecrets = {} }) {
  assertSecretApproval(includeSecrets, secretApprovalAt);
  const toc = recipes.map((recipe, index) => `<li><span>${escapeHtml(recipe.title)}</span><span>${index + 1}</span></li>`).join("");
  const pages = recipes.map((recipe, index) => {
    const secret = includeSecrets ? unlockedSecrets[recipe.id] : "";
    const ingredientItems = recipe.ingredients.map(item => `<li>${escapeHtml(item)}</li>`).join("");
    const stepItems = recipe.steps.map((item, step) => `<li><span class="step-number">${step + 1}</span>${escapeHtml(item)}</li>`).join("");
    const origin = [recipe.origin?.creator, recipe.origin?.place, recipe.origin?.year].filter(Boolean).map(escapeHtml).join(" · ");
    return `<article class="recipe-page">
      <header><p class="eyebrow">Recipe ${index + 1} · ${escapeHtml(PRIVACY[recipe.privacy] || recipe.privacy)}</p><h2>${escapeHtml(recipe.title)}</h2>
      ${recipe.summary ? `<p class="summary">${escapeHtml(recipe.summary)}</p>` : ""}${origin ? `<p class="origin">${origin}</p>` : ""}</header>
      <section><h3>Ingredients</h3><ul class="ingredients">${ingredientItems}</ul></section>
      <section><h3>Method</h3><ol class="steps">${stepItems}</ol></section>
      ${recipe.origin?.story ? `<section class="story"><h3>Story & lineage</h3><p>${escapeHtml(recipe.origin.story).replaceAll("\n", "<br>")}</p></section>` : ""}
      ${secret ? `<aside class="sealed"><h3>Sealed note — intentionally printed</h3><p>${escapeHtml(secret).replaceAll("\n", "<br>")}</p></aside>` : ""}
      <footer>${escapeHtml(recipe.origin?.custodian ? `Custodian: ${recipe.origin.custodian}` : "Preserved with Mangrok")}</footer>
    </article>`;
  }).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${bookCss(theme)}</style></head><body class="theme-${escapeHtml(theme)}">
    <section class="cover"><div><p>Mangrok private edition</p><h1>${escapeHtml(title)}</h1>${dedication ? `<blockquote>${escapeHtml(dedication)}</blockquote>` : ""}
    <small>${recipes.length} preserved recipe${recipes.length === 1 ? "" : "s"}</small></div></section>
    <section class="toc"><h2>Contents</h2><ol>${toc}</ol><p class="notice">Printed information cannot be revoked. Handle sealed notes with care.</p></section>
    ${pages}</body></html>`;
}

function bookCss(theme) {
  const accent = theme === "modern" ? "#335c67" : theme === "botanical" ? "#456b4d" : "#8a4a32";
  return `@page{size:6in 9in;margin:.55in .55in .65in}@media print{.cover,.toc,.recipe-page{break-after:page}.recipe-page:last-child{break-after:auto}}
  *{box-sizing:border-box}body{margin:0;color:#201c18;font:11pt/1.5 Georgia,serif;background:#fff}.cover,.toc,.recipe-page{min-height:7.8in;padding:.08in}
  .cover{display:grid;place-items:center;text-align:center;border:3px double ${accent}}.cover h1{font-size:34pt;line-height:1.05;margin:.25in 0}.cover p,.eyebrow{letter-spacing:.14em;text-transform:uppercase;font:8pt/1.3 Arial,sans-serif;color:${accent}}
  blockquote{font-style:italic;margin:.35in auto;max-width:4.3in}.toc h2,.recipe-page h2{font-size:25pt;color:${accent};margin:.08in 0 .18in}.toc ol{padding:0;list-style:none}.toc li{display:flex;justify-content:space-between;border-bottom:1px dotted #aaa;padding:.08in 0}
  .recipe-page header{border-bottom:1px solid #cdbfae;margin-bottom:.18in}.summary{font-size:12pt;font-style:italic}.origin{font:9pt Arial,sans-serif;color:#675b50}.recipe-page h3{font:700 9pt Arial,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:${accent};margin:.2in 0 .08in}
  .ingredients{columns:2;gap:.25in;padding-left:.2in}.steps{list-style:none;padding:0}.steps li{display:flex;gap:.12in;margin:.1in 0}.step-number{display:grid;place-items:center;flex:0 0 .24in;height:.24in;border-radius:50%;background:${accent};color:white;font:8pt Arial}
  .story{border-left:3px solid ${accent};padding-left:.14in}.sealed{border:2px solid ${accent};padding:.15in;background:#fff7ee}.sealed h3{margin-top:0}.recipe-page footer{margin-top:.22in;border-top:1px solid #ddd;padding-top:.08in;font:8pt Arial;color:#766}
  .notice{margin-top:.4in;padding:.15in;border:1px solid #b33;color:#711;font:9pt Arial}`;
}

export function recipeShareText(recipe, includeSecret = false, secretText = "") {
  const lines = [`${recipe.title}`, recipe.summary, "", "Ingredients", ...recipe.ingredients.map(v => `• ${v}`), "", "Method", ...recipe.steps.map((v,i) => `${i+1}. ${v}`)];
  if (includeSecret && secretText) lines.push("", "SEALED NOTE — shared intentionally", secretText);
  lines.push("", "Preserved with Mangrok"); return lines.filter(value => value !== undefined).join("\n");
}
