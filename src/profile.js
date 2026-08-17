const DB_NAME = "mangrok-vault-v2";
const PROFILE_ID = "profile";
const SUPABASE_MODULE = "https://esm.sh/@supabase/supabase-js@2.57.4";

export const PROFILE_ROLES = Object.freeze({
  recipe_custodian: "Recipe custodian",
  family_historian: "Family food historian",
  home_cook: "Home cook",
  professional_chef: "Professional chef",
  culinary_researcher: "Culinary researcher"
});

export const PROFILE_PRIVACY = Object.freeze({
  private: "Only me",
  family: "Family vault",
  trusted: "Trusted circle",
  open: "Open recipe"
});

export function normalizeProfile(value = {}, context = {}) {
  const email = cleanText(value.email || context.email, 320);
  const metadataName = cleanText(
    context.userMetadata?.full_name || context.userMetadata?.name || context.userMetadata?.display_name,
    120
  );
  const emailName = email.includes("@") ? email.split("@")[0].replace(/[._-]+/g, " ") : "";
  const displayName = cleanText(value.displayName ?? value.display_name, 120)
    || metadataName
    || titleCase(emailName);
  const role = String(value.culinaryRole ?? value.culinary_role ?? "recipe_custodian");
  const privacy = String(value.defaultPrivacy ?? value.default_privacy ?? "private");

  return {
    id: String(value.id || PROFILE_ID),
    schemaVersion: 1,
    email,
    displayName,
    culinaryRole: Object.hasOwn(PROFILE_ROLES, role) ? role : "recipe_custodian",
    heritageNotes: cleanText(value.heritageNotes ?? value.heritage_notes, 1000),
    preservationNote: cleanText(value.preservationNote ?? value.preservation_note, 1600),
    defaultPrivacy: Object.hasOwn(PROFILE_PRIVACY, privacy) ? privacy : "private",
    custodianName: cleanText(value.custodianName ?? value.custodian_name, 120),
    createdAt: value.createdAt || value.created_at || null,
    updatedAt: value.updatedAt || value.updated_at || null
  };
}

