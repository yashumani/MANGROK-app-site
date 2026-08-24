#!/usr/bin/env bash
set -euo pipefail
: "${HEAD_BRANCH:?HEAD_BRANCH is required}"

git fetch origin \
  design/dribbble-atelier-reference-table:refs/remotes/origin/design/dribbble-atelier-reference-table \
  agent/granular-ingredient-v2:refs/remotes/origin/agent/granular-ingredient-v2

# Restore the complete reviewed dependency graph if the earlier recovery did not reach main.
source_ref=origin/agent/granular-ingredient-v2
files=(
  src/agent-cloud.js src/agent-skills.js src/agent-system.js src/agent-tools.js src/agent-router.js
  src/agent-memory.js src/agent-runtime.js src/agent-ai.js src/agent-memory-ui.js src/global-ingredient-ui.js
  src/ingredient-catalog.js src/ingredient-submissions.js src/kitchen-library.js src/alchemy-cuisine-ui.js
  scripts/generate-granular-v2.py tests/global-ingredient-catalog.test.mjs tests/agent-runtime.test.mjs tests/agent-memory.test.mjs
  supabase/migrations/004_global_ingredient_agent_memory.sql
)
for file in "${files[@]}"; do
  git cat-file -e "$source_ref:$file"
  mkdir -p "$(dirname "$file")"
  git show "$source_ref:$file" > "$file"
done

needs_catalog=1
if [[ -s src/ingredient-catalog-data.js ]]; then
  if node --input-type=module - <<'NODE' >/dev/null 2>&1
import { ingredientCatalogStats } from './src/ingredient-catalog.js';
if (ingredientCatalogStats().published !== 4301) process.exit(1);
NODE
  then needs_catalog=0; fi
fi
if [[ "$needs_catalog" == 1 ]]; then
  rm -rf /tmp/mangrok-usda
  mkdir -p /tmp/mangrok-usda/foundation /tmp/mangrok-usda/sr docs
  curl --fail --location --retry 3 -o /tmp/mangrok-usda/foundation.zip https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_foundation_food_json_2026-04-30.zip
  curl --fail --location --retry 3 -o /tmp/mangrok-usda/sr.zip https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_json_2018-04.zip
  unzip -q /tmp/mangrok-usda/foundation.zip -d /tmp/mangrok-usda/foundation
  unzip -q /tmp/mangrok-usda/sr.zip -d /tmp/mangrok-usda/sr
  python3 scripts/generate-granular-v2.py --root /tmp/mangrok-usda/foundation --root /tmp/mangrok-usda/sr --output src/ingredient-catalog-data.js --stats docs/INGREDIENT-CATALOG-STATS.json
fi
grep -q '"count":4301' src/ingredient-catalog-data.js

design_ref=origin/design/dribbble-atelier-reference-table
paths=(
  assets/css/recipe-atelier.css assets/reference-recipes src/atelier-reference-recipes.js src/atelier-reference-table.js
  tests/reference-recipes.test.mjs docs/AUTHENTICITY-REVIEW.md docs/DESIGN-SYSTEM-TOKENS.md docs/DRIBBBLE-ATELIER-DESIGN.md
  docs/DRIBBBLE-RESEARCH-NOTES.md docs/IMAGE-ASSET-POLICY.md docs/REFERENCE-RECIPE-LINEAGE.md docs/REFERENCE-RECIPE-POLICY.md
  docs/REFERENCE-TABLE-ACCEPTANCE.md docs/STARTER-RECIPE-SOURCES.md
)
for path in "${paths[@]}"; do
  git cat-file -e "$design_ref:$path"
  git checkout "$design_ref" -- "$path"
done

# The PR must already contain the original vector and sticker modules reviewed in this release.
required_brand=(
  assets/brand/mangrok-mark.svg assets/brand/mangrok-wordmark.svg assets/brand/mangrok-seal.svg
  assets/css/brand-reveal.css assets/css/sticker-studio.css
  src/brand-reveal.js src/sticker-library.js src/sticker-studio.js src/print-with-stickers.js tests/sticker-studio.test.mjs
)
for file in "${required_brand[@]}"; do test -s "$file"; done
cp assets/brand/mangrok-mark.svg assets/mangrok-mark.svg

