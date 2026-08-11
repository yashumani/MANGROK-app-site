import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = file => readFile(path.join(root, file), "utf8");

test("browser bundle contains no service-role or private gateway credential", async () => {
  const texts = await Promise.all(["runtime-config.js", "src/app.js", "src/cloud.js", "src/store.js", "src/local-ai.js"].map(read));
  for (const text of texts) {
    assert.ok(!text.includes("SUPABASE_SERVICE_ROLE_KEY"));
    assert.doesNotMatch(text, /AI_GATEWAY_KEY\s*[:=]\s*["'][^"']+/i);
  }
});

test("database contract enables RLS and contributor field guards", async () => {
  const sql = await read("supabase/migrations/001_platform.sql");
  for (const phrase of ["alter table public.recipes enable row level security", "guard_and_version_recipe", "Contributors cannot change ownership, privacy, or sealed-note fields", "recipe_assets_storage_select", "get_shared_recipe"]) assert.ok(sql.includes(phrase), phrase);
});

test("Alchemy metering is idempotent, retry-safe, and service-role refunded", async () => {
  const sql = await read("supabase/migrations/003_alchemy_production.sql");
  for (const phrase of [
    "alchemy_usage_events",
    "unique(user_id, request_id)",
    "consume_alchemy_credit(p_request_id uuid)",
    "existing.refunded_at is null",
    "refund_alchemy_credit_for_user",
    "complete_alchemy_usage_for_user",
    "get_alchemy_entitlement",
    "service role required"
  ]) assert.ok(sql.includes(phrase), phrase);
  assert.ok(sql.indexOf("for update") < sql.indexOf("insert into public.alchemy_usage_events"));
  assert.match(sql, /grant execute on function public\.refund_alchemy_credit_for_user\([^)]+\) to service_role/i);
  assert.doesNotMatch(sql, /grant execute on function public\.refund_alchemy_credit_for_user\([^)]+\) to authenticated/i);
  assert.match(sql, /usage\.completed_at is not null then return false/i);
});

test("Alchemy gateway validates requests before consuming credits and uses private refund authority", async () => {
  const code = await read("supabase/functions/alchemy-ai/index.ts");
  assert.ok(code.indexOf("sanitizeMessages(body.messages)") < code.indexOf('rpc("consume_alchemy_credit"'));
  for (const phrase of [
    "p_request_id",
    "SUPABASE_SERVICE_ROLE_KEY",
    "refund_alchemy_credit_for_user",
    "complete_alchemy_usage_for_user",
    "model_gateway_timeout",
    "origin_not_allowed",
    "MAX_TOTAL_MESSAGE_CHARS",
    "X-Request-Id"
  ]) assert.ok(code.includes(phrase), phrase);
});

test("legacy automation is review-only", async () => {
  const code = await read("supabase/functions/legacy-review/index.ts");
  assert.ok(code.includes('status: "review_pending"'));
  assert.ok(code.includes("released: 0"));
  assert.ok(code.includes("does not contact recipients"));
});

test("print adapter is authenticated and idempotent", async () => {
  const code = await read("supabase/functions/print-order/index.ts");
  assert.ok(code.includes("auth.getUser"));
  assert.ok(code.includes('eq("request_id", requestId)'));
  assert.ok(code.includes('"idempotency-key": requestId'));
  assert.ok(code.includes("proof_required"));
  assert.ok(code.includes("provider_not_configured"));
});
