import { LocalVaultStore } from "./store.js";
import { CloudVault } from "./cloud.js";
import { blankRecipe, normalizeRecipe, validateRecipe, recipeMatches, sortRecipes, PRIVACY, uid, isoNow } from "./model.js";
import { encryptSecret, decryptSecret, encryptShareEnvelope, decryptShareEnvelope } from "./crypto.js";
import { buildBookHtml, recipeShareText, escapeHtml } from "./print.js";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const state = {
  store: new LocalVaultStore(), cloud: new CloudVault(), mode: "local", recipes: [], circles: [], legacyPlans: [], books: [],
  notifications: [], activeRecipeId: null, unlockedSecrets: new Map(), currentView: "vault", publicShare: null
};
const viewMeta = {
  vault: ["Your private collection", "Recipe vault"], circles: ["Permission-based sharing", "Trusted circles"],
  print: ["Private editions", "Print studio"], legacy: ["Future stewardship", "Legacy instructions"], settings: ["Control and recovery", "Settings"]
};

main().catch(error => fatal(error));

async function main() {
  await state.store.init();
  try { await state.cloud.init(); } catch (error) { console.warn("Cloud initialization failed", error); }
  bindEvents();
  await establishMode();
  await loadAll();
  const requested = location.hash.replace("#", "") || "vault";
  switchView(viewMeta[requested] ? requested : "vault", false);
  await handlePublicShare();
  renderAll();
  await registerServiceWorker();
  window.dispatchEvent(new CustomEvent("mangrok:app-ready", { detail: appStatus() }));
}

function bindEvents() {
  $$('[data-view]').forEach(button => button.addEventListener("click", () => switchView(button.dataset.view)));
  $('[data-view-link="vault"]').addEventListener("click", event => { event.preventDefault(); switchView("vault"); });
  $("#new-recipe-button").addEventListener("click", () => openRecipeEditor());
  $("[data-action='new-recipe']").addEventListener("click", () => openRecipeEditor());
  $("#search-input").addEventListener("input", renderRecipes);
  $("#privacy-filter").addEventListener("change", renderRecipes);
  $("#sort-select").addEventListener("change", renderRecipes);
  $("#favorites-filter").addEventListener("change", renderRecipes);
  $("#recipe-grid").addEventListener("click", handleRecipeGridClick);
  $("#recipe-form").addEventListener("submit", saveRecipeFromForm);
  $("#viewer-edit").addEventListener("click", () => openRecipeEditor(activeRecipe()));
  $("#viewer-delete").addEventListener("click", deleteActiveRecipe);
  $("#viewer-unlock").addEventListener("click", unlockActiveSecret);
  $("#viewer-share").addEventListener("click", () => openShareCenter(activeRecipe()));
  $("#viewer-history").addEventListener("click", openHistory);
  $("#new-circle-button").addEventListener("click", () => openCircleEditor());
  $("#circle-form").addEventListener("submit", saveCircleFromForm);
  $("#circle-list").addEventListener("click", handleCircleAction);
  $("#book-form").addEventListener("change", updateBookPreview);
  $("#book-form").addEventListener("submit", printBook);
  $("#preview-book-button").addEventListener("click", updateBookPreview);
  $("#order-book-button").addEventListener("click", orderPhysicalBook);
  $("#legacy-form").addEventListener("submit", saveLegacyPlan);
  $("#legacy-list").addEventListener("click", handleLegacyAction);
  $("#auth-button").addEventListener("click", openAuth);
  $("#settings-auth-button").addEventListener("click", openAuth);
  $("#auth-form").addEventListener("submit", submitAuth);
  $("#export-button").addEventListener("click", exportVault);
  $("#import-input").addEventListener("change", importVault);
  $("#cover-button").addEventListener("click", () => $("#screen-cover").showModal());
  $("#delete-account-button").addEventListener("click", deleteOrErase);
  $("#notifications-button").addEventListener("click", openNotifications);
  $$('[data-close]').forEach(button => button.addEventListener("click", () => $(`#${button.dataset.close}`).close()));
  window.addEventListener("mangrok:auth", async () => { await establishMode(true); await loadAll(); renderAll(); });
  window.addEventListener("mangrok:request-auth-token", event => respondToBridge(event, state.mode === "cloud" ? state.cloud.getAccessToken() : ""));
  window.addEventListener("mangrok:request-app-status", event => respondToBridge(event, appStatus()));
  window.addEventListener("mangrok:request-alchemy-entitlement", event => respondToBridge(event, state.mode === "cloud" ? state.cloud.getAlchemyEntitlement() : null));
  window.addEventListener("mangrok:invoke-alchemy-gateway", event => respondToBridge(event, invokeAlchemyGateway(event.detail)));
  window.addEventListener("mangrok:save-alchemy-experiment", event => respondToBridge(event, saveAlchemyExperiment(event.detail?.experiment)));
  window.addEventListener("mangrok:list-alchemy-experiments", event => respondToBridge(event, state.mode === "cloud" ? state.cloud.listAlchemyExperiments(event.detail?.limit) : []));
  window.addEventListener("mangrok:request-print-draft", event => respondToBridge(event, printDraftOptions()));
  const followHistory = () => { const view = location.hash.slice(1); if (viewMeta[view]) switchView(view, false); };
  window.addEventListener("hashchange", followHistory);
  window.addEventListener("popstate", followHistory);
}

