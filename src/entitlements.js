export const LOCAL_TRIAL_KEY = "mangrok.alchemy.trials.v1";

const PAID_PLANS = new Set(["pro", "studio", "admin"]);
const ACTIVE_STATUSES = new Set(["trialing", "active"]);

export function normalizeAlchemyEntitlement(value, fallbackLimit = 10) {
  const source = Array.isArray(value) ? value[0] : (value || {});
  const plan = cleanEnum(source.plan, ["trial", "pro", "studio", "admin"], "trial");
  const status = cleanEnum(source.status, ["trialing", "active", "past_due", "paused", "cancelled", "expired"], "trialing");
  const trialLimit = nonNegativeInteger(source.trial_limit ?? source.trialLimit, fallbackLimit);
  const trialUsed = nonNegativeInteger(source.trial_used ?? source.trialUsed, 0);
  const periodLimitRaw = source.period_limit ?? source.periodLimit;
  const periodLimit = periodLimitRaw === null || periodLimitRaw === undefined || periodLimitRaw === ""
    ? null
    : nonNegativeInteger(periodLimitRaw, 0);
  const periodUsed = nonNegativeInteger(source.period_used ?? source.periodUsed, 0);
  const unlimited = source.remaining === -1 || (PAID_PLANS.has(plan) && status === "active" && periodLimit === null);
  const derivedRemaining = plan === "trial" || status === "trialing"
    ? Math.max(0, trialLimit - trialUsed)
    : periodLimit === null
      ? -1
      : Math.max(0, periodLimit - periodUsed);
  const remaining = unlimited ? -1 : integerOr(source.remaining, derivedRemaining);
  const periodEndsAt = normalizeDate(source.period_ends_at ?? source.periodEndsAt);
  const periodExpired = Boolean(periodEndsAt && Date.parse(periodEndsAt) <= Date.now());
  const allowed = typeof source.allowed === "boolean"
    ? source.allowed
    : ACTIVE_STATUSES.has(status) && !periodExpired && (unlimited || remaining > 0);

  return Object.freeze({
    serverManaged: Boolean(source.serverManaged ?? source.user_id ?? source.userId ?? [
      "trial_limit", "trial_used", "period_limit", "period_used", "period_ends_at", "remaining", "allowed"
    ].some(key => Object.hasOwn(source, key))),
    allowed: Boolean(allowed),
    plan,
    status,
    remaining: unlimited ? -1 : Math.max(0, remaining),
    unlimited,
    trialLimit,
    trialUsed,
    periodLimit,
    periodUsed,
    periodEndsAt,
    periodExpired
  });
}

export function readLocalTrial(storage, limit = 10, key = LOCAL_TRIAL_KEY) {
  const safeLimit = Math.max(1, nonNegativeInteger(limit, 10));
  let used = 0;
  try {
    used = nonNegativeInteger(storage?.getItem?.(key), 0);
  } catch {
    used = 0;
  }
  used = Math.min(safeLimit, used);
  return Object.freeze({
    serverManaged: false,
    allowed: used < safeLimit,
    plan: "local-alpha",
    status: used < safeLimit ? "trialing" : "expired",
    remaining: Math.max(0, safeLimit - used),
    unlimited: false,
    trialLimit: safeLimit,
    trialUsed: used,
    periodLimit: null,
    periodUsed: 0,
    periodEndsAt: null,
    periodExpired: false
  });
}

export function consumeLocalTrial(storage, limit = 10, key = LOCAL_TRIAL_KEY) {
  const current = readLocalTrial(storage, limit, key);
  if (!current.allowed) return current;
  try {
    storage?.setItem?.(key, String(current.trialUsed + 1));
  } catch {
    // The caller still receives a deterministic result; storage failures simply make
    // the local Alpha counter non-durable and must never be treated as paid access.
  }
  return readLocalTrial(storage, limit, key);
}

export function entitlementDisplay(entitlement) {
  const value = normalizeAlchemyEntitlement(entitlement);
  if (value.unlimited) return `${capitalize(value.plan)} · unlimited discovery`;
  if (value.serverManaged) return `${capitalize(value.plan)} · ${value.remaining} server-metered run${value.remaining === 1 ? "" : "s"} remaining`;
  return `${value.remaining} of ${value.trialLimit} local Alpha run${value.trialLimit === 1 ? "" : "s"} remaining`;
}

function cleanEnum(value, allowed, fallback) {
  const normalized = String(value || "").trim().toLowerCase();
  return allowed.includes(normalized) ? normalized : fallback;
}

function nonNegativeInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : fallback;
}

function integerOr(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.floor(parsed) : fallback;
}

function normalizeDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function capitalize(value) {
  return String(value || "").replace(/^./, character => character.toUpperCase());
}
