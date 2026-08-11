import test from "node:test";
import assert from "node:assert/strict";
import { buildReadinessChecks, buildReadinessReport, summarizeReadiness } from "../src/readiness.js";

test("device Alpha readiness does not pretend commercial activation", () => {
  const checks = buildReadinessChecks({
    secureContext: true, webCrypto: true, indexedDb: true, serviceWorker: true, serviceWorkerControlled: true,
    online: true, webgpu: false, printAvailable: true, storageAvailableBytes: 200_000_000,
    cloudConfigured: false, signedIn: false, gatewayConfigured: false, entitlement: null,
    localEndpoint: "http://user:secret@127.0.0.1:11434/v1?token=hidden"
  });
  const summary = summarizeReadiness(checks);
  assert.equal(summary.deviceReady, true);
  assert.equal(summary.commercialReady, false);
  assert.equal(summary.grade, "Alpha ready");
});

test("complete subscriber checks produce a production-ready grade", () => {
  const checks = buildReadinessChecks({
    secureContext: true, webCrypto: true, indexedDb: true, serviceWorker: true, serviceWorkerControlled: true,
    online: true, webgpu: true, printAvailable: true, storageAvailableBytes: 500_000_000,
    cloudConfigured: true, signedIn: true, gatewayConfigured: true,
    entitlement: { allowed: true, plan: "pro", status: "active", remaining: 25, period_limit: 100, period_used: 75 },
    endpointProbe: { ok: true, modelCount: 2, latencyMs: 40 }, localEndpoint: "http://127.0.0.1:11434/v1"
  });
  const summary = summarizeReadiness(checks);
  assert.equal(summary.commercialReady, true);
  assert.equal(summary.grade, "Production ready");
});

test("readiness reports exclude credential-bearing URL components", () => {
  const input = { appVersion: "test", localEndpoint: "http://user:pass@localhost:11434/v1?key=secret", online: true };
  const report = buildReadinessReport({ input, checks: [], summary: {}, appStatus: {} });
  assert.equal(report.environment.localEndpoint, "http://localhost:11434/v1");
  assert.doesNotMatch(JSON.stringify(report), /pass|secret/);
});
