import { PRIVACY } from "./model.js";
import { GENERATED_IMAGES as IMG } from "./generated-images.js";

const ART = Object.freeze({
  ingredients: IMG.ingredients,
  equipment: IMG.equipment,
  alchemy: IMG.hero,
  insights: IMG.insights,
  evolution: IMG.evolution
});
const THEMES = new Set(["heritage", "botanical", "modern", "pastel", "midnight"]);

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[character]);
}

export function assertSecretApproval(includeSecrets, approvedAt) {
  if (includeSecrets && !approvedAt) {
    throw new Error("Confirm that sealed notes may appear in this irreversible print output.");
  }
}

export function analyzePrintProject({
  title,
  dedication = "",
  theme = "heritage",
  recipes = [],
  includeSecrets = false,
  secretApprovalAt = null,
  decorations = []
} = {}) {
  const errors = [];
  const warnings = [];
  const safeRecipes = Array.isArray(recipes) ? recipes : [];
  const safeDecorations = [...new Set((Array.isArray(decorations) ? decorations : []).map(String))].filter(id => ART[id]).slice(0, 4);
  const cleanTitle = String(title || "").trim();
  const validTheme = THEMES.has(String(theme));

  if (!cleanTitle) errors.push("Add a book title.");
  if (!safeRecipes.length) errors.push("Select at least one recipe.");
  if (!validTheme) errors.push("Choose a supported print theme.");
  if (includeSecrets && !secretApprovalAt) errors.push("Approve irreversible sealed-note printing.");

  let estimatedPages = 2;
  let secretRecipeCount = 0;
  const recipeChecks = safeRecipes.map((recipe, index) => {
    const missing = [];
    if (!String(recipe?.title || "").trim()) missing.push("title");
    if (!Array.isArray(recipe?.ingredients) || !recipe.ingredients.length) missing.push("ingredients");
    if (!Array.isArray(recipe?.steps) || !recipe.steps.length) missing.push("method");
    if (recipe?.secret) secretRecipeCount += 1;
    const contentCharacters = [
      recipe?.title,
      recipe?.summary,
      ...(recipe?.ingredients || []),
      ...(recipe?.steps || []),
      recipe?.origin?.story
    ].map(value => String(value || "")).join(" ").length;
    const pages = Math.max(1, Math.ceil(contentCharacters / 4_200));
    estimatedPages += pages;
    if (missing.length) errors.push(`Recipe ${index + 1} is missing ${missing.join(", ")}.`);
    if (contentCharacters > 8_400) warnings.push(`“${String(recipe?.title || `Recipe ${index + 1}`)}” may flow across ${pages} pages.`);
    return Object.freeze({
      id: String(recipe?.id || ""),
      title: String(recipe?.title || `Recipe ${index + 1}`),
      missing,
      estimatedPages: pages,
      sealed: Boolean(recipe?.secret)
    });
  });

  if (!String(dedication || "").trim()) warnings.push("The edition has no dedication or opening note.");
  if (!safeDecorations.length) warnings.push("No Mangrok illustrations are selected for the edition.");
  if (safeRecipes.length > 75) warnings.push("Large editions should be split into volumes before physical fulfillment.");
  if (estimatedPages % 2 !== 0) estimatedPages += 1;
  if (includeSecrets) warnings.push("Sealed notes will become permanent, non-revocable printed content.");
  if (secretRecipeCount && !includeSecrets) warnings.push(`${secretRecipeCount} sealed recipe${secretRecipeCount === 1 ? " is" : "s are"} included without printing the sealed layer.`);

  return Object.freeze({
    ready: errors.length === 0,
    errors,
    warnings: [...new Set(warnings)],
    title: cleanTitle,
    theme: validTheme ? String(theme) : "unsupported",
    recipeCount: safeRecipes.length,
    secretRecipeCount,
    decorationCount: safeDecorations.length,
    decorations: safeDecorations,
    estimatedPages,
    pageSize: "6 × 9 in",
    bleed: "Not included in browser PDF mode",
    recipeChecks
  });
}

