# Global ingredient and agent research sources

Mangrok does not claim that a finite seed contains every culinary ingredient. The production design separates a versioned reviewed catalog from personal ingredients, pending community proposals, and future licensed imports.

## Ontology and food-data references

- **FoodOn** — reference architecture for food-source, food-product, process, organism, and geographic relationships. Mangrok uses it as an ontology design reference; FoodOn records are not silently copied into the browser bundle.
- **USDA FoodData Central** — public-domain/CC0 reference names and identifiers from Foundation Foods and SR Legacy. The browser seed records source and source ID where a USDA entry is used. Nutrient values are not bundled into this release.
- **FAO/INFOODS** — reference for food-composition terminology, regional food-composition programs, identifiers, and quality principles.
- **Open Food Facts** — research reference for multilingual aliases, taxonomy maintenance, allergens, and real-world label vocabulary. Its database is licensed under ODbL, so wholesale import is not mixed into Mangrok's proprietary catalog without a separate licensing and attribution decision.

## Agent architecture reference

- **Nous Research Hermes Agent** — architectural inspiration for a provider-independent loop, explicit tool registry, on-demand skills, searchable sessions, pluggable memory providers, and bounded context assembly.

Mangrok is **Hermes-inspired**, not a fork or claim of behavioral parity. Mangrok's implementation adds culinary-specific controls: deterministic simulation grounding, confirmation for memory writes and catalog submissions, sealed-recipe exclusion, moderation gates, and strict user ownership through database row-level security.

## Seed-generation policy

The checked-in browser seed is generated deterministically from:

1. Reviewed culinary terms across more than 45 cuisine/tradition groupings.
2. Filtered USDA Foundation Foods and SR Legacy ingredient-like entries.
3. A maintained alias map for regional names, transliterations, and common English variants.

Prepared commercial dishes, supplements, restaurant items, and obvious recipe-level foods are filtered out. Every future import must retain source, source identifier, source license, catalog version, and moderation status.
