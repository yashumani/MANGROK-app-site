import { normalizeRecipe, uid, isoNow } from "./model.js";

function config() { return globalThis.MANGROK_CONFIG || {}; }
function assertSafeKey(key) {
  if (!key) return;
  if (/service[_-]?role/i.test(key)) throw new Error("A service-role key must never be placed in browser configuration.");
}

export class CloudVault {
  constructor() { this.client = null; this.user = null; }
  get enabled() { const c = config(); return Boolean(c.supabaseUrl && c.supabaseAnonKey); }
  async init() {
    if (!this.enabled) return false;
    assertSafeKey(config().supabaseAnonKey);
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.57.4");
    this.client = createClient(config().supabaseUrl, config().supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    const { data } = await this.client.auth.getSession(); this.user = data.session?.user || null;
    this.client.auth.onAuthStateChange((_event, session) => { this.user = session?.user || null; window.dispatchEvent(new CustomEvent("mangrok:auth")); });
    return true;
  }
  async signIn(email) {
    if (!this.client) throw new Error("Cloud sync is not configured.");
    const redirectTo = `${location.origin}${location.pathname}`;
    const { error } = await this.client.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
    if (error) throw error;
  }
  async signOut() { const { error } = await this.client.auth.signOut(); if (error) throw error; }

  async listRecipes() {
    const { data, error } = await this.client.from("recipes").select("*").order("updated_at", { ascending: false });
    if (error) throw error; return (data || []).map(fromRow);
  }
  async upsertRecipe(recipe) {
    const normalized = normalizeRecipe(recipe);
    const row = toRow(normalized, this.user.id);
    const { data, error } = await this.client.from("recipes").upsert(row).select().single();
    if (error) throw error; return fromRow(data);
  }
  async deleteRecipe(id) { const { error } = await this.client.from("recipes").delete().eq("id", id); if (error) throw error; }
  async versionsFor(recipeId) {
    const { data, error } = await this.client.from("recipe_versions").select("*").eq("recipe_id", recipeId).order("created_at", { ascending: false });
    if (error) throw error; return data || [];
  }
  async restoreVersion(versionId) {
    const { data, error } = await this.client.rpc("restore_recipe_version", { version_id: versionId });
    if (error) throw error; return data;
  }

  async listCircles() {
    const { data, error } = await this.client.from("circles").select("*, circle_members(*)").order("created_at");
    if (error) throw error; return data || [];
  }
  async saveCircle(circle) {
    const id = normalizeUuid(circle.id);
    const { data, error } = await this.client.from("circles").upsert({ id, owner_id: this.user.id, name: circle.name, description: circle.description || "" }).select().single();
    if (error) throw error;
    if (Array.isArray(circle.members)) {
      await this.client.from("circle_members").delete().eq("circle_id", id);
      if (circle.members.length) {
        const { error: memberError } = await this.client.from("circle_members").insert(circle.members.map(member => ({
          circle_id: id, email: member.email.toLowerCase(), role: member.role || "viewer", secret_access: Boolean(member.secretAccess)
        })));
        if (memberError) throw memberError;
      }
    }
    return data;
  }
  async grantRecipe({ recipeId, circleId = null, email = null, role = "viewer", secretAccess = false, expiresAt = null }) {
    const { data, error } = await this.client.from("recipe_grants").insert({ recipe_id: recipeId, circle_id: circleId,
      grantee_email: email?.toLowerCase() || null, role, secret_access: secretAccess, expires_at: expiresAt, granted_by: this.user.id }).select().single();
    if (error) throw error; return data;
  }
  async revokeGrant(id) { const { error } = await this.client.from("recipe_grants").update({ revoked_at: isoNow() }).eq("id", id); if (error) throw error; }
  async listGrants(recipeId) {
    const { data, error } = await this.client.from("recipe_grants").select("*").eq("recipe_id", stripPrefix(recipeId)).order("created_at", { ascending: false });
    if (error) throw error; return data || [];
  }
  async createShareLink({ recipeId, expiresAt = null, maxViews = null, secretPayload = null }) {
    const { data, error } = await this.client.rpc("create_recipe_share_link", { p_recipe_id: stripPrefix(recipeId), p_expires_at: expiresAt,
      p_max_views: maxViews, p_secret_payload: secretPayload });
    if (error) throw error; return data;
  }
  async getSharedRecipe(token) {
    const { data, error } = await this.client.rpc("get_shared_recipe", { p_token: token });
    if (error) throw error; return data;
  }
  async listShareLinks(recipeId) {
    const { data, error } = await this.client.from("share_links").select("id,created_at,expires_at,max_views,view_count,revoked_at").eq("recipe_id", stripPrefix(recipeId)).order("created_at", { ascending: false });
    if (error) throw error; return data || [];
  }
  async revokeShareLink(id) { const { error } = await this.client.from("share_links").update({ revoked_at: isoNow() }).eq("id", id); if (error) throw error; }

  async uploadAsset(recipeId, file, kind) {
    const path = `${this.user.id}/${recipeId}/${crypto.randomUUID()}-${safeName(file.name)}`;
    const { error } = await this.client.storage.from("recipe-assets").upload(path, file, { upsert: false, contentType: file.type });
    if (error) throw error;
    const { data, error: metaError } = await this.client.from("recipe_assets").insert({ recipe_id: recipeId, owner_id: this.user.id, path,
      name: file.name, media_type: file.type, kind, size_bytes: file.size }).select().single();
    if (metaError) throw metaError; return data;
  }

  async listAssets(recipeId) {
    const { data, error } = await this.client.from("recipe_assets").select("*").eq("recipe_id", stripPrefix(recipeId)).order("created_at");
    if (error) throw error; return data || [];
  }
  async listBooks() { const { data, error } = await this.client.from("books").select("*").order("updated_at", { ascending: false }); if (error) throw error; return data || []; }
  async saveBook(book) {
    const row = { id: normalizeUuid(book.id), owner_id: this.user.id, title: book.title, dedication: book.dedication || "",
      theme: book.theme || "heritage", recipe_ids: (book.recipeIds || []).map(stripPrefix), include_secrets: Boolean(book.includeSecrets), secret_approval_at: book.secretApprovalAt || null };
    const { data, error } = await this.client.from("books").upsert(row).select().single(); if (error) throw error; return data;
  }
  async orderBook(bookId, requestId = crypto.randomUUID()) {
    const { data, error } = await this.client.functions.invoke(config().printFunctionName || "print-order", { body: { bookId, requestId } });
    if (error) throw error; return data;
  }

  async listLegacyPlans() { const { data, error } = await this.client.from("legacy_plans").select("*").order("updated_at", { ascending: false }); if (error) throw error; return data || []; }
  async saveLegacyPlan(plan) {
    const row = { id: normalizeUuid(plan.id), owner_id: this.user.id, recipe_ids: (plan.recipeIds || []).map(stripPrefix), primary_recipient_email: plan.primaryEmail.toLowerCase(),
      backup_recipient_email: plan.backupEmail?.toLowerCase() || null, release_after: plan.releaseAfter || null,
      inactivity_months: plan.inactivityMonths || null, sealed_message: plan.sealedMessage || "", status: "active", human_review_required: true };
    const { data, error } = await this.client.from("legacy_plans").upsert(row).select().single(); if (error) throw error; return data;
  }
  async listNotifications() { const { data, error } = await this.client.from("notifications").select("*").order("created_at", { ascending: false }).limit(100); if (error) throw error; return data || []; }
  async markNotificationsRead() { const { error } = await this.client.from("notifications").update({ read_at: isoNow() }).is("read_at", null); if (error) throw error; }
  async requestAccountDeletion() {
    const { data, error } = await this.client.rpc("request_account_deletion"); if (error) throw error; return data;
  }
  async exportAccount() {
    const [recipes, circles, books, legacy] = await Promise.all([
      this.client.from("recipes").select("*"), this.client.from("circles").select("*,circle_members(*)"),
      this.client.from("books").select("*"), this.client.from("legacy_plans").select("*")
    ]);
    for (const result of [recipes, circles, books, legacy]) if (result.error) throw result.error;
    return { type: "mangrok.cloud-export", version: 1, exportedAt: isoNow(), recipes: recipes.data, circles: circles.data, books: books.data, legacyPlans: legacy.data };
  }
}

function safeName(name) { return String(name || "file").replace(/[^a-z0-9._-]+/gi, "-").slice(0, 120); }
function toRow(recipe, ownerId) {
  return { id: stripPrefix(recipe.id), owner_id: ownerId, title: recipe.title, summary: recipe.summary, ingredients: recipe.ingredients,
    steps: recipe.steps, tags: recipe.tags, privacy: recipe.privacy, favorite: recipe.favorite, servings: recipe.servings,
    prep_minutes: recipe.prepMinutes, cook_minutes: recipe.cookMinutes, origin: recipe.origin,
    secret_ciphertext: recipe.secret?.ciphertext || null, secret_iv: recipe.secret?.iv || null, secret_salt: recipe.secret?.salt || null,
    secret_iterations: recipe.secret?.iterations || null, secret_version: recipe.secret?.version || null, secret_hint: recipe.secretHint,
    revision: recipe.revision, updated_at: recipe.updatedAt };
}
function fromRow(row) {
  return normalizeRecipe({ id: `recipe_${row.id}`, ownerId: row.owner_id, title: row.title, summary: row.summary, ingredients: row.ingredients,
    steps: row.steps, tags: row.tags, privacy: row.privacy, favorite: row.favorite, servings: row.servings,
    prepMinutes: row.prep_minutes, cookMinutes: row.cook_minutes, origin: row.origin,
    secret: row.secret_ciphertext ? { ciphertext: row.secret_ciphertext, iv: row.secret_iv, salt: row.secret_salt,
      iterations: row.secret_iterations, version: row.secret_version } : null, secretHint: row.secret_hint,
    revision: row.revision, createdAt: row.created_at, updatedAt: row.updated_at });
}
function stripPrefix(value) { const text = String(value); return text.startsWith("recipe_") ? text.slice(7) : text; }
function normalizeUuid(value) {
  const text = String(value || "").replace(/^[a-z]+_/i, "");
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text) ? text : crypto.randomUUID();
}
