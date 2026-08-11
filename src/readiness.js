import { getLocalAICapabilities, probeOpenAICompatible, sanitizeEndpoint } from "./local-ai.js";
import { entitlementDisplay, normalizeAlchemyEntitlement } from "./entitlements.js";

const SETTINGS_KEY = "mangrok.alchemy.settings.v1";
let latestReport = null;
let endpointProbe = null;

if (typeof document !== "undefined") ready(init);

function ready(callback) {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", callback, { once: true });
  else callback();
}

function init() {
  addReadinessPanel();
  bindReadinessEvents();
  runReadinessChecks();
  window.addEventListener("mangrok:auth", () => runReadinessChecks());
  window.addEventListener("online", () => runReadinessChecks());
  window.addEventListener("offline", () => runReadinessChecks());
}

function addReadinessPanel() {
  const grid = document.querySelector("#view-settings .settings-grid");
  if (!grid || document.querySelector("#readiness-panel")) return;
  const panel = document.createElement("section");
  panel.id = "readiness-panel";
  panel.className = "panel readiness-panel";
  panel.innerHTML = `
    <div class="readiness-heading">
      <div><p class="eyebrow">Production checks</p><h3>System readiness</h3></div>
      <span id="readiness-grade">Checking</span>
    </div>
    <p>Verify this device, the local AI path, cloud entitlements, offline shell, and print capability without sending recipe content anywhere.</p>
    <div id="readiness-summary" class="status-banner"></div>
    <div id="readiness-list" class="readiness-list" aria-live="polite"></div>
    <div class="button-row readiness-actions">
      <button class="button secondary" type="button" id="readiness-run">Run checks</button>
      <button class="button ghost" type="button" id="readiness-test-ai">Test local AI</button>
      <button class="button ghost" type="button" id="readiness-download">Download report</button>
    </div>
    <p class="microcopy">The downloaded report excludes recipe text, sealed notes, authentication tokens, API keys, and URL query parameters.</p>`;
  grid.append(panel);
}

function bindReadinessEvents() {
  document.querySelector("#readiness-run")?.addEventListener("click", () => runReadinessChecks());
  document.querySelector("#readiness-test-ai")?.addEventListener("click", testLocalEndpoint);
  document.querySelector("#readiness-download")?.addEventListener("click", downloadReadinessReport);
}

async function runReadinessChecks() {
  const runButton = document.querySelector("#readiness-run");
  if (runButton) { runButton.disabled = true; runButton.textContent = "Checking…"; }
  try {
    const config = globalThis.MANGROK_CONFIG || {};
    const capabilities = getLocalAICapabilities(config);
    const appStatus = await requestBridge("mangrok:request-app-status", {}, 1_500) || {};
    const entitlementRaw = appStatus.signedIn
      ? await requestBridge("mangrok:request-alchemy-entitlement", {}, 3_500).catch(() => null)
      : null;
    const storage = await storageEstimate();
    const entitlement = entitlementRaw ? normalizeAlchemyEntitlement(entitlementRaw, Number(config.alchemyTrialLimit) || 10) : null;
    const input = {
      appVersion: String(config.appVersion || "unversioned"),
      secureContext: globalThis.isSecureContext !== false,
      webCrypto: Boolean(globalThis.crypto?.subtle),
      indexedDb: Boolean(globalThis.indexedDB),
      serviceWorker: "serviceWorker" in navigator,
      serviceWorkerControlled: Boolean(navigator.serviceWorker?.controller),
      online: navigator.onLine !== false,
      webgpu: capabilities.webgpu,
      printAvailable: typeof globalThis.print === "function",
      storageAvailableBytes: storage.available,
      storageQuotaBytes: storage.quota,
      storageUsageBytes: storage.usage,
      cloudConfigured: Boolean(appStatus.cloudConfigured),
      signedIn: Boolean(appStatus.signedIn),
      gatewayConfigured: Boolean(capabilities.gateway),
      entitlement,
      localEndpoint: loadLocalSettings().url,
      endpointProbe
    };
    const checks = buildReadinessChecks(input);
    const summary = summarizeReadiness(checks);
    latestReport = buildReadinessReport({ input, checks, summary, appStatus });
    renderReadiness(checks, summary, latestReport);
  } catch (error) {
    const summary = document.querySelector("#readiness-summary");
    if (summary) {
      summary.className = "status-banner error";
      summary.innerHTML = `<b>Readiness check failed</b><br>${escapeHtml(error.message)}`;
    }
  } finally {
    if (runButton) { runButton.disabled = false; runButton.textContent = "Run checks"; }
  }
}

