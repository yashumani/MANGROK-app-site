import test from "node:test";
import assert from "node:assert/strict";
import { consumeLocalTrial, entitlementDisplay, normalizeAlchemyEntitlement, readLocalTrial } from "../src/entitlements.js";

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return { getItem: key => values.has(key) ? values.get(key) : null, setItem: (key, value) => values.set(key, String(value)) };
}

test("server trial entitlements normalize predictably", () => {
  const entitlement = normalizeAlchemyEntitlement({ plan: "trial", status: "trialing", trial_limit: 10, trial_used: 4 });
  assert.equal(entitlement.allowed, true);
  assert.equal(entitlement.remaining, 6);
  assert.match(entitlementDisplay(entitlement), /6 server-metered runs remaining/);
});

test("unlimited paid entitlements preserve the sentinel", () => {
  const entitlement = normalizeAlchemyEntitlement({ plan: "studio", status: "active", period_limit: null, period_used: 12, remaining: -1 });
  assert.equal(entitlement.unlimited, true);
  assert.equal(entitlement.remaining, -1);
  assert.match(entitlementDisplay(entitlement), /unlimited/i);
});

test("expired paid periods fail closed", () => {
  const entitlement = normalizeAlchemyEntitlement({ plan: "pro", status: "active", period_limit: 100, period_used: 1, period_ends_at: "2000-01-01T00:00:00Z" });
  assert.equal(entitlement.periodExpired, true);
  assert.equal(entitlement.allowed, false);
});

test("local Alpha trials are bounded and durable when storage works", () => {
  const storage = memoryStorage({ "mangrok.alchemy.trials.v1": "9" });
  assert.equal(readLocalTrial(storage, 10).remaining, 1);
  assert.equal(consumeLocalTrial(storage, 10).remaining, 0);
  assert.equal(consumeLocalTrial(storage, 10).allowed, false);
});
