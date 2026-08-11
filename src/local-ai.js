import { buildAlchemyPrompt, mergeAIInsight } from "./culinary-engine.js";

export const DEFAULT_WEBLLM_MODEL = "Llama-3.2-1B-Instruct-q4f16_1-MLC";
export const DEFAULT_LOCAL_AI_TIMEOUT_MS = 45_000;

let enginePromise = null;
let loadedModel = "";

export function getLocalAICapabilities(config = globalThis.window?.MANGROK_CONFIG || {}) {
  const gatewayConfigured = Boolean(
    String(config.alchemyFunctionName || "").trim() &&
    String(config.supabaseUrl || "").trim() &&
    String(config.supabaseAnonKey || "").trim()
  ) || Boolean(String(config.aiGatewayUrl || "").trim());

  return Object.freeze({
    rules: true,
    webgpu: Boolean(globalThis.navigator?.gpu),
    webllmModel: String(config.webllmModel || DEFAULT_WEBLLM_MODEL),
    gateway: gatewayConfigured,
    ollamaConfigured: Boolean(String(config.ollamaBaseUrl || "").trim()),
    secureContext: globalThis.isSecureContext !== false
  });
}

export async function enhanceWithLocalAI({
  input,
  simulation,
  provider = "rules",
  config = globalThis.window?.MANGROK_CONFIG || {},
  onProgress = () => {},
  requestId = cryptoRandomId()
}) {
  if (provider === "rules") {
    return {
      result: simulation,
      provider,
      model: "Mangrok culinary engine",
      requestId,
      entitlement: null,
      latencyMs: 0
    };
  }

  const messages = buildAlchemyPrompt(input, simulation);
  const startedAt = performanceNow();
  let completionText = "";
  let model = "";
  let entitlement = null;
  let responseRequestId = requestId;
  let latencyMs = null;

  if (provider === "webllm") {
    model = String(config.webllmModel || DEFAULT_WEBLLM_MODEL);
    completionText = await runWebLLM(messages, model, onProgress);
  } else if (provider === "gateway") {
    const payload = await runMangrokGateway({
      messages,
      requestId,
      timeoutMs: Number(config.aiGatewayTimeoutMs) || 65_000
    });
    completionText = extractCompletionText(payload?.completion ?? payload);
    model = String(payload?.model || config.aiGatewayModel || "Mangrok private model");
    entitlement = payload?.entitlement || null;
    responseRequestId = String(payload?.requestId || requestId);
    latencyMs = finiteOrNull(payload?.latencyMs);
  } else {
    model = String(config.ollamaModel || "llama3.2");
    completionText = await runOpenAICompatible({
      baseUrl: config.ollamaBaseUrl || "http://127.0.0.1:11434/v1",
      model,
      messages,
      authorization: "",
      timeoutMs: Number(config.localAiTimeoutMs) || DEFAULT_LOCAL_AI_TIMEOUT_MS
    });
  }

  const structured = parseStructuredResponse(completionText);
  return {
    result: mergeAIInsight(simulation, structured),
    provider,
    model,
    requestId: responseRequestId,
    entitlement,
    latencyMs: latencyMs ?? Math.round(performanceNow() - startedAt)
  };
}

async function runWebLLM(messages, model, onProgress) {
  if (!globalThis.navigator?.gpu) throw new Error("On-device AI requires a WebGPU-capable browser and device.");

  if (!enginePromise || loadedModel !== model) {
    loadedModel = model;
    enginePromise = import("https://esm.run/@mlc-ai/web-llm")
      .then(webllm => webllm.CreateMLCEngine(model, {
        initProgressCallback: progress => onProgress({
          progress: Number.isFinite(Number(progress?.progress)) ? Math.round(Number(progress.progress) * 100) : null,
          text: String(progress?.text || "Preparing the on-device model.")
        })
      }))
      .catch(error => {
        enginePromise = null;
        loadedModel = "";
        throw error;
      });
  }

  const engine = await enginePromise;
  onProgress({ text: "The on-device model is refining the recipe.", progress: 92 });
  const value = await engine.chat.completions.create({
    messages,
    temperature: 0.25,
    max_tokens: 1000,
    response_format: { type: "json_object" },
    stream: false
  });
  return extractCompletionText(value);
}