export function buildReadinessChecks(input = {}) {
  const entitlement = input.entitlement ? normalizeAlchemyEntitlement(input.entitlement) : null;
  const available = Number(input.storageAvailableBytes);
  const storageReady = !Number.isFinite(available) || available >= 50 * 1024 * 1024;
  const endpoint = input.endpointProbe;
  return Object.freeze([
    check("Secure browser context", Boolean(input.secureContext), "critical", input.secureContext ? "HTTPS or trusted local context is active." : "Open Mangrok through HTTPS; encryption and local AI may be blocked."),
    check("Web Crypto encryption", Boolean(input.webCrypto), "critical", input.webCrypto ? "AES-GCM sealed notes are supported." : "This browser cannot protect sealed notes."),
    check("IndexedDB vault", Boolean(input.indexedDb), "critical", input.indexedDb ? "Local recipes and attachments can be stored." : "This browser cannot open the device vault."),
    check("Offline application shell", Boolean(input.serviceWorker), "important", input.serviceWorkerControlled ? "The current page is controlled by the Mangrok service worker." : input.serviceWorker ? "Supported; reload once after installation to activate offline control." : "Service workers are unavailable."),
    check("Storage headroom", storageReady, "important", Number.isFinite(available) ? `${formatBytes(Math.max(0, available))} estimated space remains.` : "Storage quota information is unavailable; exports remain recommended."),
    check("Browser printing", Boolean(input.printAvailable), "important", input.printAvailable ? "PDF and browser print output are available." : "This browser does not expose the print interface."),
    check("Network state", Boolean(input.online), "optional", input.online ? "Online services can be contacted." : "Offline mode is active; device rules and the vault remain available."),
    check("On-device WebLLM", Boolean(input.webgpu), "optional", input.webgpu ? "WebGPU is available for an opt-in local model download." : "WebGPU is unavailable; Mangrok will use rules, Ollama, or the subscriber gateway."),
    check("Self-hosted model", Boolean(endpoint?.ok), "optional", endpoint?.ok ? `${endpoint.modelCount} model${endpoint.modelCount === 1 ? "" : "s"} reported in ${endpoint.latencyMs} ms.` : `Not verified. Configured endpoint: ${sanitizeEndpoint(input.localEndpoint)}`),
    check("Cloud backend", Boolean(input.cloudConfigured), "commercial", input.cloudConfigured ? "Supabase authentication and synchronization are configured." : "Production Supabase settings are not active in this deployment."),
    check("Signed-in account", Boolean(input.signedIn), "commercial", input.signedIn ? "An authenticated account session is active." : "Sign in to test server entitlements and private synchronization."),
    check("Subscriber AI gateway", Boolean(input.gatewayConfigured), "commercial", input.gatewayConfigured ? "The authenticated Alchemy function path is configured." : "Deploy and configure the private Alchemy gateway."),
    check("Server entitlement", Boolean(entitlement?.allowed), "commercial", entitlement ? entitlementDisplay(entitlement) : "No server-managed entitlement is available in this session.")
  ]);
}

export function summarizeReadiness(checks) {
  const values = Array.isArray(checks) ? checks : [];
  const coreBlocked = values.some(item => item.severity === "critical" && !item.ok);
  const importantBlocked = values.some(item => item.severity === "important" && !item.ok);
  const commercialReady = values.filter(item => item.severity === "commercial").every(item => item.ok);
  const deviceReady = !coreBlocked;
  const grade = coreBlocked ? "Blocked" : commercialReady && !importantBlocked ? "Production ready" : importantBlocked ? "Device review" : "Alpha ready";
  const message = coreBlocked
    ? "This device is missing a core browser capability required by Mangrok."
    : commercialReady
      ? "The device and subscriber-service checks are ready for controlled production acceptance."
      : "The local-first Alpha is usable; cloud subscriptions and the private AI service still need activation or sign-in.";
  return Object.freeze({ deviceReady, commercialReady, coreBlocked, importantBlocked, grade, message });
}