export function profileInitials(profile = {}) {
  const source = cleanText(profile.displayName || profile.email, 120);
  if (!source) return "M";
  const parts = source.replace(/@.*$/, "").replace(/[._-]+/g, " ").split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts.at(-1)[0]}` : parts[0].slice(0, 2)).toUpperCase();
}

export function profileCompleteness(profile = {}) {
  const normalized = normalizeProfile(profile);
  const checks = [
    normalized.displayName,
    normalized.culinaryRole,
    normalized.heritageNotes,
    normalized.preservationNote,
    normalized.defaultPrivacy,
    normalized.custodianName
  ];
  return Math.round(checks.filter(Boolean).length / checks.length * 100);
}

export function archiveReadiness(recipes = []) {
  const values = Array.isArray(recipes) ? recipes : [];
  const total = values.length;
  const count = predicate => values.filter(predicate).length;
  const storyCount = count(recipe => Boolean(recipe?.origin?.story));
  const lineageCount = count(recipe => {
    const origin = recipe?.origin || {};
    return Boolean(origin.creator || origin.place || origin.year);
  });
  const custodianCount = count(recipe => Boolean(recipe?.origin?.custodian));
  const sealedCount = count(recipe => Boolean(recipe?.secret || recipe?.secret_ciphertext));
  const percent = amount => total ? Math.round(amount / total * 100) : 0;
  return {
    total,
    storyCount,
    lineageCount,
    custodianCount,
    sealedCount,
    storyPercent: percent(storyCount),
    lineagePercent: percent(lineageCount),
    custodianPercent: percent(custodianCount)
  };
}

const runtime = {
  profile: normalizeProfile(),
  recipes: [],
  circles: [],
  legacyPlans: [],
  books: [],
  mode: "local",
  appStatus: null,
  cloudClient: null,
  cloudUser: null,
  databasePromise: null,
  active: false,
  formDirty: false,
  initialized: false
};

if (typeof document !== "undefined") ready(init);

function ready(callback) {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", callback, { once: true });
  else callback();
}

async function init() {
  if (runtime.initialized) return;
  runtime.initialized = true;
  injectNavigation();
  injectProfileView();
  bindProfileEvents();
  await refreshProfile();

  if (location.hash.replace(/^#/, "") === "profile") activateProfile(false);

  window.addEventListener("mangrok:app-ready", async event => {
    runtime.appStatus = event.detail || null;
    await refreshProfile();
    if (location.hash.replace(/^#/, "") === "profile") activateProfile(false);
  });
  window.addEventListener("mangrok:auth", async () => {
    await refreshProfile();
    if (runtime.active) renderProfile();
  });
  window.addEventListener("mangrok:view-changed", event => {
    if (String(event.detail?.view || "") !== "profile" && runtime.active) deactivateProfile();
  });
  window.addEventListener("hashchange", () => {
    const view = location.hash.replace(/^#/, "") || "vault";
    if (view === "profile") activateProfile(false);
    else if (runtime.active) deactivateProfile();
  });
}

function injectNavigation() {
  const desktopNav = document.querySelector(".sidebar .nav-list");
  if (desktopNav && !desktopNav.querySelector("[data-profile-view]")) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "nav-item";
    button.dataset.profileView = "profile";
    button.textContent = "Profile";
    const settings = desktopNav.querySelector('[data-view="settings"]');
    desktopNav.insertBefore(button, settings || null);
  }

  const mobileMoreNav = document.querySelector("#mobile-more-dialog nav");
  if (mobileMoreNav && !mobileMoreNav.querySelector("[data-profile-view]")) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.profileView = "profile";
    button.innerHTML = "<b>Profile</b><small>Your culinary identity and archive defaults</small>";
    mobileMoreNav.prepend(button);
  }
}

function injectProfileView() {
  const main = document.querySelector("#main");
  if (!main || document.querySelector("#view-profile")) return;
  const section = document.createElement("section");
  section.className = "view";
  section.id = "view-profile";
  section.dataset.viewPanel = "profile";
  section.innerHTML = `
    <div class="section-intro profile-intro">
      <div>
        <p class="eyebrow">The person behind the archive</p>
        <h2>Your profile</h2>
        <p>Record the identity, traditions, and stewardship defaults that belong with your recipe collection.</p>
      </div>
      <button class="button secondary" type="button" id="profile-account-button">Connect account</button>
    </div>

    <div class="profile-layout">
      <section class="panel profile-identity-card" aria-labelledby="profile-identity-name">
        <div class="profile-avatar" id="profile-avatar" aria-hidden="true">M</div>
        <p class="eyebrow" id="profile-mode-label">Device profile</p>
        <h3 id="profile-identity-name">Recipe custodian</h3>
        <p id="profile-role-label">Recipe custodian</p>
        <div class="profile-email" id="profile-email">Private to this browser</div>
        <p class="profile-purpose" id="profile-purpose">Add why these recipes matter to you.</p>
        <dl class="profile-identity-meta">
          <div><dt>Default access</dt><dd id="profile-default-access">Only me</dd></div>
          <div><dt>Custodian credit</dt><dd id="profile-custodian-credit">Not set</dd></div>
          <div><dt>Last updated</dt><dd id="profile-updated">Not saved yet</dd></div>
        </dl>
      </section>

      <form class="panel form-stack profile-form" id="profile-form">
        <h3>Archive identity</h3>
        <label>Display name
          <input name="displayName" required minlength="2" maxlength="120" autocomplete="name" placeholder="How your archive should address you">
        </label>
        <label>Your role in the archive
          <select name="culinaryRole">
            <option value="recipe_custodian">Recipe custodian</option>
            <option value="family_historian">Family food historian</option>
            <option value="home_cook">Home cook</option>
            <option value="professional_chef">Professional chef</option>
            <option value="culinary_researcher">Culinary researcher</option>
          </select>
        </label>
        <label>Traditions and places
          <textarea name="heritageNotes" rows="4" maxlength="1000" placeholder="Communities, regions, languages, or food traditions represented in your archive"></textarea>
        </label>
        <label>What you are preserving
          <textarea name="preservationNote" rows="5" maxlength="1600" placeholder="Why these recipes matter and what future readers should understand"></textarea>
        </label>
        <div class="profile-form-grid">
          <label>Default recipe access
            <select name="defaultPrivacy">
              <option value="private">Only me</option>
              <option value="family">Family vault</option>
              <option value="trusted">Trusted circle</option>
              <option value="open">Open recipe</option>
            </select>
          </label>
          <label>Default custodian credit
            <input name="custodianName" maxlength="120" placeholder="Name prefilled on new recipes">
          </label>
        </div>
        <p class="profile-form-note">Defaults help with new recipes. They never change existing recipe permissions or reveal sealed notes.</p>
        <p class="profile-save-status" id="profile-save-status" role="status" aria-live="polite"></p>
        <div class="button-row">
          <button class="button primary" type="submit">Save profile</button>
        </div>
      </form>

      <aside class="profile-side-stack">
        <section class="panel profile-stat-panel">
          <h3>Vault stewardship</h3>
          <div class="profile-stat-grid">
            <div><strong id="profile-stat-recipes">0</strong><span>Recipes</span></div>
            <div><strong id="profile-stat-sealed">0</strong><span>Sealed notes</span></div>
            <div><strong id="profile-stat-circles">0</strong><span>Circles</span></div>
            <div><strong id="profile-stat-legacy">0</strong><span>Legacy plans</span></div>
          </div>
        </section>

        <section class="panel profile-readiness-panel">
          <h3>Archive readiness</h3>
          <div class="profile-readiness-list">
            <div class="profile-readiness-row"><div><span>Profile completed</span><strong id="profile-ready-profile">0%</strong></div><div class="profile-meter"><i id="profile-meter-profile"></i></div></div>
            <div class="profile-readiness-row"><div><span>Recipes with a story</span><strong id="profile-ready-story">0%</strong></div><div class="profile-meter"><i id="profile-meter-story"></i></div></div>
            <div class="profile-readiness-row"><div><span>Recipes with origin details</span><strong id="profile-ready-lineage">0%</strong></div><div class="profile-meter"><i id="profile-meter-lineage"></i></div></div>
            <div class="profile-readiness-row"><div><span>Recipes with a custodian</span><strong id="profile-ready-custodian">0%</strong></div><div class="profile-meter"><i id="profile-meter-custodian"></i></div></div>
          </div>
          <p id="profile-readiness-copy">Add your first recipe to begin measuring archive readiness.</p>
        </section>

        <section class="profile-privacy-note">
          <b>Private by design</b>
          <p id="profile-privacy-copy">This profile is stored only in this browser. It is not included in recipe share links or printed books.</p>
        </section>
      </aside>
    </div>`;

  const settings = document.querySelector('#view-settings');
  main.insertBefore(section, settings || null);
}

function bindProfileEvents() {
  document.addEventListener("click", event => {
    const profileDestination = event.target.closest("[data-profile-view]");
    if (profileDestination) {
      event.preventDefault();
      activateProfile();
      document.querySelector("#mobile-more-dialog")?.close?.();
      return;
    }

    const standardDestination = event.target.closest("[data-view]");
    if (standardDestination && runtime.active) deactivateProfile();

    const createsRecipe = event.target.closest("#new-recipe-button,[data-action='new-recipe']");
    if (createsRecipe) queueMicrotask(applyRecipeDefaults);

    if (event.target.closest("#profile-account-button")) document.querySelector("#auth-button")?.click();
  }, true);

  const form = document.querySelector("#profile-form");
  form?.addEventListener("input", () => { runtime.formDirty = true; });
  form?.addEventListener("submit", saveProfile);
}

function activateProfile(updateHash = true) {
  const panel = document.querySelector("#view-profile");
  if (!panel) return;
  const previousView = document.querySelector("[data-view-panel].active")?.dataset.viewPanel || "vault";
  runtime.active = true;
  document.querySelectorAll("[data-view-panel]").forEach(item => item.classList.toggle("active", item === panel));
  document.querySelectorAll("[data-view]").forEach(button => {
    button.classList.remove("active");
    button.removeAttribute("aria-current");
  });
  document.querySelector("#view-eyebrow").textContent = "The person behind the archive";
  document.querySelector("#view-title").textContent = "Profile";
  const newRecipe = document.querySelector("#new-recipe-button");
  if (newRecipe) newRecipe.hidden = true;
  if (updateHash && location.hash !== "#profile") history.pushState({ view: "profile" }, "", "#profile");
  window.dispatchEvent(new CustomEvent("mangrok:view-changed", { detail: { view: "profile", previousView } }));
  syncProfileNavigation(true);
  renderProfile();
  document.querySelector("#main")?.focus({ preventScroll: true });
}

function deactivateProfile() {
  runtime.active = false;
  syncProfileNavigation(false);
}

function syncProfileNavigation(active) {
  document.querySelectorAll("[data-profile-view]").forEach(button => {
    button.classList.toggle("active", active);
    active ? button.setAttribute("aria-current", "page") : button.removeAttribute("aria-current");
  });
  const more = document.querySelector("#mobile-more-button");
  if (more) {
    more.classList.toggle("active", active);
    active ? more.setAttribute("aria-current", "page") : more.removeAttribute("aria-current");
  }
}

async function refreshProfile() {
  try {
    runtime.appStatus = runtime.appStatus || await requestAppStatus();
    runtime.mode = runtime.appStatus?.mode === "cloud" ? "cloud" : "local";
    if (runtime.mode === "cloud") await loadCloudProfile();
    else await loadLocalProfile();
    renderProfile();
  } catch (error) {
    showProfileStatus(error instanceof Error ? error.message : "Could not load the profile.", "error");
  }
}

async function loadLocalProfile() {
  const [saved, recipes, circles, legacyPlans, books] = await Promise.all([
    localGet("settings", PROFILE_ID),
    localList("recipes"),
    localList("circles"),
    localList("legacy"),
    localList("books")
  ]);
  runtime.profile = normalizeProfile(saved || {});
  runtime.recipes = recipes;
  runtime.circles = circles;
  runtime.legacyPlans = legacyPlans;
  runtime.books = books;
  runtime.cloudUser = null;
}

async function loadCloudProfile() {
  const client = await getCloudClient();
  if (!client) throw new Error("Cloud profile is unavailable because Supabase is not configured.");
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  const user = sessionData.session?.user;
  if (!user) {
    runtime.mode = "local";
    return loadLocalProfile();
  }
  runtime.cloudUser = user;

  const [profileResult, recipeResult, circleResult, legacyResult, bookResult] = await Promise.all([
    client.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    client.from("recipes").select("origin,secret_ciphertext,privacy").eq("owner_id", user.id),
    client.from("circles").select("id").eq("owner_id", user.id),
    client.from("legacy_plans").select("id,status").eq("owner_id", user.id),
    client.from("books").select("id").eq("owner_id", user.id)
  ]);
  for (const result of [profileResult, recipeResult, circleResult, legacyResult, bookResult]) {
    if (result.error) throw result.error;
  }

  runtime.profile = normalizeProfile(profileResult.data || {}, {
    email: user.email,
    userMetadata: user.user_metadata || {}
  });
  runtime.recipes = (recipeResult.data || []).map(recipe => ({
    origin: recipe.origin || {},
    secret: recipe.secret_ciphertext ? { ciphertext: recipe.secret_ciphertext } : null,
    privacy: recipe.privacy
  }));
  runtime.circles = circleResult.data || [];
  runtime.legacyPlans = legacyResult.data || [];
  runtime.books = bookResult.data || [];
}

function renderProfile() {
  const panel = document.querySelector("#view-profile");
  if (!panel) return;
  const profile = runtime.profile;
  const readiness = archiveReadiness(runtime.recipes);
  const name = profile.displayName || "Recipe custodian";
  const role = PROFILE_ROLES[profile.culinaryRole] || PROFILE_ROLES.recipe_custodian;
  const isCloud = runtime.mode === "cloud";

  setText("#profile-avatar", profileInitials(profile));
  setText("#profile-mode-label", isCloud ? "Cloud profile" : "Device profile");
  setText("#profile-identity-name", name);
  setText("#profile-role-label", role);
  setText("#profile-email", isCloud ? profile.email || runtime.cloudUser?.email || "Connected account" : "Private to this browser");
  setText("#profile-purpose", profile.preservationNote || "Add why these recipes matter to you.");
  setText("#profile-default-access", PROFILE_PRIVACY[profile.defaultPrivacy] || PROFILE_PRIVACY.private);
  setText("#profile-custodian-credit", profile.custodianName || profile.displayName || "Not set");
  setText("#profile-updated", profile.updatedAt ? formatDate(profile.updatedAt) : "Not saved yet");
  setText("#profile-account-button", isCloud ? "Manage account" : "Connect account");

  setText("#profile-stat-recipes", runtime.recipes.length);
  setText("#profile-stat-sealed", readiness.sealedCount);
  setText("#profile-stat-circles", runtime.circles.length);
  setText("#profile-stat-legacy", runtime.legacyPlans.filter(plan => plan.status !== "cancelled").length);

  setMeter("profile", profileCompleteness(profile));
  setMeter("story", readiness.storyPercent);
  setMeter("lineage", readiness.lineagePercent);
  setMeter("custodian", readiness.custodianPercent);
  setText(
    "#profile-readiness-copy",
    readiness.total
      ? `${readiness.storyCount} of ${readiness.total} recipes include a story; ${readiness.lineageCount} record an origin and ${readiness.custodianCount} name a custodian.`
      : "Add your first recipe to begin measuring archive readiness."
  );
  setText(
    "#profile-privacy-copy",
    isCloud
      ? "Your profile is available only to your signed-in account through row-level database policies. It is not included in recipe share links or printed books."
      : "This profile is stored only in this browser. It is not included in recipe share links or printed books."
  );

  if (!runtime.formDirty) populateProfileForm(profile);
}

function populateProfileForm(profile) {
  const form = document.querySelector("#profile-form");
  if (!form) return;
  for (const [name, value] of Object.entries({
    displayName: profile.displayName,
    culinaryRole: profile.culinaryRole,
    heritageNotes: profile.heritageNotes,
    preservationNote: profile.preservationNote,
    defaultPrivacy: profile.defaultPrivacy,
    custodianName: profile.custodianName
  })) {
    if (form.elements[name]) form.elements[name].value = value || "";
  }
}

async function saveProfile(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const profile = normalizeProfile({
    ...runtime.profile,
    displayName: data.get("displayName"),
    culinaryRole: data.get("culinaryRole"),
    heritageNotes: data.get("heritageNotes"),
    preservationNote: data.get("preservationNote"),
    defaultPrivacy: data.get("defaultPrivacy"),
    custodianName: data.get("custodianName"),
    updatedAt: new Date().toISOString()
  }, { email: runtime.profile.email || runtime.cloudUser?.email });

  if (profile.displayName.length < 2) {
    showProfileStatus("Add a display name with at least two characters.", "error");
    form.elements.displayName.focus();
    return;
  }

  const submit = form.querySelector('button[type="submit"]');
  submit.disabled = true;
  showProfileStatus("Saving profile…");
  try {
    if (runtime.mode === "cloud") {
      const client = await getCloudClient();
      const user = runtime.cloudUser;
      if (!client || !user) throw new Error("Your cloud session is no longer available. Sign in again.");
      const payload = {
        id: user.id,
        email: user.email,
        display_name: profile.displayName,
        culinary_role: profile.culinaryRole,
        heritage_notes: profile.heritageNotes,
        preservation_note: profile.preservationNote,
        default_privacy: profile.defaultPrivacy,
        custodian_name: profile.custodianName
      };
      const { data: saved, error } = await client.from("profiles").upsert(payload, { onConflict: "id" }).select("*").single();
      if (error) {
        if (/culinary_role|heritage_notes|preservation_note|default_privacy|custodian_name/i.test(error.message || "")) {
          throw new Error("The profile database migration has not been applied. Run supabase/migrations/005_profile.sql before saving cloud profile details.");
        }
        throw error;
      }
      runtime.profile = normalizeProfile(saved, { email: user.email, userMetadata: user.user_metadata || {} });
    } else {
      const saved = { ...profile, id: PROFILE_ID, updatedAt: new Date().toISOString() };
      await localPut("settings", saved);
      runtime.profile = normalizeProfile(saved);
    }
    runtime.formDirty = false;
    renderProfile();
    showProfileStatus("Profile saved.", "success");
  } catch (error) {
    showProfileStatus(error instanceof Error ? error.message : "Could not save the profile.", "error");
  } finally {
    submit.disabled = false;
  }
}

function applyRecipeDefaults() {
  const form = document.querySelector("#recipe-form");
  if (!form) return;
  if (form.elements.privacy) form.elements.privacy.value = runtime.profile.defaultPrivacy || "private";
  if (form.elements.custodian && !String(form.elements.custodian.value || "").trim()) {
    form.elements.custodian.value = runtime.profile.custodianName || runtime.profile.displayName || "";
  }
}

async function requestAppStatus() {
  return new Promise(resolve => {
    let settled = false;
    const finish = value => {
      if (settled) return;
      settled = true;
      resolve(value || null);
    };
    window.dispatchEvent(new CustomEvent("mangrok:request-app-status", { detail: { resolve: finish } }));
    setTimeout(() => finish(null), 800);
  });
}

async function getCloudClient() {
  if (runtime.cloudClient) return runtime.cloudClient;
  const configuration = globalThis.MANGROK_CONFIG || {};
  if (!configuration.supabaseUrl || !configuration.supabaseAnonKey) return null;
  if (/service[_-]?role/i.test(configuration.supabaseAnonKey)) throw new Error("A service-role key must never be used by the profile interface.");
  const { createClient } = await import(SUPABASE_MODULE);
  runtime.cloudClient = createClient(configuration.supabaseUrl, configuration.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  return runtime.cloudClient;
}

function openDatabase() {
  if (runtime.databasePromise) return runtime.databasePromise;
  runtime.databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      const database = request.result;
      for (const name of ["recipes", "versions", "circles", "books", "legacy", "notifications", "assets", "settings"]) {
        if (!database.objectStoreNames.contains(name)) database.createObjectStore(name, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
  return runtime.databasePromise;
}

async function localGet(storeName, id) {
  const database = await openDatabase();
  return requestResult(database.transaction(storeName).objectStore(storeName).get(id));
}

async function localList(storeName) {
  const database = await openDatabase();
  return requestResult(database.transaction(storeName).objectStore(storeName).getAll());
}

async function localPut(storeName, value) {
  const database = await openDatabase();
  return requestResult(database.transaction(storeName, "readwrite").objectStore(storeName).put(value));
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function setMeter(name, value) {
  const percent = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  setText(`#profile-ready-${name}`, `${percent}%`);
  const meter = document.querySelector(`#profile-meter-${name}`);
  if (meter) meter.style.width = `${percent}%`;
}

function setText(selector, value) {
  const node = document.querySelector(selector);
  if (node) node.textContent = String(value ?? "");
}

function showProfileStatus(message, kind = "") {
  const node = document.querySelector("#profile-save-status");
  if (!node) return;
  node.textContent = message || "";
  node.dataset.kind = kind;
}

function cleanText(value, limit) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, limit);
}

function titleCase(value) {
  return String(value || "").replace(/\b\w/g, character => character.toUpperCase());
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not saved yet" : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
