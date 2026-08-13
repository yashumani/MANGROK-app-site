let clientPromise = null;

export function createAgentCloudProvider(config = globalThis.MANGROK_CONFIG || {}) {
  const enabled = Boolean(config.supabaseUrl && config.supabaseAnonKey);
  return Object.freeze({
    enabled,
    submitIngredientProposal: value => withClient(async client => {
      const requestId = normalizeUuid(value.clientRequestId);
      const { data, error } = await client.rpc("submit_ingredient_proposal", {
        p_client_request_id: requestId, p_name: value.name, p_category: value.category,
        p_aliases: value.aliases || [], p_cuisines: value.cuisines || [], p_regions: value.regions || [],
        p_dietary: value.dietary || [], p_allergens: value.allergens || [], p_source_url: value.sourceUrl || null,
        p_source_license: value.sourceLicense || null, p_notes: value.notes || ""
      });
      if (error) throw error; return data;
    }),
    listIngredientSubmissions: () => withClient(async client => {
      const { data, error } = await client.from("ingredient_submissions").select("*").order("updated_at", { ascending: false }).limit(200);
      if (error) throw error; return data || [];
    }),
    withdrawIngredientProposal: id => withClient(async client => {
      const { data, error } = await client.from("ingredient_submissions").update({ status: "withdrawn", updated_at: new Date().toISOString() }).eq("id", id).select().single();
      if (error) throw error; return data;
    }),
    upsertMemory: memory => withClient(async client => {
      const { data, error } = await client.rpc("upsert_agent_memory", { p_scope: memory.scope, p_key: memory.key, p_content: memory.content, p_confidence: memory.confidence, p_source: memory.source });
      if (error) throw error; return data;
    }),
    deleteMemory: id => withClient(async client => { const { error } = await client.from("agent_memories").delete().eq("id", id); if (error) throw error; return true; }),
    searchMemory: ({ query = "", scopes = null, limit = 8 } = {}) => withClient(async client => {
      const { data, error } = await client.rpc("search_agent_memory", { p_query: query, p_scopes: scopes, p_limit: limit });
      if (error) throw error; return (data || []).map(fromMemoryRow);
    }),
    upsertSession: session => withClient(async client => {
      const user = await currentUser(client); const { data, error } = await client.from("agent_sessions").upsert({ id: normalizeUuid(session.id), owner_id: user.id, title: session.title, metadata: session.metadata || {}, updated_at: session.updatedAt }).select().single();
      if (error) throw error; return data;
    }),
    appendAgentMessage: message => withClient(async client => {
      const user = await currentUser(client); const { data, error } = await client.from("agent_messages").insert({ id: normalizeUuid(message.id), session_id: normalizeUuid(message.sessionId), owner_id: user.id, role: message.role, content: message.content, summary: message.summary, metadata: message.metadata || {}, created_at: message.createdAt }).select().single();
      if (error) throw error; return data;
    }),
    searchAgentSessions: ({ query = "", limit = 8 } = {}) => withClient(async client => {
      const needle = String(query || "").trim(); let request = client.from("agent_sessions").select("id,title,summary,metadata,created_at,updated_at").order("updated_at", { ascending: false }).limit(Math.max(1, Math.min(30, limit)));
      if (needle) request = request.or(`title.ilike.%${escapeFilter(needle)}%,summary.ilike.%${escapeFilter(needle)}%`);
      const { data, error } = await request; if (error) throw error;
      return (data || []).map(row => ({ id: row.id, title: row.title, summary: row.summary, metadata: row.metadata, createdAt: row.created_at, updatedAt: row.updated_at }));
    })
  });

  async function withClient(operation) {
    if (!enabled) throw new Error("Cloud catalog and memory are not configured.");
    const client = await getClient(config); await currentUser(client); return operation(client);
  }
}

async function getClient(config) {
  if (!clientPromise) clientPromise = import("https://esm.sh/@supabase/supabase-js@2.57.4").then(({ createClient }) => createClient(config.supabaseUrl, config.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }));
  return clientPromise;
}
async function currentUser(client) { const { data, error } = await client.auth.getUser(); if (error || !data.user) throw new Error("Sign in to sync catalog submissions or agent memory."); return data.user; }
function fromMemoryRow(row) { return { id: row.id, scope: row.scope, key: row.memory_key, content: row.content, confidence: Number(row.confidence), source: row.source, createdAt: row.created_at, updatedAt: row.updated_at }; }
function normalizeUuid(value) { const text = String(value || "").replace(/^[a-z]+-/i, ""); return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text) ? text : crypto.randomUUID(); }
function escapeFilter(value) { return String(value).replace(/[,%()]/g, " ").slice(0, 120); }
