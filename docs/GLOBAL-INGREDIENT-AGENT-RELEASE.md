# Mangrok 3.4 global ingredient and culinary-agent release

This release establishes a continuously growable global ingredient knowledge system and a bounded Hermes-inspired culinary-agent architecture.

## Included now

- 1,407 deterministic reviewed seed ingredients.
- More than 45 cuisine and culinary-tradition filters.
- Canonical names, aliases, transliterations, provenance, source IDs, dietary tags, allergens, and catalog versions.
- Personal ingredients that are usable immediately.
- Moderated community proposals with pending, needs-information, approved, rejected, merged, and withdrawn states.
- Alias-aware search and constrained substitution candidates.
- Explicit agent tools, on-demand skills, deterministic routing, and culinary-simulation grounding.
- Opt-in bounded local memory and searchable session summaries.
- Owner-scoped cloud contracts and service-role-only catalog moderation.

## Privacy boundary

Agent memory is off by default. Memory writes and shared catalog submissions require explicit confirmation. Passphrases, credentials, private keys, sealed-note plaintext, decryption material, and full recipe-sized payloads are rejected or excluded.

## Activation boundary

The reviewed offline catalog, personal ingredients, local tools, routing, and local memory work in the browser. Shared catalog moderation and cloud memory require applying `supabase/migrations/004_global_ingredient_agent_memory.sql` and configuring the production Supabase project.