async function establishMode(fromAuthEvent = false) {
  const wasLocal = state.mode === "local";
  state.mode = state.cloud.user ? "cloud" : "local";
  if (state.mode === "cloud" && wasLocal && fromAuthEvent) {
    const localRecipes = await state.store.list("recipes");
    const cloudRecipes = await state.cloud.listRecipes();
    if (localRecipes.length && !cloudRecipes.length && confirm(`Move ${localRecipes.length} device recipe${localRecipes.length === 1 ? "" : "s"} into your secure cloud vault? A device copy will remain until you erase it.`)) {
      for (const recipe of localRecipes) await state.cloud.upsertRecipe({ ...recipe, ownerId: state.cloud.user.id });
      toast("Device recipes copied to your cloud vault.", "success");
    }
  }
}

async function loadAll() {
  if (state.mode === "cloud") {
    [state.recipes, state.circles, state.legacyPlans, state.books, state.notifications] = await Promise.all([
      state.cloud.listRecipes(), state.cloud.listCircles(), state.cloud.listLegacyPlans(), state.cloud.listBooks(), state.cloud.listNotifications()
    ]);
  } else {
    [state.recipes, state.circles, state.legacyPlans, state.books, state.notifications] = await Promise.all([
      state.store.list("recipes"), state.store.list("circles"), state.store.list("legacy"), state.store.list("books"), state.store.list("notifications")
    ]);
  }
}

function renderAll() {
  renderMode(); renderRecipes(); renderCircles(); renderSelections(); renderLegacy(); renderNotifications(); renderCloudStatus();
}
function renderMode() {
  const online = state.mode === "cloud";
  $("#mode-dot").classList.toggle("online", online);
  $("#mode-title").textContent = online ? "Cloud vault" : "Device vault";
  $("#mode-copy").textContent = online ? state.cloud.user.email : "Your data stays in this browser.";
  $("#auth-button").textContent = online ? "Account" : "Connect cloud";
}
function switchView(view, updateHash = true) {
  if (!viewMeta[view]) return;
  const previousView = state.currentView;
  state.currentView = view;
  $$('[data-view-panel]').forEach(panel => panel.classList.toggle("active", panel.dataset.viewPanel === view));
  $$('[data-view]').forEach(button => {
    const active = button.dataset.view === view;
    button.classList.toggle("active", active);
    active ? button.setAttribute("aria-current", "page") : button.removeAttribute("aria-current");
  });
  $("#view-eyebrow").textContent = viewMeta[view][0]; $("#view-title").textContent = viewMeta[view][1];
  $("#new-recipe-button").hidden = view !== "vault";
  const nextHash = `#${view}`;
  if (updateHash && location.hash !== nextHash) history.pushState({ view }, "", nextHash);
  window.dispatchEvent(new CustomEvent("mangrok:view-changed", { detail: { view, previousView } }));
  $("#main").focus({ preventScroll: true });
}

function renderRecipes() {
  const query = $("#search-input").value, privacy = $("#privacy-filter").value, favorites = $("#favorites-filter").checked;
  const recipes = sortRecipes(state.recipes.filter(recipe => recipeMatches(recipe, query, privacy, favorites)), $("#sort-select").value);
  $("#recipe-grid").innerHTML = recipes.map(recipeCard).join("");
  $("#empty-state").hidden = recipes.length > 0;
  $("#stat-recipes").textContent = state.recipes.length;
  $("#stat-sealed").textContent = state.recipes.filter(recipe => recipe.secret).length;
  $("#stat-shared").textContent = state.recipes.filter(recipe => recipe.privacy !== "private" || recipe.sharedCircleIds?.length).length;
}
function recipeCard(recipe) {
  const minutes = [recipe.prepMinutes, recipe.cookMinutes].filter(Number.isFinite).reduce((a,b) => a+b, 0);
  return `<article class="recipe-card" data-id="${escapeHtml(recipe.id)}" data-privacy="${escapeHtml(recipe.privacy)}">
    <div class="card-accent"></div><div class="card-body"><div class="card-top"><span class="privacy-label">${escapeHtml(PRIVACY[recipe.privacy])}</span>
    <button class="favorite-button ${recipe.favorite ? "active" : ""}" data-action="favorite" aria-label="${recipe.favorite ? "Remove from" : "Add to"} favorites">${recipe.favorite ? "Saved" : "Favorite"}</button></div>
    <h3>${escapeHtml(recipe.title)}</h3><p class="summary">${escapeHtml(recipe.summary || recipe.origin?.story || "A recipe preserved in your private vault.")}</p>
    <div class="card-tags">${recipe.tags.slice(0,4).map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}${recipe.secret ? `<span class="sealed-badge">Sealed note</span>` : ""}</div>
    <div class="card-meta"><span>${recipe.ingredients.length} ingredients</span>${minutes ? `<span>${minutes} min</span>` : ""}<span>Revision ${recipe.revision}</span></div>
    <button class="card-open" data-action="open" aria-label="Open ${escapeHtml(recipe.title)}"></button></div></article>`;
}
async function handleRecipeGridClick(event) {
  const card = event.target.closest(".recipe-card"); if (!card) return;
  const recipe = state.recipes.find(item => item.id === card.dataset.id); if (!recipe) return;
  if (event.target.closest('[data-action="favorite"]')) {
    await saveRecipe({ ...recipe, favorite: !recipe.favorite }, "Changed favorite"); return;
  }
  openRecipeViewer(recipe);
}

