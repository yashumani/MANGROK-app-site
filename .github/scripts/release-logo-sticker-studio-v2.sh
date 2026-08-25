#!/usr/bin/env bash
set -euo pipefail
: "${HEAD_BRANCH:?HEAD_BRANCH is required}"

# Add the existing granular ingredient and bounded-agent implementation to the
# verified Recipe Atelier + Alchemy baseline.
git fetch origin agent/granular-ingredient-v2:refs/remotes/origin/agent/granular-ingredient-v2
source_ref=origin/agent/granular-ingredient-v2
files=(
  src/agent-cloud.js
  src/agent-skills.js
  src/agent-system.js
  src/agent-tools.js
  src/agent-router.js
  src/agent-memory.js
  src/agent-runtime.js
  src/agent-ai.js
  src/agent-memory-ui.js
  src/ingredient-catalog.js
  src/ingredient-submissions.js
  src/kitchen-library.js
  src/alchemy-cuisine-ui.js
  scripts/generate-granular-v2.py
  tests/agent-tools-router.test.mjs
  tests/ingredient-submission.test.mjs
  supabase/migrations/004_global_ingredient_agent_memory.sql
)
for file in "${files[@]}"; do
  if ! git cat-file -e "$source_ref:$file" 2>/dev/null; then
    echo "Required materialized source is missing: $file" >&2
    exit 1
  fi
  mkdir -p "$(dirname "$file")"
  git show "$source_ref:$file" > "$file"
done

# The large static catalog is reproducibly generated from curated granular
# metadata and USDA FoodData Central public-domain reference files.
needs_catalog=1
if [[ -s src/ingredient-catalog-data.js ]]; then
  if node --input-type=module - <<'NODE' >/dev/null 2>&1
import { ingredientCatalogStats } from './src/ingredient-catalog.js';
if (ingredientCatalogStats().published !== 4301) process.exit(1);
NODE
  then
    needs_catalog=0
  fi
fi
if [[ "$needs_catalog" == 1 ]]; then
  rm -rf /tmp/mangrok-usda
  mkdir -p /tmp/mangrok-usda/foundation /tmp/mangrok-usda/sr docs
  curl --fail --location --retry 3 \
    -o /tmp/mangrok-usda/foundation.zip \
    https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_foundation_food_json_2026-04-30.zip
  curl --fail --location --retry 3 \
    -o /tmp/mangrok-usda/sr.zip \
    https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_json_2018-04.zip
  unzip -q /tmp/mangrok-usda/foundation.zip -d /tmp/mangrok-usda/foundation
  unzip -q /tmp/mangrok-usda/sr.zip -d /tmp/mangrok-usda/sr
  python3 scripts/generate-granular-v2.py \
    --root /tmp/mangrok-usda/foundation \
    --root /tmp/mangrok-usda/sr \
    --output src/ingredient-catalog-data.js \
    --stats docs/INGREDIENT-CATALOG-STATS.json
fi
grep -q '"count":4301' src/ingredient-catalog-data.js

required_brand=(
  assets/brand/mangrok-mark.svg
  assets/brand/mangrok-wordmark.svg
  assets/brand/mangrok-seal.svg
  assets/css/brand-reveal.css
  assets/css/sticker-studio.css
  src/brand-reveal.js
  src/sticker-library.js
  src/sticker-studio.js
  src/print-with-stickers.js
  tests/sticker-studio.test.mjs
)
for file in "${required_brand[@]}"; do test -s "$file"; done
cp assets/brand/mangrok-mark.svg assets/mangrok-mark.svg

python3 - <<'PY'
from pathlib import Path
import json
import re


def read(path):
    return Path(path).read_text(encoding="utf-8")


def write(path, value):
    Path(path).write_text(value, encoding="utf-8")


# Wire the identity reveal as an ES module and load all presentation layers.
index = read("index.html")
index = re.sub(
    r'<meta name="theme-color" content="[^"]+">',
    '<meta name="theme-color" content="#2e1627">',
    index,
    count=1,
)
for css in (
    "./assets/css/recipe-atelier.css",
    "./assets/css/brand-reveal.css",
    "./assets/css/sticker-studio.css",
):
    tag = f'<link rel="stylesheet" href="{css}">'
    if tag not in index:
        index = index.replace("</head>", f"  {tag}\n</head>", 1)
brand_script = '<script type="module" src="./src/brand-reveal.js"></script>'
if brand_script not in index:
    index = index.replace("</head>", f"  {brand_script}\n</head>", 1)
write("index.html", index)

# Route book generation through the sticker-aware wrapper and retain up to 48
# bounded layers in the existing print-draft contract.
app = read("src/app.js")
if 'from "./print.js"' in app:
    app = app.replace('from "./print.js"', 'from "./print-with-stickers.js"', 1)