export function buildReadinessReport({ input = {}, checks = [], summary = {}, appStatus = {} } = {}) {
  return Object.freeze({
    type: "mangrok.readiness-report",
    version: 1,
    generatedAt: new Date().toISOString(),
    appVersion: String(input.appVersion || "unversioned"),
    page: typeof location !== "undefined" ? `${location.origin}${location.pathname}` : "unknown",
    userAgent: typeof navigator !== "undefined" ? String(navigator.userAgent || "") : "unknown",
    summary,
    checks,
    environment: {
      online: Boolean(input.online),
      secureContext: Boolean(input.secureContext),
      serviceWorkerControlled: Boolean(input.serviceWorkerControlled),
      webgpu: Boolean(input.webgpu),
      storageUsageBytes: numberOrNull(input.storageUsageBytes),
      storageQuotaBytes: numberOrNull(input.storageQuotaBytes),
      storageAvailableBytes: numberOrNull(input.storageAvailableBytes),
      cloudConfigured: Boolean(input.cloudConfigured),
      signedIn: Boolean(input.signedIn),
      gatewayConfigured: Boolean(input.gatewayConfigured),
      localEndpoint: sanitizeEndpoint(input.localEndpoint),
      localEndpointProbe: input.endpointProbe || null,
      recipeCount: Number(appStatus.recipeCount) || 0,
      bookCount: Number(appStatus.bookCount) || 0
    },
    privacy: "No recipe content, sealed notes, credentials, tokens, or endpoint query parameters are included."
  });
}

async function testLocalEndpoint() {
  const button = document.querySelector("#readiness-test-ai");
  if (button) { button.disabled = true; button.textContent = "Testing…"; }
  try {
    const settings = loadLocalSettings();
    endpointProbe = await probeOpenAICompatible({ baseUrl: settings.url, timeoutMs: 7_000 });
  } catch (error) {
    endpointProbe = Object.freeze({ ok: false, endpoint: sanitizeEndpoint(loadLocalSettings().url), error: String(error.message || error) });
  } finally {
    if (button) { button.disabled = false; button.textContent = "Test local AI"; }
    await runReadinessChecks();
  }
}

function renderReadiness(checks, summary, report) {
  const grade = document.querySelector("#readiness-grade");
  const summaryNode = document.querySelector("#readiness-summary");
  const list = document.querySelector("#readiness-list");
  if (grade) { grade.textContent = summary.grade; grade.dataset.grade = summary.grade.toLowerCase().replaceAll(" ", "-"); }
  if (summaryNode) {
    summaryNode.className = `status-banner ${summary.coreBlocked ? "error" : summary.commercialReady ? "online" : ""}`;
    summaryNode.innerHTML = `<b>${escapeHtml(summary.grade)}</b><br>${escapeHtml(summary.message)}`;
  }
  if (list) {
    list.innerHTML = checks.map(item => `<article class="readiness-item ${item.ok ? "ready" : item.severity}">
      <div><b>${escapeHtml(item.name)}</b><p>${escapeHtml(item.detail)}</p></div><span>${item.ok ? "Ready" : item.severity === "optional" ? "Optional" : item.severity === "commercial" ? "Activation" : "Action"}</span>
    </article>`).join("");
  }
  const download = document.querySelector("#readiness-download");
  if (download) download.disabled = !report;
}

function downloadReadinessReport() {
  if (!latestReport) return;
  const blob = new Blob([JSON.stringify(latestReport, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `mangrok-readiness-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function requestBridge(name, payload = {}, timeoutMs = 2_000) {
  if (typeof CustomEvent !== "function") return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (handler, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      handler(value);
    };
    const timeout = setTimeout(() => finish(resolve, null), timeoutMs);
    window.dispatchEvent(new CustomEvent(name, { detail: {
      ...payload,
      resolve: value => finish(resolve, value),
      reject: error => finish(reject, error instanceof Error ? error : new Error(String(error || "Request failed.")))
    } }));
  });
}

async function storageEstimate() {
  try {
    const estimate = await navigator.storage?.estimate?.();
    const usage = Number(estimate?.usage);
    const quota = Number(estimate?.quota);
    return {
      usage: Number.isFinite(usage) ? usage : null,
      quota: Number.isFinite(quota) ? quota : null,
      available: Number.isFinite(quota) && Number.isFinite(usage) ? Math.max(0, quota - usage) : null
    };
  } catch { return { usage: null, quota: null, available: null }; }
}

function loadLocalSettings() {
  try {
    const value = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    return { url: String(value.url || "http://127.0.0.1:11434/v1"), model: String(value.model || "llama3.2") };
  } catch { return { url: "http://127.0.0.1:11434/v1", model: "llama3.2" }; }
}

function check(name, ok, severity, detail) { return Object.freeze({ name, ok: Boolean(ok), severity, detail: String(detail || "") }); }
function numberOrNull(value) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : null; }
function formatBytes(value) { const bytes = Number(value) || 0; if (bytes < 1024) return `${bytes} B`; if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`; if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`; return `${(bytes / 1073741824).toFixed(1)} GB`; }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]); }