function openRecipeEditor(recipe = null) {
  const value = recipe ? normalizeRecipe(recipe) : blankRecipe();
  const form = $("#recipe-form"); form.reset();
  $("#recipe-dialog-title").textContent = recipe ? "Edit recipe" : "New recipe";
  for (const [name, fieldValue] of Object.entries({ id:value.id, title:value.title, summary:value.summary, servings:value.servings, privacy:value.privacy,
    prepMinutes:value.prepMinutes ?? "", cookMinutes:value.cookMinutes ?? "", ingredients:value.ingredients.join("\n"), steps:value.steps.join("\n"), tags:value.tags.join(", "),
    creator:value.origin.creator, place:value.origin.place, year:value.origin.year, custodian:value.origin.custodian, story:value.origin.story, secretHint:value.secretHint })) {
    if (form.elements[name]) form.elements[name].value = fieldValue;
  }
  form.dataset.existingSecret = value.secret ? "true" : "false";
  $("#recipe-error").textContent = ""; $("#existing-assets").textContent = value.attachments.length ? `${value.attachments.length} saved attachment reference(s)` : "No saved attachments.";
  $("#viewer-dialog").close(); $("#recipe-dialog").showModal();
}
async function saveRecipeFromForm(event) {
  event.preventDefault();
  if (event.submitter?.value !== "save") return;
  const form = event.currentTarget, data = new FormData(form), id = String(data.get("id"));
  const existing = state.recipes.find(recipe => recipe.id === id) || null;
  try {
    let secret = existing?.secret || null;
    const secretText = String(data.get("secretText") || "").trim();
    if (data.get("removeSecret")) secret = null;
    else if (secretText) secret = await encryptSecret(secretText, String(data.get("secretPassphrase") || ""), id);
    const recipe = normalizeRecipe({ ...existing, id, title:data.get("title"), summary:data.get("summary"), servings:data.get("servings"), privacy:data.get("privacy"),
      prepMinutes:data.get("prepMinutes"), cookMinutes:data.get("cookMinutes"), ingredients:data.get("ingredients"), steps:data.get("steps"), tags:data.get("tags"),
      origin:{ creator:data.get("creator"), place:data.get("place"), year:data.get("year"), custodian:data.get("custodian"), story:data.get("story") },
      secret, secretHint:data.get("secretHint"), attachments:existing?.attachments || [] });
    const errors = validateRecipe(recipe); if (errors.length) throw new Error(errors.join(" "));
    const saved = await saveRecipe(recipe, existing ? "Edited recipe" : "Created recipe");
    const file = form.elements.attachment.files[0];
    if (file) {
      const kind = String(data.get("attachmentKind"));
      if (state.mode === "cloud") await state.cloud.uploadAsset(saved.id, file, kind);
      else { const meta = await state.store.saveAsset(saved.id, file, kind); await saveRecipe({ ...saved, attachments:[...(saved.attachments || []), meta] }, "Added preservation media"); }
    }
    form.reset(); $("#recipe-dialog").close(); await loadAll(); renderAll(); toast("Recipe saved.", "success");
  } catch (error) { $("#recipe-error").textContent = error.message; }
}
async function saveRecipe(recipe, note) {
  let saved;
  if (state.mode === "cloud") saved = await state.cloud.upsertRecipe({ ...recipe, updatedAt:isoNow() });
  else saved = await state.store.saveRecipe(recipe, note);
  await loadAll(); renderAll(); return saved;
}