python3 - <<'PY'
from pathlib import Path
import json,re

def read(p): return Path(p).read_text(encoding='utf-8')
def write(p,v): Path(p).write_text(v,encoding='utf-8')

index=read('index.html')
for css in ['./assets/css/recipe-atelier.css','./assets/css/brand-reveal.css','./assets/css/sticker-studio.css']:
    tag=f'<link rel="stylesheet" href="{css}">'
    if tag not in index: index=index.replace('</head>',f'  {tag}\n</head>',1)
script='<script src="./src/brand-reveal.js"></script>'
if script not in index:
    first=index.find('<link rel="stylesheet"')
    index=index[:first]+script+'\n  '+index[first:] if first>=0 else index.replace('</head>',f'  {script}\n</head>',1)
write('index.html',index)

app=read('src/app.js')
if 'from "./print.js"' in app: app=app.replace('from "./print.js"','from "./print-with-stickers.js"',1)
elif "from './print.js'" in app: app=app.replace("from './print.js'","from './print-with-stickers.js'",1)
elif 'print-with-stickers.js' not in app: raise SystemExit('Print module import was not found.')
app=app.replace('.slice(0, 4)', '.slice(0, 48)', 1).replace('.slice(0,4)', '.slice(0,48)', 1)
write('src/app.js',app)

runtime=read('runtime-config.js')
runtime=re.sub(r'appVersion:\s*"[^"]+"','appVersion: "3.6.0-alpha.7"',runtime,count=1)
runtime='\n'.join(line for line in runtime.splitlines() if 'print-decor.js' not in line)+'\n'
imports=[
'import("./src/atelier-reference-table.js").catch(error => console.warn("Recipe Atelier enhancement", error));',
'import("./src/alchemy-cuisine-ui.js").catch(error => console.warn("Alchemy cuisine enhancement", error));',
'import("./src/global-ingredient-ui.js").catch(error => console.warn("Global ingredient enhancement", error));',
'import("./src/agent-memory-ui.js").catch(error => console.warn("Agent memory enhancement", error));',
'import("./src/sticker-studio.js").catch(error => console.warn("Sticker Studio enhancement", error));'
]
for line in imports:
    if line not in runtime: runtime=runtime.rstrip()+'\n'+line+'\n'
write('runtime-config.js',runtime)

package=json.loads(read('package.json'))
package['version']='3.6.0-alpha.7'
package['description']='A local-first recipe atelier with restored culinary Alchemy, source-aware references, a vector brand reveal, and a layered cookbook sticker studio.'
write('package.json',json.dumps(package,indent=2)+'\n')

manifest=json.loads(read('manifest.webmanifest'))
manifest.update({'name':'Mangrok Recipe Atelier','short_name':'Mangrok','theme_color':'#2e1627','background_color':'#f6f0e6'})
write('manifest.webmanifest',json.dumps(manifest,indent=2)+'\n')