elif "from './print.js'" in app:
    app = app.replace("from './print.js'", "from './print-with-stickers.js'", 1)
elif "print-with-stickers.js" not in app:
    raise SystemExit("Print-module import was not found.")
app = app.replace(".slice(0, 4)", ".slice(0, 48)", 1)
app = app.replace(".slice(0,4)", ".slice(0,48)", 1)
write("src/app.js", app)

# The Sticker Studio lives outside the original form, so its hidden field must
# explicitly belong to book-form. Avoid observing and rewriting the same DOM
# subtree, which would otherwise create a MutationObserver feedback loop.
studio = read("src/sticker-studio.js")
old_hidden = '<input id="print-illustrations" name="print-illustrations" type="hidden" value="[]">'
new_hidden = '<input id="print-illustrations" name="decorations" form="book-form" type="hidden" value="[]">'
if old_hidden in studio:
    studio = studio.replace(old_hidden, new_hidden, 1)
elif new_hidden not in studio:
    raise SystemExit("Sticker form-association marker was not found.")
old_observer = 'function observePrintPreview(view){new MutationObserver(()=>renderIntoBookPreview()).observe(view,{childList:true,subtree:true});}'
new_observer = 'function observePrintPreview(view){const refresh=()=>setTimeout(renderIntoBookPreview,0);view.querySelector("#book-form")?.addEventListener("change",refresh);view.querySelector("#preview-book-button")?.addEventListener("click",refresh);}'
if old_observer in studio:
    studio = studio.replace(old_observer, new_observer, 1)
elif new_observer not in studio:
    raise SystemExit("Sticker-preview observer marker was not found.")
write("src/sticker-studio.js", studio)

runtime = read("runtime-config.js")
runtime = re.sub(
    r'appVersion:\s*"[^"]+"',
    'appVersion: "3.6.0-alpha.7"',
    runtime,
    count=1,
)
runtime = "\n".join(
    line for line in runtime.splitlines() if "print-decor.js" not in line
) + "\n"
for line in (
    'import("./src/atelier-reference-table.js").catch(error => console.warn("Recipe Atelier enhancement", error));',
    'import("./src/alchemy-cuisine-ui.js").catch(error => console.warn("Alchemy cuisine enhancement", error));',
    'import("./src/agent-memory-ui.js").catch(error => console.warn("Agent memory enhancement", error));',
    'import("./src/sticker-studio.js").catch(error => console.warn("Sticker Studio enhancement", error));',
):
    if line not in runtime:
        runtime = runtime.rstrip() + "\n" + line + "\n"
write("runtime-config.js", runtime)

package = json.loads(read("package.json"))
package["version"] = "3.6.0-alpha.7"
package["description"] = (
    "A local-first recipe atelier with restored culinary Alchemy, source-aware "
    "references, global ingredient knowledge, a vector brand reveal, and a "
    "layered cookbook sticker studio."
)
write("package.json", json.dumps(package, indent=2) + "\n")

manifest = json.loads(read("manifest.webmanifest"))
manifest.update(
    {
        "name": "Mangrok Recipe Atelier",
        "short_name": "Mangrok",
        "theme_color": "#2e1627",
        "background_color": "#f6f0e6",
    }
)
write("manifest.webmanifest", json.dumps(manifest, indent=2) + "\n")

shell = read("sw.js")
shell = re.sub(
    r'const CACHE="[^"]+"',
    'const CACHE="mangrok-v11-logo-sticker-studio"',
    shell,
    count=1,
)
assets = [
    "./assets/css/recipe-atelier.css",
    "./src/atelier-reference-recipes.js",
    "./src/atelier-reference-table.js",
    "./src/agent-cloud.js",
    "./src/agent-skills.js",
    "./src/agent-system.js",
    "./src/agent-tools.js",
    "./src/agent-router.js",
    "./src/agent-memory.js",
    "./src/agent-runtime.js",
    "./src/agent-ai.js",
    "./src/agent-memory-ui.js",
    "./src/ingredient-catalog.js",
    "./src/ingredient-catalog-data.js",
    "./src/ingredient-submissions.js",
    "./src/alchemy-cuisine-ui.js",
    "./assets/css/brand-reveal.css",
    "./assets/css/sticker-studio.css",
    "./assets/brand/mangrok-wordmark.svg",
    "./assets/brand/mangrok-seal.svg",
    "./src/brand-reveal.js",
    "./src/sticker-library.js",
    "./src/sticker-studio.js",
    "./src/print-with-stickers.js",
]
marker = "const APP_SHELL=["
if marker not in shell:
    raise SystemExit("Service-worker application-shell marker is missing.")