function openRecipeViewer(recipe) {
  state.activeRecipeId = recipe.id;
  $("#viewer-title").textContent = recipe.title; $("#viewer-privacy").textContent = PRIVACY[recipe.privacy];
  const unlocked = state.unlockedSecrets.get(recipe.id);
  $("#viewer-content").innerHTML = `<div class="viewer-layout"><div><h3>Ingredients</h3><ul>${recipe.ingredients.map(item=>`<li>${escapeHtml(item)}</li>`).join("")}</ul>
    ${recipe.tags.length ? `<div class="card-tags">${recipe.tags.map(tag=>`<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>`:""}</div>
    <div><h3>Method</h3><ol>${recipe.steps.map(item=>`<li>${escapeHtml(item)}</li>`).join("")}</ol>
    ${recipe.origin.story ? `<div class="viewer-story"><h3>Story & lineage</h3><p>${escapeHtml(recipe.origin.story).replaceAll("\n","<br>")}</p><small>${escapeHtml([recipe.origin.creator,recipe.origin.place,recipe.origin.year,recipe.origin.custodian?`Custodian: ${recipe.origin.custodian}`:""].filter(Boolean).join(" · "))}</small></div>`:""}
    ${recipe.secret ? `<div class="viewer-secret"><h3>Sealed note</h3>${unlocked ? `<p>${escapeHtml(unlocked).replaceAll("\n","<br>")}</p>`:`<p>${escapeHtml(recipe.secretHint || "This note is encrypted.")}</p>`}</div>`:""}
    <div id="viewer-assets" class="asset-grid"></div></div></div>`;
  $("#viewer-unlock").hidden = !recipe.secret || Boolean(unlocked); $("#viewer-dialog").showModal(); loadViewerAssets(recipe);
}
async function loadViewerAssets(recipe) {
  const assets = state.mode === "cloud" ? await state.cloud.listAssets(recipe.id) : await state.store.assetsFor(recipe.id);
  const root = $("#viewer-assets"); if (!root) return;
  root.innerHTML = assets.map(asset => `<div class="asset-item"><b>${escapeHtml(asset.kind || "file")}</b><br>${escapeHtml(asset.name)}<br><small>${formatBytes(asset.size || asset.size_bytes)}</small></div>`).join("");
}
function activeRecipe() { return state.recipes.find(recipe => recipe.id === state.activeRecipeId); }
async function unlockActiveSecret() {
  const recipe = activeRecipe(); if (!recipe?.secret) return;
  const passphrase = prompt("Enter the secret passphrase. It will not be stored."); if (!passphrase) return;
  try { const text = await decryptSecret(recipe.secret, passphrase, recipe.id); state.unlockedSecrets.set(recipe.id, text); openRecipeViewer(recipe); toast("Sealed note unlocked for this session.", "success"); }
  catch (error) { toast(error.message, "error"); }
}
async function deleteActiveRecipe() {
  const recipe = activeRecipe(); if (!recipe || !confirm(`Delete “${recipe.title}”? A local history snapshot is retained when available.`)) return;
  if (state.mode === "cloud") await state.cloud.deleteRecipe(recipe.id); else await state.store.deleteRecipe(recipe.id);
  state.unlockedSecrets.delete(recipe.id); $("#viewer-dialog").close(); await loadAll(); renderAll(); toast("Recipe deleted.");
}

async function openHistory() {
  const recipe = activeRecipe(); if (!recipe) return;
  const versions = state.mode === "cloud" ? await state.cloud.versionsFor(recipe.id) : await state.store.versionsFor(recipe.id);
  $("#history-list").innerHTML = versions.length ? versions.map(version => `<div class="stack-item"><div><h4>Revision ${escapeHtml(version.revision)}</h4><p>${escapeHtml(version.note || "Saved version")} · ${new Date(version.created_at || version.createdAt).toLocaleString()}</p></div><button class="mini-button" data-version="${escapeHtml(version.id)}">Restore</button></div>`).join("") : `<p>No earlier versions yet.</p>`;
  $("#history-list").onclick = async event => { const button = event.target.closest("[data-version]"); if (!button || !confirm("Restore this version as a new revision?")) return;
    if (state.mode === "cloud") await state.cloud.restoreVersion(button.dataset.version); else await state.store.restoreVersion(button.dataset.version);
    await loadAll(); renderAll(); $("#history-dialog").close(); $("#viewer-dialog").close(); toast("Version restored.", "success"); };
  $("#history-dialog").showModal();
}

async function openShareCenter(recipe) {
  const dialog = document.createElement("dialog"); dialog.className = "modal";
  const circles = state.circles.map(circle => `<option value="${escapeHtml(circle.id)}">${escapeHtml(circle.name)}</option>`).join("");
  dialog.innerHTML = `<div class="modal-shell"><header><div><p class="eyebrow">Controlled access</p><h2>Share ${escapeHtml(recipe.title)}</h2></div><button class="button ghost" data-dismiss aria-label="Close">Close</button></header>
    <div class="form-stack"><button class="button secondary" data-copy>Copy standard recipe</button><button class="button ghost" data-download>Download portable recipe</button>
    ${state.mode === "cloud" ? `<form id="grant-form" class="form-stack"><h3>Invite or grant</h3><label>Circle<select name="circleId"><option value="">Specific email</option>${circles}</select></label><label>Email<input name="email" type="email"></label><label>Role<select name="role"><option value="viewer">Viewer</option><option value="contributor">Contributor</option><option value="custodian">Custodian</option></select></label><label>Expires<input name="expires" type="date"></label><label class="check-row"><input name="secretAccess" type="checkbox">Permit sealed-note access</label><button class="button primary">Create grant</button></form>
    <form id="link-form" class="form-stack"><h3>Revocable link</h3><label>Expires<input name="expires" type="date"></label><label>Maximum views<input name="maxViews" type="number" min="1" max="1000"></label><label class="check-row"><input name="includeSecret" type="checkbox">Include a separately encrypted sealed note</label><button class="button secondary">Create link</button></form><h3>Active permissions</h3><div id="grant-list" class="stack-list"></div><h3>Share links</h3><div id="link-list" class="stack-list"></div>`:
    `<p class="warning-note">Enforceable invitations and revocation require a connected cloud account. Device mode can copy or export a recipe, but recipients control any copies they receive.</p>`}</div></div>`;
  document.body.append(dialog); dialog.showModal(); dialog.querySelector("[data-dismiss]").onclick = () => dialog.close(); dialog.addEventListener("close",()=>dialog.remove());
  dialog.querySelector("[data-copy]").onclick = async () => { await navigator.clipboard.writeText(recipeShareText(recipe)); toast("Standard recipe copied.","success"); };
  dialog.querySelector("[data-download]").onclick = () => downloadJson(`${slug(recipe.title)}.mangrok-recipe.json`, { type:"mangrok.recipe",version:2,exportedAt:isoNow(),recipe:{...recipe,secret:null} });
  if (state.mode !== "cloud") return;
  const renderGrants = async () => { const grants = await state.cloud.listGrants(recipe.id); dialog.querySelector("#grant-list").innerHTML = grants.map(grant => `<div class="stack-item"><div><h4>${escapeHtml(grant.grantee_email || grant.circle_id || "Grant")}</h4><p>${escapeHtml(grant.role)} · secret ${grant.secret_access?"allowed":"sealed"}${grant.revoked_at?" · revoked":""}</p></div>${grant.revoked_at?"":`<button class="mini-button" data-revoke="${grant.id}">Revoke</button>`}</div>`).join(""); };
  const renderLinks = async () => { const links = await state.cloud.listShareLinks(recipe.id); dialog.querySelector("#link-list").innerHTML = links.length ? links.map(link => `<div class="stack-item"><div><h4>Link from ${new Date(link.created_at).toLocaleDateString()}</h4><p>${link.view_count} view${link.view_count===1?"":"s"}${link.max_views?` / ${link.max_views}`:""}${link.expires_at?` · expires ${new Date(link.expires_at).toLocaleDateString()}`:""}${link.revoked_at?" · revoked":""}</p></div>${link.revoked_at?"":`<button class="mini-button" data-link-revoke="${link.id}">Revoke</button>`}</div>`).join("") : `<p>No active links.</p>`; };
  await Promise.all([renderGrants(), renderLinks()]);
  dialog.querySelector("#grant-list").onclick = async event => { const button=event.target.closest("[data-revoke]"); if(!button)return; await state.cloud.revokeGrant(button.dataset.revoke); await renderGrants(); toast("Access revoked."); };
  dialog.querySelector("#link-list").onclick = async event => { const button=event.target.closest("[data-link-revoke]"); if(!button)return; await state.cloud.revokeShareLink(button.dataset.linkRevoke); await renderLinks(); toast("Share link revoked."); };
  dialog.querySelector("#grant-form").onsubmit = async event => { event.preventDefault(); const data=new FormData(event.currentTarget); if(!data.get("circleId")&&!data.get("email"))return toast("Choose a circle or enter an email.","error");
    await state.cloud.grantRecipe({recipeId:recipe.id,circleId:data.get("circleId")||null,email:data.get("email")||null,role:data.get("role"),secretAccess:Boolean(data.get("secretAccess")),expiresAt:data.get("expires")?new Date(`${data.get("expires")}T23:59:59`).toISOString():null}); event.currentTarget.reset();await renderGrants();toast("Access granted.","success");};
  dialog.querySelector("#link-form").onsubmit = async event => { event.preventDefault(); const data=new FormData(event.currentTarget); let secretPayload=null,fragmentKey="";
    if(data.get("includeSecret")){let secretText=state.unlockedSecrets.get(recipe.id);if(!secretText){const pass=prompt("Unlock the sealed note for this one-time encrypted share link.");if(!pass)return;secretText=await decryptSecret(recipe.secret,pass,recipe.id);}const envelope=await encryptShareEnvelope(secretText);secretPayload=envelope.payload;fragmentKey=envelope.fragmentKey;}
    const result=await state.cloud.createShareLink({recipeId:recipe.id,expiresAt:data.get("expires")?new Date(`${data.get("expires")}T23:59:59`).toISOString():null,maxViews:data.get("maxViews")?Number(data.get("maxViews")):null,secretPayload});
    const token=typeof result==="string"?result:result.token;await renderLinks();const url=`${location.origin}${location.pathname}?share=${encodeURIComponent(token)}${fragmentKey?`#k=${fragmentKey}`:""}`;await navigator.clipboard.writeText(url);toast("Revocable share link copied.","success");};
}

function openCircleEditor(circle=null) {
  const form=$("#circle-form");form.reset();form.elements.id.value=circle?.id||uid("circle");form.elements.name.value=circle?.name||"";form.elements.description.value=circle?.description||"";
  const members=circle?.members||circle?.circle_members||[];form.elements.members.value=members.map(m=>`${m.email} | ${m.role||"viewer"}${m.secretAccess||m.secret_access?" | secret":""}`).join("\n");$("#circle-dialog").showModal();
}
async function saveCircleFromForm(event) {
  event.preventDefault();if(event.submitter?.value!=="save")return;const data=new FormData(event.currentTarget);const members=String(data.get("members")||"").split(/\r?\n/).map(line=>line.trim()).filter(Boolean).map(line=>{const parts=line.split("|").map(v=>v.trim());return{email:parts[0],role:["viewer","contributor","custodian"].includes(parts[1])?parts[1]:"viewer",secretAccess:parts.slice(2).some(v=>/secret/i.test(v))};});
  const circle={id:String(data.get("id")),name:String(data.get("name")).trim(),description:String(data.get("description")||"").trim(),members,createdAt:isoNow()};if(!circle.name)return;
  if(state.mode==="cloud")await state.cloud.saveCircle(circle);else await state.store.put("circles",circle);$("#circle-dialog").close();await loadAll();renderAll();toast("Circle saved.","success");
}
function renderCircles(){const root=$("#circle-list");root.innerHTML=state.circles.length?state.circles.map(circle=>{const members=circle.members||circle.circle_members||[];return`<div class="stack-item"><div><h4>${escapeHtml(circle.name)}</h4><p>${members.length} member${members.length===1?"":"s"} · ${escapeHtml(circle.description||"No description")}</p></div><div class="stack-item-actions"><button class="mini-button" data-circle-edit="${escapeHtml(circle.id)}">Edit</button><button class="mini-button" data-circle-delete="${escapeHtml(circle.id)}">Delete</button></div></div>`}).join(""):`<p>No circles yet. Create one for family, collaborators, or trusted friends.</p>`;}
async function handleCircleAction(event){const edit=event.target.closest("[data-circle-edit]"),del=event.target.closest("[data-circle-delete]");if(edit){openCircleEditor(state.circles.find(c=>c.id===edit.dataset.circleEdit));return;}if(del&&confirm("Delete this circle? Existing direct recipe grants are not automatically deleted.")){if(state.mode==="cloud"){const{error}=await state.cloud.client.from("circles").delete().eq("id",del.dataset.circleDelete);if(error)throw error;}else await state.store.remove("circles",del.dataset.circleDelete);await loadAll();renderCircles();}}

function renderSelections(){const items=state.recipes.map(recipe=>`<label class="selection-item"><input type="checkbox" value="${escapeHtml(recipe.id)}"><span>${escapeHtml(recipe.title)}${recipe.secret?" · sealed":""}</span></label>`).join("")||"<p>Add recipes first.</p>";$("#print-recipe-list").innerHTML=items;$("#legacy-recipe-list").innerHTML=items;}
function selectedRecipes(form,selector){const ids=$$(`${selector} input:checked`,form).map(input=>input.value);return state.recipes.filter(recipe=>ids.includes(recipe.id));}
async function ensureSecrets(recipes){for(const recipe of recipes.filter(r=>r.secret&&!state.unlockedSecrets.has(r.id))){const pass=prompt(`Passphrase for “${recipe.title}” (Cancel to exclude all secrets)`);if(!pass)throw new Error("Secret printing cancelled.");state.unlockedSecrets.set(recipe.id,await decryptSecret(recipe.secret,pass,recipe.id));}}
function printDraftOptions(){const form=$("#book-form"),data=new FormData(form),recipes=selectedRecipes(form,"#print-recipe-list"),includeSecrets=Boolean(data.get("includeSecrets"));let decorations=[];try{const parsed=JSON.parse(String(data.get("decorations")||"[]"));if(Array.isArray(parsed))decorations=parsed.slice(0,4);}catch{}
  return{title:String(data.get("title")||""),dedication:String(data.get("dedication")||""),theme:String(data.get("theme")||"heritage"),decorations,recipes,includeSecrets,secretApprovalAt:includeSecrets&&data.get("secretApproval")?isoNow():null};}
async function bookOptions(requireApproval=false){const draft=printDraftOptions();if(!draft.recipes.length)throw new Error("Select at least one recipe.");if(draft.includeSecrets){if(requireApproval&&!draft.secretApprovalAt)throw new Error("Approve irreversible secret printing first.");await ensureSecrets(draft.recipes);}return{...draft,unlockedSecrets:Object.fromEntries(state.unlockedSecrets)};}
async function updateBookPreview(){const include=$("#book-form").elements.includeSecrets.checked;$("#secret-approval").hidden=!include;const title=$("#book-form").elements.title.value||"Our Family Recipes";const count=$$("#print-recipe-list input:checked").length;$("#book-preview").innerHTML=`<div class="book-cover"><span>Mangrok private edition</span><h3>${escapeHtml(title)}</h3><p>${count?`${count} selected recipe${count===1?"":"s"}`:"Select recipes to preview your book."}</p></div>`;}
async function printBook(event){event.preventDefault();try{const options=await bookOptions(true),html=buildBookHtml(options),win=open("","mangrok-book");if(!win)throw new Error("Allow pop-ups to open the print preview.");win.document.write(html);win.document.close();win.focus();setTimeout(()=>win.print(),250);const book={id:uid("book"),title:options.title,dedication:options.dedication,theme:options.theme,decorations:options.decorations,recipeIds:options.recipes.map(r=>r.id),includeSecrets:options.includeSecrets,secretApprovalAt:options.secretApprovalAt,createdAt:isoNow()};if(state.mode==="cloud")await state.cloud.saveBook(book);else await state.store.put("books",book);toast("Print edition prepared.","success");}catch(error){toast(error.message,"error");}}
async function orderPhysicalBook(){try{if(state.mode!=="cloud")throw new Error("Connect a cloud account before requesting physical fulfillment.");const options=await bookOptions(true);const book=await state.cloud.saveBook({title:options.title,dedication:options.dedication,theme:options.theme,decorations:options.decorations,recipeIds:options.recipes.map(r=>r.id),includeSecrets:options.includeSecrets,secretApprovalAt:options.secretApprovalAt});const result=await state.cloud.orderBook(book.id);toast(result?.message||"Print request recorded.",result?.status==="provider_not_configured"?"error":"success");}catch(error){toast(error.message,"error");}}

async function saveLegacyPlan(event){event.preventDefault();const data=new FormData(event.currentTarget),recipeIds=selectedRecipes(event.currentTarget,"#legacy-recipe-list").map(r=>r.id);if(!recipeIds.length)return toast("Select at least one recipe.","error");const plan={id:uid("legacy"),primaryEmail:String(data.get("primaryEmail")),backupEmail:String(data.get("backupEmail")||""),releaseAfter:data.get("releaseAfter")||null,inactivityMonths:data.get("inactivityMonths")?Number(data.get("inactivityMonths")):null,recipeIds,sealedMessage:String(data.get("sealedMessage")||""),status:"active",humanReviewRequired:true,createdAt:isoNow()};if(state.mode==="cloud")await state.cloud.saveLegacyPlan(plan);else await state.store.put("legacy",plan);event.currentTarget.reset();await loadAll();renderAll();toast("Legacy instructions saved for human review.","success");}
function renderLegacy(){const root=$("#legacy-list");root.innerHTML=state.legacyPlans.length?state.legacyPlans.map(plan=>`<div class="stack-item"><div><h4>${escapeHtml(plan.primaryEmail||plan.primary_recipient_email)}</h4><p>${(plan.recipeIds||plan.recipe_ids||[]).length} recipes · ${escapeHtml(plan.status||"active")} · human review required</p></div><button class="mini-button" data-legacy-delete="${escapeHtml(plan.id)}">Cancel</button></div>`).join(""):`<p>No legacy instructions recorded.</p>`;}
async function handleLegacyAction(event){const button=event.target.closest("[data-legacy-delete]");if(!button||!confirm("Cancel these legacy instructions?"))return;if(state.mode==="cloud"){const{error}=await state.cloud.client.from("legacy_plans").update({status:"cancelled"}).eq("id",button.dataset.legacyDelete);if(error)throw error;}else await state.store.remove("legacy",button.dataset.legacyDelete);await loadAll();renderLegacy();}

function openAuth(){const form=$("#auth-form"),online=state.mode==="cloud";form.reset();$("#auth-error").textContent="";$("#auth-content").innerHTML=online?`<p>Signed in as <b>${escapeHtml(state.cloud.user.email)}</b>. Your cloud records are governed by database access policies.</p><button class="button danger ghost" type="button" id="signout-button">Sign out</button>`:`<p>Enter your email to receive a secure sign-in link. Device recipes remain available even without cloud configuration.</p><label>Email<input name="email" type="email" required autocomplete="email"></label>${state.cloud.enabled?"":`<p class="warning-note">The repository is cloud-ready, but this deployment has no Supabase URL or anonymous key in <code>runtime-config.js</code>.</p>`}`;form.querySelector("footer .primary").hidden=online;$("#auth-dialog").showModal();const signout=$("#signout-button");if(signout)signout.onclick=async()=>{await state.cloud.signOut();$("#auth-dialog").close();};}
async function submitAuth(event){event.preventDefault();if(event.submitter?.value!=="signin")return;try{if(!state.cloud.enabled)throw new Error("Cloud synchronization has not been activated for this deployment.");await state.cloud.signIn(new FormData(event.currentTarget).get("email"));$("#auth-error").textContent="Check your email for the secure sign-in link.";}catch(error){$("#auth-error").textContent=error.message;}}
function renderCloudStatus(){const online=state.mode==="cloud",configured=state.cloud.enabled;$("#cloud-status").className=`status-banner ${online?"online":""}`;$("#cloud-status").innerHTML=online?`<b>Connected</b><br>${escapeHtml(state.cloud.user.email)}`:configured?`<b>Ready to connect</b><br>Sign in by email to synchronize.`:`<b>Device-only mode</b><br>Backend credentials are intentionally absent from this public repository.`;$("#settings-auth-button").textContent=online?"Manage account":"Connect account";}

async function exportVault(){const value=state.mode==="cloud"?await state.cloud.exportAccount():await state.store.exportBackup();downloadJson(`mangrok-vault-${new Date().toISOString().slice(0,10)}.json`,value);toast("Vault export created.","success");}
async function importVault(event){const file=event.target.files[0];if(!file)return;try{if(state.mode==="cloud")throw new Error("Import into device mode first, then connect and approve migration.");const parsed=JSON.parse(await file.text());await state.store.importBackup(parsed,confirm("Replace current device data? Choose Cancel to merge."));await loadAll();renderAll();toast("Vault imported.","success");}catch(error){toast(error.message,"error");}finally{event.target.value="";}}
async function deleteOrErase(){if(state.mode==="cloud"){if(!confirm("Request cloud-account deletion? A cooling-off period applies and an operator must execute the request."))return;await state.cloud.requestAccountDeletion();toast("Deletion request recorded.","success");return;}if(!confirm("Erase all Mangrok data from this browser? Export a backup first. This cannot be undone."))return;for(const name of ["recipes","versions","circles","books","legacy","notifications","assets"])await state.store.clear(name);state.unlockedSecrets.clear();await loadAll();renderAll();toast("Device vault erased.");}

function renderNotifications(){const unread=state.notifications.filter(item=>!(item.read||item.read_at)).length;const badge=$("#notification-count");badge.hidden=!unread;badge.textContent=unread;}
async function openNotifications(){$("#notifications-list").innerHTML=state.notifications.length?state.notifications.map(item=>`<div class="stack-item"><div><h4>${escapeHtml(item.kind||"Activity")}</h4><p>${escapeHtml(item.message)} · ${new Date(item.created_at||item.createdAt).toLocaleString()}</p></div></div>`).join(""):`<p>No notifications.</p>`;$("#notifications-dialog").showModal();if(state.mode==="cloud")await state.cloud.markNotificationsRead();else await state.store.markNotificationsRead();await loadAll();renderNotifications();}

async function handlePublicShare(){const token=new URLSearchParams(location.search).get("share");if(!token)return;if(!state.cloud.enabled){toast("This share link requires the configured Mangrok cloud service.","error");return;}try{const result=await state.cloud.getSharedRecipe(token),payload=Array.isArray(result)?result[0]:result;if(!payload)throw new Error("Share link not found or no longer active.");let secret="";const fragment=new URLSearchParams(location.hash.replace(/^#/,"")).get("k");if(payload.secret_payload&&fragment)secret=await decryptShareEnvelope(payload.secret_payload,fragment);showPublicShare(payload.recipe,secret);}catch(error){toast(error.message,"error");}}
function showPublicShare(recipeData,secret){const recipe=normalizeRecipe(recipeData);const dialog=document.createElement("dialog");dialog.className="modal wide-modal";dialog.innerHTML=`<div class="modal-shell"><header><div><p class="eyebrow">Shared with you</p><h2>${escapeHtml(recipe.title)}</h2></div><button class="button ghost" data-dismiss>Close</button></header><div class="viewer-layout"><div><h3>Ingredients</h3><ul>${recipe.ingredients.map(v=>`<li>${escapeHtml(v)}</li>`).join("")}</ul></div><div><h3>Method</h3><ol>${recipe.steps.map(v=>`<li>${escapeHtml(v)}</li>`).join("")}</ol>${secret?`<div class="viewer-secret"><h3>Sealed note — shared intentionally</h3><p>${escapeHtml(secret)}</p></div>`:""}</div></div><p class="warning-note">This access may expire or be revoked. Visible information can still be copied outside Mangrok.</p></div>`;document.body.append(dialog);dialog.showModal();dialog.querySelector("[data-dismiss]").onclick=()=>dialog.close();dialog.addEventListener("close",()=>dialog.remove());}

function downloadJson(name,value){const blob=new Blob([JSON.stringify(value,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function toast(message,kind="info"){const node=document.createElement("div");node.className=`toast ${kind}`;node.textContent=message;$("#toast-region").append(node);setTimeout(()=>node.remove(),5000);}
function fatal(error){console.error(error);document.body.innerHTML=`<main style="max-width:700px;margin:10vh auto;padding:30px"><h1>Mangrok could not open</h1><p>${escapeHtml(error.message)}</p><p>Try reloading. Your browser data has not been intentionally changed.</p></main>`;}
function formatBytes(value){const n=Number(value)||0;if(n<1024)return`${n} B`;if(n<1048576)return`${(n/1024).toFixed(1)} KB`;return`${(n/1048576).toFixed(1)} MB`;}
function slug(value){return String(value).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,80)||"recipe";}
async function registerServiceWorker(){
  if (!("serviceWorker" in navigator) || location.protocol === "file:") return null;
  try {
    let hadController = Boolean(navigator.serviceWorker.controller);
    const registration = await navigator.serviceWorker.register("./sw.js");
    const announceUpdate = () => showUpdateNotice();
    if (registration.waiting && hadController) announceUpdate();
    registration.addEventListener("updatefound", () => {
      const worker = registration.installing;
      worker?.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) announceUpdate();
      });
    });
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!hadController) { hadController = true; return; }
      if (readSessionValue("mangrok.update-notice") === String(window.MANGROK_CONFIG?.appVersion || "current")) return;
      announceUpdate();
    });
    return registration;
  } catch (error) {
    console.warn("Service worker", error);
    return null;
  }
}
function showUpdateNotice(){if(document.querySelector("#mangrok-update-notice"))return;const version=String(window.MANGROK_CONFIG?.appVersion||"new");const node=document.createElement("aside");node.id="mangrok-update-notice";node.className="update-notice";node.setAttribute("role","status");node.innerHTML=`<div><b>A new Mangrok version is ready</b><p>Reload to use the latest Alchemy, kitchen, and Print Studio improvements.</p></div><button class="button primary" type="button">Reload</button><button class="button ghost" type="button" data-update-dismiss>Later</button>`;document.body.append(node);node.querySelector(".primary").onclick=()=>{writeSessionValue("mangrok.update-notice",version);location.reload()};node.querySelector("[data-update-dismiss]").onclick=()=>{writeSessionValue("mangrok.update-notice",version);node.remove()};}
function readSessionValue(key){try{return sessionStorage.getItem(key)}catch{return null}}
function writeSessionValue(key,value){try{sessionStorage.setItem(key,value)}catch{}}
function appStatus(){return{appVersion:String(window.MANGROK_CONFIG?.appVersion||"unversioned"),mode:state.mode,currentView:state.currentView,cloudConfigured:state.cloud.enabled,signedIn:state.mode==="cloud",userEmail:state.cloud.user?.email||"",recipeCount:state.recipes.length,bookCount:state.books.length,legacyPlanCount:state.legacyPlans.length};}
function respondToBridge(event,value){const resolve=event.detail?.resolve,reject=event.detail?.reject;if(typeof resolve!=="function")return;Promise.resolve(value).then(resolve,error=>typeof reject==="function"?reject(error):resolve(null));}
async function invokeAlchemyGateway(detail={}){if(state.mode!=="cloud")throw new Error("Sign in before using the Mangrok subscriber gateway.");return state.cloud.runAlchemyGateway({messages:detail.messages,requestId:detail.requestId});}
async function saveAlchemyExperiment(experiment){if(state.mode!=="cloud"||!experiment)return null;return state.cloud.saveAlchemyExperiment(experiment);}