shell=read('sw.js')
shell=re.sub(r'const CACHE="[^"]+"','const CACHE="mangrok-v11-logo-sticker-studio"',shell,count=1)
assets=[
'./assets/css/recipe-atelier.css','./src/atelier-reference-recipes.js','./src/atelier-reference-table.js',
'./src/agent-cloud.js','./src/agent-skills.js','./src/agent-system.js','./src/agent-tools.js','./src/agent-router.js','./src/agent-memory.js','./src/agent-runtime.js','./src/agent-ai.js','./src/agent-memory-ui.js','./src/global-ingredient-ui.js','./src/ingredient-catalog.js','./src/ingredient-catalog-data.js','./src/ingredient-submissions.js','./src/alchemy-cuisine-ui.js',
'./assets/css/brand-reveal.css','./assets/css/sticker-studio.css','./assets/brand/mangrok-wordmark.svg','./assets/brand/mangrok-seal.svg','./src/brand-reveal.js','./src/sticker-library.js','./src/sticker-studio.js','./src/print-with-stickers.js',
'./assets/reference-recipes/atelier-hero.svg','./assets/reference-recipes/cacio-e-pepe.svg','./assets/reference-recipes/miso-soup.svg','./assets/reference-recipes/bibimbap.svg','./assets/reference-recipes/chana-masala.svg','./assets/reference-recipes/hummus.svg','./assets/reference-recipes/guacamole.svg','./assets/reference-recipes/ratatouille.svg','./assets/reference-recipes/tom-yum-goong.svg','./assets/reference-recipes/misir-wot.svg','./assets/reference-recipes/jollof-rice.svg','./assets/reference-recipes/harira.svg','./assets/reference-recipes/peruvian-ceviche.svg','./assets/reference-recipes/shakshuka.svg']
marker='const APP_SHELL=['
if marker not in shell: raise SystemExit('Service-worker marker is missing.')
missing=[asset for asset in assets if json.dumps(asset) not in shell]
if missing: shell=shell.replace(marker,marker+','.join(json.dumps(asset) for asset in missing)+',',1)
write('sw.js',shell)

status={'release':'Mangrok brand reveal and sticker studio','applicationVersion':'3.6.0-alpha.7','pwaCache':'mangrok-v11-logo-sticker-studio','ingredientCatalogVersion':'2026.08.13-global-granular-v2','referenceRecipes':13,'alchemyRestored':True,'localLLMAdaptersPreserved':True,'logoReveal':True,'stickerAssets':32,'editableLabelStickers':True}
write('release-status.json',json.dumps(status,indent=2)+'\n')
PY

rm -f .github/workflows/pr-logo-sticker-release.yml .github/scripts/release-logo-sticker-studio.sh
rm -f .github/workflows/pr-atelier-alchemy-recovery.yml .github/workflows/pr-atelier-alchemy-recovery-v3.yml .github/scripts/materialize-atelier-alchemy.sh
rm -f .github/workflows/recover-and-deploy-recipe-atelier.yml .github/workflows/kick-recipe-atelier-recovery.yml
rm -f .github/workflows/export-global-ingredient-source.yml .github/workflows/export-usda-ingredient-reference.yml .github/workflows/export-usda-reference-v2.yml .github/workflows/fix-global-agent-release.yml .github/workflows/materialize-global-ingredient-agent.yml .github/workflows/verify-global-agent-release.yml .github/workflows/export-granular-v2-base.yml .github/workflows/materialize-granular-v2.yml .github/workflows/materialize-recipe-atelier.yml .github/workflows/promote-recipe-atelier.yml .github/workflows/repair-recipe-atelier-release.yml
rm -f docs/RECOVERY-REQUEST.md docs/STOPGAP.md docs/LAST-MARKER.md docs/PR.md docs/PR-READY.md docs/READY.md docs/FINAL-PREP.md docs/PULL-REQUEST-NOTE.md docs/RELEASE-MARKER.md docs/RELEASE-NAME.md docs/RELEASE-INTENT.md docs/PR-GATE.md docs/TRANSFER-INSTRUCTIONS.md docs/TRANSFER-PROBE-2.md

required=(src/alchemy-ui.js src/culinary-engine.js src/local-ai.js src/ingredient-catalog.js src/ingredient-catalog-data.js src/agent-router.js src/agent-runtime.js src/atelier-reference-recipes.js src/atelier-reference-table.js src/brand-reveal.js src/sticker-library.js src/sticker-studio.js src/print-with-stickers.js assets/mangrok-mark.svg)
for file in "${required[@]}"; do test -s "$file"; done
grep -q 'Alchemy Lab' src/alchemy-ui.js
grep -q 'import("./src/alchemy-ui.js")' runtime-config.js
grep -q 'mangrok-v11-logo-sticker-studio' sw.js
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

git config user.name 'Mangrok Release Automation'
git config user.email '51677943+yashumani@users.noreply.github.com'
git add -A
if ! git diff --cached --quiet; then
  git commit -m 'Launch Mangrok logo reveal and sticker studio'
  git push origin HEAD:"$HEAD_BRANCH"
fi
