# Mangrok agent, tools, skills, and memory architecture

## Reference pattern

Mangrok borrows architectural ideas from Nous Research's Hermes Agent: provider-independent inference, explicit tools, on-demand skills, searchable sessions, bounded memory, and pluggable local/cloud stores. Mangrok does not copy Hermes Agent source or claim full feature parity.

## Agent flow

Each Alchemy request follows a controlled sequence:

1. Normalize the user's formula and intent.
2. Select a small set of culinary skills.
3. Produce a bounded deterministic tool plan.
4. Execute read-only tools first.
5. Recall only relevant, user-approved memories and session summaries.
6. Assemble a bounded agent context.
7. Run Mangrok's deterministic culinary simulation.
8. Optionally ask the selected local or private LLM to refine the explanation.
9. Validate structured output and merge it with the deterministic result.
10. Save a session summary only when memory is enabled; side-effect tools require confirmation.

## Tool registry

The initial registry exposes:

- `search_ingredients`
- `ingredient_profile`
- `find_substitutions`
- `recall_memory`
- `search_sessions`
- `save_memory`
- `submit_ingredient`
- `inspect_simulation`

Tools declare their schema and whether they have side effects. `save_memory` and `submit_ingredient` are denied unless the caller supplies explicit confirmation.

## Skills

Skills are small manifests loaded for the current intent rather than one oversized system prompt:

- ingredient explorer;
- substitution guide;
- technique guard;
- recipe evolution;
- memory recall;
- catalog curation.

## Memory scopes

Permitted memory scopes are deliberately narrow:

- preference;
- ingredient;
- technique;
- equipment;
- dietary;
- cuisine;
- session summary;
- correction.

Local memory uses IndexedDB with an in-memory fallback. Cloud memory uses owner-scoped Supabase tables and RLS. Session history is separate from the recipe Vault and can be searched without injecting complete recipes into every prompt.

## Excluded data

Mangrok memory rejects or redacts:

- passphrases and passwords;
- API keys and bearer tokens;
- service-role credentials;
- private keys and recovery phrases;
- sealed-note plaintext;
- decryption material;
- full recipe-sized payloads by default.

The LLM receives concise memory items, tool summaries, and deterministic simulation facts—not unrestricted access to the user's Vault.

## Provider independence

The same agent context can be supplied to:

- the on-device WebLLM model;
- a self-hosted Ollama/OpenAI-compatible model;
- Mangrok's authenticated private gateway.

If the optional LLM fails, times out, or returns invalid structured data, the deterministic culinary result remains available and the failed refinement does not consume an Alpha trial.

## Production controls

The database migration provides owner-scoped sessions, messages, tool runs, and memories; published-only ingredient reading; owner-only submissions; and service-role-only moderation. Production deployment still requires applying the migration and configuring the private backend.