missing = [asset for asset in assets if json.dumps(asset) not in shell]
if missing:
    shell = shell.replace(
        marker,
        marker + ",".join(json.dumps(asset) for asset in missing) + ",",
        1,
    )
write("sw.js", shell)

# Replace obsolete release assertions with the current release contract.
mobile_test = read("tests/mobile-experience.test.mjs")
mobile_test = mobile_test.replace(
    "mangrok-v7-mobile-app-shell",
    "mangrok-v11-logo-sticker-studio",
)
mobile_test = mobile_test.replace(
    r"3\.3\.0-alpha\.4",
    r"3\.6\.0-alpha\.7",
)
write("tests/mobile-experience.test.mjs", mobile_test)

sticker_test = read("tests/sticker-studio.test.mjs")
if "form-associated printable layer state" not in sticker_test:
    sticker_test += '''\n\ntest("sticker studio supplies form-associated printable layer state", async () => {\n  const source = await readFile(new URL("../src/sticker-studio.js", import.meta.url), "utf8");\n  assert.match(source, /name="decorations"/);\n  assert.match(source, /form="book-form"/);\n  assert.doesNotMatch(source, /new MutationObserver\(\(\)=>renderIntoBookPreview/);\n});\n'''
write("tests/sticker-studio.test.mjs", sticker_test)

# PostgreSQL expression uniqueness belongs in an index, not a table constraint.
migration_path = Path("supabase/migrations/004_global_ingredient_agent_memory.sql")
migration = migration_path.read_text(encoding="utf-8")
invalid = """  language_code text, region text, script text, source_name text, created_at timestamptz not null default now(),
  unique(ingredient_id,alias_key,coalesce(language_code,''))
);
create index if not exists ingredient_alias_key_trgm"""
valid = """  language_code text, region text, script text, source_name text, created_at timestamptz not null default now()
);
create unique index if not exists ingredient_alias_unique_language on public.ingredient_aliases(ingredient_id,alias_key,coalesce(language_code,''));
create index if not exists ingredient_alias_key_trgm"""
if invalid in migration:
    migration = migration.replace(invalid, valid, 1)
migration_path.write_text(migration, encoding="utf-8")

status = {
    "release": "Mangrok brand reveal and sticker studio",
    "applicationVersion": "3.6.0-alpha.7",
    "pwaCache": "mangrok-v11-logo-sticker-studio",
    "ingredientCatalogVersion": "2026.08.13-global-granular-v2",
    "ingredientCatalogEntries": 4301,
    "referenceRecipes": 13,
    "alchemyRestored": True,
    "localLLMAdaptersPreserved": True,
    "deterministicFallbackPreserved": True,
    "logoReveal": True,
    "stickerAssets": 32,
    "editableLabelStickers": True,
    "printStickerLayers": True,
}
write("release-status.json", json.dumps(status, indent=2) + "\n")
PY

required=(
  src/alchemy-ui.js
  src/culinary-engine.js
  src/local-ai.js
  src/ingredient-catalog.js
  src/ingredient-catalog-data.js
  src/ingredient-submissions.js
  src/agent-router.js
  src/agent-runtime.js
  src/atelier-reference-recipes.js
  src/atelier-reference-table.js
  src/brand-reveal.js
  src/sticker-library.js
  src/sticker-studio.js
  src/print-with-stickers.js
  assets/mangrok-mark.svg
  assets/brand/mangrok-wordmark.svg
  assets/brand/mangrok-seal.svg
)
for file in "${required[@]}"; do test -s "$file"; done
grep -q 'Alchemy Lab' src/alchemy-ui.js
grep -q 'import("./src/alchemy-ui.js")' runtime-config.js
grep -q 'mangrok-v11-logo-sticker-studio' sw.js
grep -q 'type="module" src="./src/brand-reveal.js"' index.html
node --input-type=module - <<'NODE'
import { REFERENCE_RECIPES } from './src/atelier-reference-recipes.js';
import { ingredientCatalogStats } from './src/ingredient-catalog.js';
import { STICKER_CATALOG } from './src/sticker-library.js';
if (REFERENCE_RECIPES.length < 12) throw new Error('Reference table incomplete.');
if (ingredientCatalogStats().published !== 4301) throw new Error('Ingredient catalog mismatch.');
if (STICKER_CATALOG.length !== 32) throw new Error('Sticker catalog mismatch.');
NODE
npm run check
git diff --check

git config user.name "Mangrok Release Automation"
git config user.email "51677943+yashumani@users.noreply.github.com"
git add -A
if ! git diff --cached --quiet; then
  git commit -m "Launch Mangrok logo reveal and sticker studio"
  git push origin HEAD:"$HEAD_BRANCH"
fi