export function buildPrintProofManifest(options = {}) {
  const analysis = analyzePrintProject(options);
  return Object.freeze({
    type: "mangrok.print-proof",
    version: 1,
    generatedAt: new Date().toISOString(),
    ready: analysis.ready,
    title: analysis.title,
    theme: analysis.theme,
    pageSize: analysis.pageSize,
    estimatedPages: analysis.estimatedPages,
    recipeCount: analysis.recipeCount,
    secretRecipeCount: analysis.secretRecipeCount,
    includesSecrets: Boolean(options.includeSecrets),
    secretApprovalRecorded: Boolean(options.secretApprovalAt),
    decorations: analysis.decorations,
    errors: analysis.errors,
    warnings: analysis.warnings,
    recipes: analysis.recipeChecks.map(recipe => ({
      id: recipe.id,
      title: recipe.title,
      estimatedPages: recipe.estimatedPages,
      sealed: recipe.sealed,
      missing: recipe.missing
    })),
    note: "This manifest validates Mangrok browser/PDF output. A physical printer still requires provider-specific bleed, trim, color, paper, binding, and image-resolution proofing."
  });
}

export function buildBookHtml(options) {
  const {
    title,
    dedication = "",
    theme = "heritage",
    recipes = [],
    includeSecrets = false,
    secretApprovalAt = null,
    unlockedSecrets = {},
    decorations = []
  } = options || {};
  assertSecretApproval(includeSecrets, secretApprovalAt);
  const analysis = analyzePrintProject(options);
  if (!analysis.ready) throw new Error(analysis.errors[0]);

  const art = analysis.decorations;
  const tableOfContents = recipes.map((recipe, index) => `
    <li><span>${escapeHtml(recipe.title)}</span><span>${index + 1}</span></li>`).join("");
  const pages = recipes.map((recipe, index) => {
    const secret = includeSecrets ? unlockedSecrets[recipe.id] : "";
    const origin = [recipe.origin?.creator, recipe.origin?.place, recipe.origin?.year].filter(Boolean).map(escapeHtml).join(" · ");
    const decoration = art.length ? ART[art[index % art.length]] : "";
    return `<article class="recipe-page">
      ${decoration ? `<img class="page-art" src="${decoration}" alt="">` : ""}
      <header>
        <p class="eyebrow">Recipe ${index + 1} · ${escapeHtml(PRIVACY[recipe.privacy] || recipe.privacy)}</p>
        <h2>${escapeHtml(recipe.title)}</h2>
        ${recipe.summary ? `<p class="summary">${escapeHtml(recipe.summary)}</p>` : ""}
        ${origin ? `<p class="origin">${origin}</p>` : ""}
      </header>
      <section><h3>Ingredients</h3><ul class="ingredients">${recipe.ingredients.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>
      <section><h3>Method</h3><ol class="steps">${recipe.steps.map((step, stepIndex) => `<li><span class="step-number">${stepIndex + 1}</span>${escapeHtml(step)}</li>`).join("")}</ol></section>
      ${recipe.origin?.story ? `<section class="story"><h3>Story & lineage</h3><p>${escapeHtml(recipe.origin.story).replaceAll("\n", "<br>")}</p></section>` : ""}
      ${secret ? `<aside class="sealed"><h3>Sealed note — intentionally printed</h3><p>${escapeHtml(secret).replaceAll("\n", "<br>")}</p></aside>` : ""}
      <footer>${escapeHtml(recipe.origin?.custodian ? `Custodian: ${recipe.origin.custodian}` : "Preserved with Mangrok")}</footer>
    </article>`;
  }).join("");

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${bookCss(theme)}</style></head><body>
    <section class="cover"><div><p>Mangrok private edition</p><h1>${escapeHtml(title)}</h1>${dedication ? `<blockquote>${escapeHtml(dedication)}</blockquote>` : ""}<small>${recipes.length} preserved recipe${recipes.length === 1 ? "" : "s"}</small></div><div class="cover-art">${art.map(id => `<img src="${ART[id]}" alt="">`).join("")}</div></section>
    <section class="toc"><h2>Contents</h2><ol>${tableOfContents}</ol><p class="notice">Printed information cannot be revoked. Handle sealed notes with care.</p></section>
    ${pages}
  </body></html>`;
}

function bookCss(theme) {
  const palette = theme === "modern" ? { accent: "#335c67", paper: "#fff", ink: "#1e282b" }
    : theme === "botanical" ? { accent: "#456b4d", paper: "#fbf8ec", ink: "#222119" }
      : theme === "pastel" ? { accent: "#b44f75", paper: "#fff5f5", ink: "#33222c" }
        : theme === "midnight" ? { accent: "#d4a74c", paper: "#181310", ink: "#f7ead6" }
          : { accent: "#8a4a32", paper: "#fffdf8", ink: "#201c18" };
  return `@page{size:6in 9in;margin:.55in .55in .65in}@media print{.cover,.toc,.recipe-page{break-after:page}.recipe-page:last-child{break-after:auto}}*{box-sizing:border-box}body{margin:0;color:${palette.ink};font:11pt/1.5 Georgia,serif;background:${palette.paper}}.cover,.toc,.recipe-page{position:relative;min-height:7.8in;padding:.08in;overflow:hidden}.cover{display:grid;place-items:center;text-align:center;border:3px double ${palette.accent}}.cover>div:first-child{position:relative;z-index:2;max-width:4.6in}.cover h1{font-size:34pt;line-height:1.05;margin:.25in 0}.cover p,.eyebrow{letter-spacing:.14em;text-transform:uppercase;font:8pt Arial;color:${palette.accent}}blockquote{font-style:italic}.toc h2,.recipe-page h2{font-size:25pt;color:${palette.accent}}.toc ol{padding:0;list-style:none}.toc li{display:flex;justify-content:space-between;border-bottom:1px dotted #aaa;padding:.08in 0}.recipe-page header{position:relative;z-index:2;border-bottom:1px solid #cdbfae}.recipe-page h3{font:700 9pt Arial;letter-spacing:.1em;text-transform:uppercase;color:${palette.accent}}.ingredients{columns:2}.steps{list-style:none;padding:0}.steps li{display:flex;gap:.12in;margin:.1in 0}.step-number{display:grid;place-items:center;flex:0 0 .24in;height:.24in;border-radius:50%;background:${palette.accent};color:white;font:8pt Arial}.story{border-left:3px solid ${palette.accent};padding-left:.14in}.sealed{border:2px solid ${palette.accent};padding:.15in}.notice{padding:.15in;border:1px solid #b33}.cover-art{position:absolute;inset:0}.cover-art img{position:absolute;width:1.35in;height:1.35in;object-fit:cover;border-radius:50%;filter:drop-shadow(0 .08in .08in rgba(40,24,14,.2))}.cover-art img:nth-child(1){left:-.25in;top:-.2in}.cover-art img:nth-child(2){right:-.25in;top:.6in}.cover-art img:nth-child(3){left:-.2in;bottom:.7in}.cover-art img:nth-child(4){right:-.25in;bottom:-.15in}.page-art{position:absolute;right:-.2in;top:-.12in;width:1.2in;height:1.2in;object-fit:cover;border-radius:50%;opacity:.2}`;
}

export function recipeShareText(recipe, includeSecret = false, secretText = "") {
  const lines = [
    recipe.title,
    recipe.summary,
    "",
    "Ingredients",
    ...recipe.ingredients.map(value => `• ${value}`),
    "",
    "Method",
    ...recipe.steps.map((value, index) => `${index + 1}. ${value}`)
  ];
  if (includeSecret && secretText) lines.push("", "SEALED NOTE — shared intentionally", secretText);
  lines.push("", "Preserved with Mangrok");
  return lines.filter(value => value !== undefined).join("\n");
}
