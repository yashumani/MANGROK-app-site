import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const MAX_MESSAGES = 12;
const MAX_MESSAGE_CHARS = 8_000;
const MAX_TOTAL_MESSAGE_CHARS = 32_000;
const MAX_UPSTREAM_BYTES = 1_500_000;

Deno.serve(async request => {
  const requestOrigin = request.headers.get("Origin");
  const cors = corsHeaders(requestOrigin);

  if (requestOrigin && !originAllowed(requestOrigin)) {
    return json({ error: "origin_not_allowed" }, 403, cors);
  }
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, cors);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400, cors);
  }

  const messages = sanitizeMessages(body.messages);
  if (!messages.length) return json({ error: "messages_required" }, 400, cors);
  if (messages.reduce((sum, message) => sum + message.content.length, 0) > MAX_TOTAL_MESSAGE_CHARS) {
    return json({ error: "messages_too_large" }, 413, cors);
  }

  const authHeader = request.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "authentication_required" }, 401, cors);

  const requestId = validUuid(body.requestId) ? String(body.requestId) : crypto.randomUUID();
  const supabaseUrl = requiredEnv("SUPABASE_URL");
  const supabase = createClient(supabaseUrl, requiredEnv("SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const admin = createClient(supabaseUrl, requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return json({ error: "invalid_session" }, 401, cors);

  const { data: rows, error: creditError } = await supabase.rpc("consume_alchemy_credit", { p_request_id: requestId });
  if (creditError) return json({ error: "entitlement_check_failed" }, 500, cors);
  const entitlement = Array.isArray(rows) ? rows[0] : rows;
  if (!entitlement?.allowed) return json({ error: "subscription_required", entitlement, requestId }, 402, cors);

  const model = optionalEnv("AI_MODEL") || "mangrok-alchemy";
  const timeoutMs = boundedInteger(optionalEnv("AI_TIMEOUT_MS"), 45_000, 5_000, 120_000);
  const startedAt = performance.now();

  try {
    const endpoint = chatEndpoint(requiredEnv("AI_GATEWAY_URL"));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let upstream: Response;
    try {
      upstream = await fetch(endpoint, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...(optionalEnv("AI_GATEWAY_KEY") ? { Authorization: `Bearer ${optionalEnv("AI_GATEWAY_KEY")}` } : {})
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.25,
          max_tokens: 1_000,
          response_format: { type: "json_object" },
          stream: false
        })
      });
    } finally {
      clearTimeout(timeout);
    }

    const upstreamText = await boundedText(upstream, MAX_UPSTREAM_BYTES);
    if (!upstream.ok) {
      await refund(admin, userData.user.id, requestId, `model gateway returned ${upstream.status}`);
      return json({ error: "model_gateway_failed", status: upstream.status, requestId }, 502, cors);
    }

    let completion: unknown;
    try {
      completion = upstreamText ? JSON.parse(upstreamText) : {};
    } catch {
      await refund(admin, userData.user.id, requestId, "model gateway returned invalid JSON");
      return json({ error: "invalid_model_response", requestId }, 502, cors);
    }

    if (!completionText(completion)) {
      await refund(admin, userData.user.id, requestId, "model gateway returned no completion text");
      return json({ error: "empty_model_response", requestId }, 502, cors);
    }

    const latencyMs = Math.max(0, Math.round(performance.now() - startedAt));
    const { error: completionError } = await admin.rpc("complete_alchemy_usage_for_user", {
      p_user_id: userData.user.id,
      p_request_id: requestId,
      p_model: model,
      p_latency_ms: latencyMs
    });
    if (completionError) console.error("alchemy completion tracking failed", { requestId, message: completionError.message });

    return json({ completion, entitlement, requestId, model, latencyMs }, 200, cors, requestId);
  } catch (error) {
    await refund(admin, userData.user.id, requestId, error instanceof Error ? error.message : "model request failed");
    if (error instanceof DOMException && error.name === "AbortError") {
      return json({ error: "model_gateway_timeout", requestId }, 504, cors, requestId);
    }
    console.error("alchemy-ai", { requestId, error: error instanceof Error ? error.message : String(error) });
    return json({ error: "model_gateway_unavailable", requestId }, 502, cors, requestId);
  }
});

function sanitizeMessages(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, MAX_MESSAGES).map(item => {
    const candidate = item && typeof item === "object" ? item as Record<string, unknown> : {};
    const role = ["system", "user", "assistant"].includes(String(candidate.role)) ? String(candidate.role) : "user";
    return { role, content: String(candidate.content || "").slice(0, MAX_MESSAGE_CHARS) };
  }).filter(message => message.content);
}

function originAllowed(origin: string) {
  const allowed = configuredOrigins();
  return allowed.includes("*") || allowed.includes(origin);
}

function configuredOrigins() {
  return (optionalEnv("ALLOWED_ORIGINS") || optionalEnv("ALLOWED_ORIGIN") || "")
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = configuredOrigins();
  const allowOrigin = origin && originAllowed(origin) ? origin : allowed.includes("*") ? "*" : "";
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization,apikey,content-type",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
  if (allowOrigin) headers["Access-Control-Allow-Origin"] = allowOrigin;
  return headers;
}

function chatEndpoint(value: string) {
  const base = value.replace(/\/+$/, "");
  if (/\/chat\/completions$/i.test(base)) return base;
  if (/\/v1$/i.test(base)) return `${base}/chat/completions`;
  return `${base}/v1/chat/completions`;
}

async function boundedText(response: Response, maximumBytes: number) {
  const text = await response.text();
  if (new TextEncoder().encode(text).byteLength > maximumBytes) throw new Error("model response exceeded size limit");
  return text;
}

function completionText(payload: unknown) {
  const value = payload && typeof payload === "object" ? payload as Record<string, any> : {};
  return String(
    value?.choices?.[0]?.message?.content ??
    value?.response ??
    value?.output_text ??
    value?.message?.content ??
    ""
  ).trim();
}

async function refund(admin: any, userId: string, requestId: string, reason: string) {
  const { error } = await admin.rpc("refund_alchemy_credit_for_user", {
    p_user_id: userId,
    p_request_id: requestId,
    p_reason: reason.slice(0, 500)
  });
  if (error) console.error("alchemy refund failed", { requestId, message: error.message });
}

function validUuid(value: unknown) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function optionalEnv(name: string) { return Deno.env.get(name) || ""; }

function boundedInteger(value: unknown, fallback: number, minimum: number, maximum: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, Math.round(parsed))) : fallback;
}

function json(value: unknown, status = 200, cors: Record<string, string> = {}, requestId = "") {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      ...cors,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...(requestId ? { "X-Request-Id": requestId } : {})
    }
  });
}
