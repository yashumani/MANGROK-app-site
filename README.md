# Mangrok — AI Culinary Alchemy, Recipe Vault, and Print Studio

Mangrok is a local-first AI culinary discovery lab, private recipe vault, and illustrated cookbook studio. It works immediately as a progressive web app and can be connected to a Supabase backend for authenticated synchronization, server-metered Alchemy, row-level access control, private media, print operations, and human-reviewed legacy instructions.

> **Brand note:** Mangrok remains a working product name until formal trademark and market clearance is complete.

## What is implemented

- Responsive, installable recipe vault with search, filters, favorites, backups, offline shell, and migration from the original browser MVP.
- Four access labels: Only me, Family vault, Trusted circle, and Open recipe.
- AES-256-GCM sealed notes derived with PBKDF2-SHA-256 at 310,000 iterations. Passphrases are never persisted.
- Recipe versions and restore flows.
- Trusted circles, viewer/contributor/custodian roles, separate sealed-note permission, expiration, and revocation.
- Revocable, view-limited links. Optional sealed notes use a second client-side encryption key carried in the URL fragment, never the server request.
- Private photographs, handwritten cards, audio, video, and documents.
- Recipe origin, story, creator, place, year, and current custodian.
- Explainable Alchemy Lab with ingredient, equipment, heat, timing, technique, risk, flavor, science, and recipe-evolution analysis.
- Optional WebLLM and self-hosted Ollama/OpenAI-compatible refinement without committing model weights.
- Server-ready Alchemy entitlements, idempotent usage events, failed-call refunds, and private experiment history.
- 6 × 9 inch print studio with cover, dedication, contents, five themes, generated culinary art, irreversible-secret confirmation, and downloadable preflight manifests.
- Settings-based production readiness checks for browser capabilities, local AI, cloud activation, entitlements, storage, offline control, and printing.
- Idempotent print-order Edge Function with private proof requirements and a safe no-provider state.
- Legacy plans with recipients, release conditions, cancellation, and mandatory human review. No timer releases recipes automatically.
- Supabase schema, RLS policies, private Storage policies, migration, account export, and deletion-request workflow.
- Automated tests, static validation, production build, security documentation, acceptance tests, legal drafts, and GitHub Pages deployment.

## Important boundaries

The repository is application-complete, but three external activations cannot be fabricated in source code:

1. **Cloud accounts and Alchemy:** create a Supabase project, apply migrations `001`, `002`, and `003`, deploy the updated Alchemy function, configure email authentication, and place only the public URL and anonymous key in `runtime-config.js`.
2. **Physical books:** configure a real print provider, private PDF-proof pipeline, commercial terms, tax/shipping rules, and provider secrets in Edge Function environment variables.
3. **Legacy release:** establish trained human reviewers, identity-verification procedures, legal review, and an auditable decision process. The supplied function only flags plans for review.

Until cloud configuration is present, the deployed site intentionally runs in device-only mode. It must not be described as a server-secured vault.

## Local development

```bash
npm run check
python3 -m http.server 4173
```

Open `http://localhost:4173`. No package install is required because tests and builds use Node built-ins.

## Build

```bash
npm run build
```

The deployable site is written to `dist/`. GitHub Pages builds and publishes that directory from `main`.

## Cloud activation

1. Create a Supabase project.
2. Apply `supabase/migrations/001_platform.sql` once to a clean project.
3. Apply `supabase/migrations/002_alchemy.sql` and `003_alchemy_production.sql`.
4. Deploy `print-order`, `legacy-review`, and `alchemy-ai` Edge Functions.
5. Configure function secrets from the supplied `.env.example` files. The Alchemy function requires a server-only service-role key for refund/completion bookkeeping; never expose it to the browser.
6. Copy the project URL and **anonymous** key into `runtime-config.js`.
7. Run every test in `docs/ACCEPTANCE-TESTS.md` and `docs/PRODUCTION-READINESS.md` with two independent accounts before enabling public sign-up.

Never place the service-role key in browser code, GitHub Pages, or `runtime-config.js`.

## Repository map

```text
index.html, styles.css       Responsive application shell
src/                         Model, crypto, IndexedDB, cloud adapter, UI, print renderer
supabase/migrations/         Data model, functions, RLS, Storage policies
supabase/functions/          Server-only print and legacy review adapters
tests/                       Node tests for crypto, model, print safety, and security contracts
docs/                        Deployment, acceptance, threat, print, legacy, and release runbooks
legal/                       Privacy and terms drafts requiring counsel review
.github/workflows/           CI and GitHub Pages deployment
```

## License and content

No license is granted for user recipe content. Add an explicit source-code license only after the owner chooses one.