export async function runOpenAICompatible({
  baseUrl,
  model,
  messages,
  authorization = "",
  timeoutMs = DEFAULT_LOCAL_AI_TIMEOUT_MS,
  fetchImpl = globalThis.fetch
}) {
  if (typeof fetchImpl !== "function") throw new Error("This environment cannot contact a local AI endpoint.");
  const { chat } = resolveOpenAIEndpoints(baseUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new DOMException("AI request timed out.", "TimeoutError")), clampTimeout(timeoutMs));

  try {
    const response = await fetchImpl(chat, {
      method: "POST",
      mode: "cors",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(authorization ? { Authorization: `Bearer ${authorization}` } : {})
      },
      body: JSON.stringify({
        model: String(model || "").trim() || "mangrok-alchemy",
        messages: sanitizeMessages(messages),
        temperature: 0.25,
        max_tokens: 1000,
        response_format: { type: "json_object" },
        stream: false
      })
    });

    const text = await readBoundedText(response, 2_000_000);
    if (!response.ok) {
      const detail = safeErrorMessage(text);
      throw new Error(`Local AI endpoint returned ${response.status}${detail ? `: ${detail}` : "."}`);
    }

    let payload;
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      throw new Error("The local AI endpoint returned invalid JSON.");
    }
    const output = extractCompletionText(payload);
    if (!output) throw new Error("The local AI endpoint returned no completion text.");
    return output;
  } catch (error) {
    if (error?.name === "AbortError" || error?.name === "TimeoutError") {
      throw new Error(`The local AI endpoint did not respond within ${Math.round(clampTimeout(timeoutMs) / 1000)} seconds.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function probeOpenAICompatible({
  baseUrl,
  authorization = "",
  timeoutMs = 5_000,
  fetchImpl = globalThis.fetch
}) {
  if (typeof fetchImpl !== "function") throw new Error("This environment cannot test a local AI endpoint.");
  const endpoints = resolveOpenAIEndpoints(baseUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), clampTimeout(timeoutMs, 1_000, 30_000));
  const startedAt = performanceNow();

  try {
    const response = await fetchImpl(endpoints.models, {
      method: "GET",
      mode: "cors",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(authorization ? { Authorization: `Bearer ${authorization}` } : {})
      }
    });
    const text = await readBoundedText(response, 500_000);
    if (!response.ok) throw new Error(`Model probe returned ${response.status}.`);
    let payload = {};
    try { payload = text ? JSON.parse(text) : {}; } catch { throw new Error("Model probe returned invalid JSON."); }
    const models = Array.isArray(payload?.data)
      ? payload.data.map(item => String(item?.id || "")).filter(Boolean).slice(0, 50)
      : Array.isArray(payload?.models)
        ? payload.models.map(item => String(item?.name || item?.model || item?.id || "")).filter(Boolean).slice(0, 50)
        : [];
    return Object.freeze({
      ok: true,
      endpoint: sanitizeEndpoint(baseUrl),
      latencyMs: Math.round(performanceNow() - startedAt),
      models,
      modelCount: models.length
    });
  } catch (error) {
    if (error?.name === "AbortError" || error?.name === "TimeoutError") {
      throw new Error("The local AI endpoint probe timed out.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function resolveOpenAIEndpoints(baseUrl) {
  const raw = String(baseUrl || "").trim();
  if (!raw) throw new Error("No local AI endpoint is configured.");
  let url;
  try { url = new URL(raw); } catch { throw new Error("The local AI endpoint is not a valid URL."); }
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("The local AI endpoint must use HTTP or HTTPS.");
  url.username = "";
  url.password = "";
  url.hash = "";
  url.search = "";
  const base = url.toString().replace(/\/+$/, "");
  const chat = /\/chat\/completions$/i.test(base)
    ? base
    : /\/v1$/i.test(base)
      ? `${base}/chat/completions`
      : `${base}/v1/chat/completions`;
  const models = /\/chat\/completions$/i.test(base)
    ? base.replace(/\/chat\/completions$/i, "/models")
    : /\/v1$/i.test(base)
      ? `${base}/models`
      : `${base}/v1/models`;
  return Object.freeze({ base, chat, models });
}

export function sanitizeEndpoint(baseUrl) {
  try {
    const { base } = resolveOpenAIEndpoints(baseUrl);
    const url = new URL(base);
    return `${url.protocol}//${url.host}${url.pathname}`;
  } catch {
    return "not configured";
  }
}

export function parseStructuredResponse(value) {
  if (value && typeof value === "object") return value;
  const text = String(value || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  try { return JSON.parse(text); } catch {}
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first >= 0 && last > first) {
    try { return JSON.parse(text.slice(first, last + 1)); } catch {}
  }
  throw new Error("The local model did not return valid structured JSON.");
}

export function extractCompletionText(payload) {
  const completion = payload?.completion ?? payload;
  return String(
    completion?.choices?.[0]?.message?.content ??
    completion?.response ??
    completion?.output_text ??
    completion?.message?.content ??
    ""
  ).trim();
}

async function runMangrokGateway({ messages, requestId, timeoutMs }) {
  const bridgeTimeout = Math.min(130_000, Math.max(15_000, Number(timeoutMs) || 65_000) + 5_000);
  const result = await requestBridge("mangrok:invoke-alchemy-gateway", { messages, requestId }, bridgeTimeout);
  if (!result) throw new Error("The Mangrok subscriber gateway is not connected to this application session.");
  return result;
}

function requestBridge(name, payload, timeoutMs) {
  if (!globalThis.window || typeof globalThis.CustomEvent !== "function") return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (handler, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      handler(value);
    };
    const timeout = setTimeout(() => finish(reject, new Error("The Mangrok application bridge did not respond.")), timeoutMs);
    window.dispatchEvent(new CustomEvent(name, {
      detail: {
        ...payload,
        resolve: value => finish(resolve, value),
        reject: error => finish(reject, error instanceof Error ? error : new Error(String(error || "Bridge request failed.")))
      }
    }));
  });
}

