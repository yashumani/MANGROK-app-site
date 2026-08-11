# Product status

## Code-complete

The repository contains the end-to-end application, local-first storage, optional cloud adapter, database schema and policies, private media model, sharing and revocation, version history, print studio, fulfillment adapter, legacy review adapter, tests, legal drafts, and deployment automation.

## Live without external credentials

The public GitHub Pages build runs as a functional device-only PWA. Users can preserve, encrypt, search, export, restore, and print recipes without an account or paid infrastructure.

## Requires operator activation

| Capability | Required external action |
|---|---|
| Authenticated sync | Create and configure Supabase; apply SQL; run two-user RLS tests |
| Email sign-in | Configure sender, redirect URLs, abuse/rate controls, and recovery policy |
| Physical fulfillment | Select provider; configure private proofs, pricing, taxes, shipping, refunds, and credentials |
| Legacy release | Establish identity verification, legal policy, reviewer roles, audit logging, and incident procedures |
| Final public brand | Complete professional trademark and market clearance |

No documentation should call these operator-owned items complete until evidence is attached to a release checklist.
