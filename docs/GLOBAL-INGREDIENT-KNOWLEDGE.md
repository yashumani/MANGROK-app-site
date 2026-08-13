# Mangrok global ingredient knowledge system

## Product objective

Mangrok needs a catalog that can cover global and regional cooking without pretending a static list is complete. The catalog therefore has four layers:

1. **Published seed** — reviewed, versioned, provenance-aware entries bundled for fast and offline search.
2. **Published cloud catalog** — reviewed additions and aliases delivered from Mangrok's database.
3. **Personal ingredients** — user-created entries immediately usable in private recipes and experiments.
4. **Moderation queue** — optional community proposals that remain unverified until a reviewer approves, merges, rejects, or requests more information.

## Browser seed

Release `2026.08-global-seed.1` contains exactly **1,407** canonical ingredient entries. It spans more than 45 cuisine/tradition filters and includes regional aliases, broad categories, dietary tags, known allergen tags, provenance, source identifiers, and visual indexes.

The seed is intentionally ingredient-oriented. It filters obvious restaurant meals, prepared commercial products, supplements, infant foods, and recipe-level dishes from reference data.

## Search and resolution

Search normalizes accents, punctuation, transliterations, and spacing. A query can match:

- canonical name;
- alias or regional name;
- category;
- cuisine or tradition;
- region;
- source identifier.

The catalog supports cuisine filtering, paging, dietary constraints, allergen exclusions, personal entries, and same-category substitution candidates. Cuisine links mean “used in or associated with,” not cultural ownership or exclusivity.

## Community submissions

A missing ingredient can be saved locally after explicit confirmation. If the user is signed in and cloud services are configured, the same proposal is submitted using an idempotent client request ID.

Moderation statuses are:

- `pending`
- `needs-information`
- `approved`
- `rejected`
- `merged`
- `withdrawn`

A proposal that matches an existing canonical name or alias is linked as a duplicate rather than published again. Global approval is a service-role-only operation. Browser clients and subscribers cannot self-publish.

## Provenance and licensing

Every shared entry can store source name, source ID, URL, license, catalog version, reviewer, and review time. External data is not merged unless its license is compatible with the intended distribution and attribution model.

The initial reference sources and licensing boundaries are documented in `docs/RESEARCH-SOURCES.md`.

## Growth process

Future catalog releases should:

1. stage source imports;
2. normalize and deduplicate canonical keys;
3. preserve aliases and language/script metadata;
4. review cuisine links and cultural context;
5. validate allergen and dietary tags;
6. publish a versioned catalog manifest;
7. retain a reversible audit trail.

This is a continuously curated knowledge system, not a one-time attempt to enumerate “all ingredients.”
