# Mangrok production-readiness cycle

This cycle converts previously prepared Alchemy infrastructure into testable, operator-facing product behavior without pretending that external credentials, billing contracts, or model hardware already exist.

## Shipped in the application

- A **System readiness** panel in Settings that checks HTTPS, Web Crypto, IndexedDB, offline control, storage headroom, printing, WebGPU, local-model connectivity, cloud configuration, authentication, subscriber-gateway configuration, and server entitlements.
- A privacy-safe readiness report download. It excludes recipes, sealed notes, credentials, authentication tokens, and URL query parameters.
- A local OpenAI-compatible/Ollama model probe with a bounded timeout and model-list inspection.
- A visible PWA update notice so users can deliberately reload into a new application shell rather than unknowingly remaining on an old cached version.
- A print-edition preflight that estimates pages, validates recipe completeness, reports sealed-note consequences, and downloads a proof manifest without secret text.
- Server entitlement display inside Alchemy when the user is signed in and the production migration is active.
- Private account history for completed Alchemy experiments.

## Server contracts

Apply migrations in this order:

1. `001_platform.sql`
2. `002_alchemy.sql`
3. `003_alchemy_production.sql`

The third migration adds:

- idempotent usage events keyed by user and request ID;
- entitlement inspection without consuming a run;
- atomic credit consumption;
- automatic credit refund when the model request fails, restricted to the service-role Edge Function;
- completion metadata for latency and model monitoring;
- richer experiment metadata and update policies.

Deploy the updated `alchemy-ai` Edge Function only after setting:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only Edge Function secret)
- `ALLOWED_ORIGINS`
- `AI_GATEWAY_URL`
- optional `AI_GATEWAY_KEY`
- `AI_MODEL`
- `AI_TIMEOUT_MS`

`ALLOWED_ORIGINS` should be a comma-separated allowlist. Do not expose the raw model server to public browsers.

## Acceptance sequence

1. Run `npm run check`.
2. Open Settings → System readiness and download a baseline report.
3. Test Ollama or another compatible endpoint from the same browser.
4. Apply all three migrations to a non-production Supabase project.
5. Sign in with two independent accounts and verify data isolation.
6. Run one successful gateway request, one repeated request with the same request ID, one model timeout, and one model error. Confirm that retries are not double-charged, refunded request IDs consume a fresh credit when retried, failed model calls are refunded, and browser clients cannot call the refund RPC.
7. Save an Alchemy result and confirm that it appears in private experiment history.
8. Build a cookbook, download the print proof manifest, inspect every generated PDF page, and create a physical proof before enabling ordering.
9. Only then connect billing webhooks to entitlement records.

## Product boundary

Mangrok Alchemy is a culinary prediction and discovery aid. It is not a physical simulation, allergen authority, or replacement for verified food-safety guidance.
