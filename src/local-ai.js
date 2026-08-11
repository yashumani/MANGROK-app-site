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
  requestId = cryptoRandomId(),
  signal = null
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

  throwIfAborted(signal);
  const messages = buildAlchemyPrompt(input, simulation);
  const startedAt = performanceNow();
  let completionText = "";
  let model = "";
  let entitlement = null;
  let responseRequestId = requestId;
  let latencyMs = null;

  if (provider === "webllm") {
    model = String(config.webllmModel || DEFAULT_WEBLLM_MODEL);
    completionText = await runWebLLM(messages, model, onProgress, signal);
  } else if (provider === "gateway") {
    onProgress({ text: "Checking subscriber access and contacting the private model.", progress: 28 });
    const payload = await runMangrokGateway({
      messages,
      requestId,
      timeoutMs: Number(config.aiGatewayTimeoutMs) || 65_000,
      signal
    });
    onProgress({ text: "The private model responded. Validating the structured insight.", progress: 92 });
    completionText = extractCompletionText(payload?.completion ?? payload);
    model = String(payload?.model || config.aiGatewayModel || "Mangrok private model");
    entitlement = payload?.entitlement || null;
    responseRequestId = String(payload?.requestId || requestId);
    latencyMs = finiteOrNull(payload?.latencyMs);
  } else {
    model = String(config.ollamaModel || "llama3.2");
    onProgress({ text: "Contacting the self-hosted model and sending the structured recipe formula.", progress: 28 });
    completionText = await runOpenAICompatible({
      baseUrl: config.ollamaBaseUrl || "http://127.0.0.1:11434/v1",
      model,
      messages,
      authorization: "",
      timeoutMs: Number(config.localAiTimeoutMs) || DEFAULT_LOCAL_AI_TIMEOUT_MS,
      signal
    });
    onProgress({ text: "The self-hosted model responded. Validating the structured insight.", progress: 92 });
  }

  throwIfAborted(signal);
  onProgress({ text: "Merging AI reasoning with the deterministic culinary simulation.", progress: 96 });
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

async function runWebLLM(messages, model, onProgress, signal) {
  if (!globalThis.navigator?.gpu) throw new Error("On-device AI requires a WebGPU-capable browser and device.");
  throwIfAborted(signal);
  onProgress({ text: "Loading the WebLLM runtime on this device.", progress: 22 });

  if (!enginePromise || loadedModel !== model) {
    loadedModel = model;
    enginePromise = import("https://esm.run/@mlc-ai/web-llm")
      .then(webllm => {
        throwIfAborted(signal);
        return webllm.CreateMLCEngine(model, {
          initProgressCallback: progress => {
            const raw = Number(progress?.progress);
            const mapped = Number.isFinite(raw) ? Math.round(24 + Math.max(0, Math.min(1, raw)) * 58) : null;
            onProgress({
              progress: mapped,
              text: String(progress?.text || "Downloading and preparing the on-device model.")
            });
          }
        });
      })
      .catch(error => {
        enginePromise = null;
        loadedModel = "";
        throw error;
      });
  }

  const engine = await enginePromise;
  throwIfAborted(signal);
  onProgress({ text: "The on-device model is reasoning through flavor, technique, and risk.", progress: 86 });
  const value = await engine.chat.completions.create({
    messages,
    temperature: 0.25,
    max_tokens: 1000,
    response_format: { type: "json_object" },
    stream: false
  });
  throwIfAborted(signal);
  onProgress({ text: "The on-device model responded. Validating the structured insight.", progress: 94 });
  return extractCompletionText(value);
}

export async function runOpenAICompatible({
  baseUrl,
  model,
  messages,
  authorization = "",
  timeoutMs = DEFAULT_LOCAL_AI_TIMEOUT_MS,
  fetchImpl = globalThis.fetch,
  signal = null
}) {
  if (typeof fetchImpl !== "function") throw new Error("This environment cannot contact a local AI endpoint.");
  const { chat } = resolveOpenAIEndpoints(baseUrl);
  const controller = new AbortController();
  const abortFromCaller = () => controller.abort(signal?.reason || new DOMException("AI request cancelled.", "AbortError"));
  if (signal?.aborted) abortFromCaller();
  else signal?.addEventListener?.("abort", abortFromCaller, { once: true });
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
    if (signal?.aborted) throw signal.reason instanceof Error ? signal.reason : new DOMException("AI request cancelled.", "AbortError");
    if (error?.name === "AbortError" || error?.name === "TimeoutError") {
      throw new Error(`The local AI endpoint did not respond within ${Math.round(clampTimeout(timeoutMs) / 1000)} seconds.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener?.("abort", abortFromCaller);
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

async function runMangrokGateway({ messages, requestId, timeoutMs, signal }) {
  throwIfAborted(signal);
  const bridgeTimeout = Math.min(130_000, Math.max(15_000, Number(timeoutMs) || 65_000) + 5_000);
  const result = await requestBridge("mangrok:invoke-alchemy-gateway", { messages, requestId }, bridgeTimeout, signal);
  if (!result) throw new Error("The Mangrok subscriber gateway is not connected to this application session.");
  return result;
}

function requestBridge(name, payload, timeoutMs, signal = null) {
  if (!globalThis.window || typeof globalThis.CustomEvent !== "function") return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    let settled = false;
    const onAbort = () => finish(reject, signal?.reason || new DOMException("AI request cancelled.", "AbortError"));
    const finish = (handler, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      signal?.removeEventListener?.("abort", onAbort);
      handler(value);
    };
    if (signal?.aborted) return onAbort();
    signal?.addEventListener?.("abort", onAbort, { once: true });
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

function throwIfAborted(signal) {
  if (!signal?.aborted) return;
  const reason = signal.reason;
  if (reason instanceof Error) throw reason;
  throw new DOMException("AI request cancelled.", "AbortError");
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