function sanitizeMessages(messages) {
  return (Array.isArray(messages) ? messages : [])
    .slice(0, 12)
    .map(message => ({
      role: ["system", "user", "assistant"].includes(String(message?.role)) ? String(message.role) : "user",
      content: String(message?.content || "").slice(0, 8_000)
    }))
    .filter(message => message.content);
}

async function readBoundedText(response, maximumBytes) {
  const text = await response.text();
  if (new TextEncoder().encode(text).byteLength > maximumBytes) throw new Error("The AI endpoint response was unexpectedly large.");
  return text;
}

function safeErrorMessage(text) {
  if (!text) return "";
  try {
    const payload = JSON.parse(text);
    return String(payload?.error?.message || payload?.error || payload?.message || "").slice(0, 240);
  } catch {
    return String(text).replace(/\s+/g, " ").slice(0, 240);
  }
}

function clampTimeout(value, minimum = 5_000, maximum = 120_000) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, Math.round(parsed))) : DEFAULT_LOCAL_AI_TIMEOUT_MS;
}

function finiteOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function performanceNow() {
  return typeof globalThis.performance?.now === "function" ? globalThis.performance.now() : Date.now();
}

function cryptoRandomId() {
  return typeof globalThis.crypto?.randomUUID === "function"
    ? globalThis.crypto.randomUUID()
    : `request-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
