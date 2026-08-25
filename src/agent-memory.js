const ENABLED_KEY = "mangrok.agent.memory.enabled.v1";
const MEMORY_KEY = "mangrok.agent.memories.v1";
const SESSION_KEY = "mangrok.agent.sessions.v1";
const SAFE_SCOPES = new Set(["preference","ingredient","technique","equipment","dietary","cuisine","session-summary","correction"]);
const SENSITIVE = /\b(passphrase|password|api[ _-]?key|access token|auth token|service role|private key|recovery phrase|seed phrase|decryption key|secret note|sealed note)\b/i;

export class AgentMemoryStore {
  constructor(storage = globalThis.localStorage) { this.storage = storage; }
  isEnabled() { try { return this.storage?.getItem?.(ENABLED_KEY) === "true"; } catch { return false; } }
  setEnabled(enabled) { try { this.storage?.setItem?.(ENABLED_KEY, String(Boolean(enabled))); } catch {} return Boolean(enabled); }

  remember(input = {}, { confirmed = false } = {}) {
    if (!this.isEnabled()) throw new Error("Agent memory is off. Enable it in Settings first.");
    if (!confirmed) throw new Error("Explicit confirmation is required before saving memory.");
    const scope = SAFE_SCOPES.has(String(input.scope || "")) ? String(input.scope) : "preference";
    const content = String(input.content || input.text || "").trim().replace(/\s+/g, " ").slice(0, 420);
    if (!content) throw new Error("Memory content is required.");
    if (SENSITIVE.test(content) || content.length > 420) throw new Error("This content is not suitable for agent memory.");
    const row = Object.freeze({ id: input.id || id(), scope, key: String(input.key || scope).slice(0, 100), content, confidence: clamp(Number(input.confidence ?? 1), 0, 1), confirmed: true, createdAt: input.createdAt || now(), updatedAt: now() });
    const rows = this.list().filter(value => !(value.scope === row.scope && value.content.toLowerCase() === row.content.toLowerCase()));
    rows.unshift(row); this.write(MEMORY_KEY, rows.slice(0, 250)); return row;
  }

  recall(query = "", { scopes = [], limit = 8 } = {}) {
    if (!this.isEnabled()) return [];
    const needle = normalize(query); const allowed = new Set((Array.isArray(scopes) ? scopes : [scopes]).filter(Boolean));
    return Object.freeze(this.list().filter(row => !allowed.size || allowed.has(row.scope)).map(row => ({ row, score: score(row, needle) })).filter(value => !needle || value.score > 0).sort((a,b) => b.score-a.score || String(b.row.updatedAt).localeCompare(String(a.row.updatedAt))).slice(0, Math.max(1, Math.min(30, Number(limit)||8))).map(value => value.row));
  }
  list() { return this.read(MEMORY_KEY).filter(row => row?.confirmed && SAFE_SCOPES.has(row.scope)); }
  forget(idValue) { const before=this.list(); const after=before.filter(row=>row.id!==String(idValue)); this.write(MEMORY_KEY,after); return after.length<before.length; }
  clear() { this.write(MEMORY_KEY,[]); }

  saveSession(summary = {}) {
    if (!this.isEnabled()) return null;
    const text = String(summary.summary || summary.text || "").trim().replace(/\s+/g," ").slice(0,700);
    if (!text || SENSITIVE.test(text)) return null;
    const row=Object.freeze({ id: summary.id||id(), title:String(summary.title||"Alchemy session").slice(0,120), summary:text, ingredients:(summary.ingredients||[]).map(String).slice(0,30), tools:(summary.tools||[]).map(String).slice(0,20), createdAt:summary.createdAt||now() });
    const rows=this.read(SESSION_KEY); rows.unshift(row); this.write(SESSION_KEY,rows.slice(0,120)); return row;
  }
  searchSessions(query="",{limit=6}={}) { const needle=normalize(query); return Object.freeze(this.read(SESSION_KEY).map(row=>({row,score:tokenScore(normalize([row.title,row.summary,...(row.ingredients||[])].join(" ")),needle)})).filter(x=>!needle||x.score>0).sort((a,b)=>b.score-a.score).slice(0,Math.max(1,Math.min(20,Number(limit)||6))).map(x=>x.row)); }

  read(key) { try { const value=JSON.parse(this.storage?.getItem?.(key)||"[]"); return Array.isArray(value)?value:[]; } catch { return []; } }
  write(key, value) { try { this.storage?.setItem?.(key,JSON.stringify(value)); } catch {} }
}

export const MEMORY_LIMITS = Object.freeze({ memories:250, sessions:120, contentCharacters:420, summaryCharacters:700 });
export function isAgentMemoryEnabled(storage=globalThis.localStorage){ return new AgentMemoryStore(storage).isEnabled(); }
function score(row,needle){ if(!needle)return row.confidence||0; const text=normalize(`${row.scope} ${row.key} ${row.content}`); return tokenScore(text,needle)*10+(text.includes(needle)?25:0)+(row.confidence||0); }
function tokenScore(text,needle){ return needle.split(" ").filter(Boolean).filter(token=>text.includes(token)).length; }
function normalize(value){ return String(value||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim(); }
function clamp(value,min,max){ return Math.max(min,Math.min(max,Number.isFinite(value)?value:min)); }
function id(){ return globalThis.crypto?.randomUUID?.()||`memory-${Math.random().toString(36).slice(2)}`; }
function now(){ return new Date().toISOString(); }
