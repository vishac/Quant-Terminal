#!/usr/bin/env bash
# Adds qt-core/ to the Quant-Terminal repo. Run from the repo root.
# Default is DRY RUN (changes nothing). Add --apply to write.
# Usage: bash add-qt-core.sh /path/to/qt-core-stage3.zip [--apply]
set -euo pipefail
ZIP="${1:-}"; APPLY="${2:-}"
[ -f "$ZIP" ] || { echo "Usage: bash add-qt-core.sh <qt-core-stage3.zip> [--apply]"; exit 1; }
[ -f package.json ] && [ -f server.ts ] || { echo "Run from the Quant-Terminal repo root."; exit 1; }
[ -e qt-core ] && { echo "qt-core/ already exists. Refusing to overwrite. Remove or rename it first."; exit 1; }
command -v unzip >/dev/null && command -v node >/dev/null || { echo "Need unzip and node."; exit 1; }

echo "Plan:"
echo " 1. Extract qt-core/ from the zip, EXCLUDING .git/ and node_modules/ (a nested .git would break your repo)"
echo " 2. Append to .gitignore: qt-core/data/, qt-core/universe.json, qt-core/node_modules/"
echo " 3. Add npm scripts to package.json: qt:install, qt:test, qt:typecheck, qt:scan, qt:cli"
echo " Not touched: server.ts, src/, firestore.rules, any existing script."
[ "$APPLY" = "--apply" ] || { echo; echo "DRY RUN only. Re-run with --apply to write."; exit 0; }

unzip -q "$ZIP" -x 'qt-core/.git/*'
for l in 'qt-core/data/' 'qt-core/universe.json' 'qt-core/node_modules/'; do
  grep -qxF "$l" .gitignore 2>/dev/null || printf '%s\n' "$l" >> .gitignore
done
node -e '
const fs=require("fs");const p=JSON.parse(fs.readFileSync("package.json","utf8"));
p.scripts=p.scripts||{};
const add={"qt:install":"npm --prefix qt-core install","qt:test":"npm --prefix qt-core test","qt:typecheck":"npm --prefix qt-core run typecheck","qt:scan":"npm --prefix qt-core run cli -- scan","qt:cli":"npm --prefix qt-core run cli --"};
for(const[k,v]of Object.entries(add)){if(p.scripts[k]&&p.scripts[k]!==v){console.error("script exists, skipped:",k);continue}p.scripts[k]=v}
fs.writeFileSync("package.json",JSON.stringify(p,null,2)+"\n");'
echo "Done. Next: npm run qt:install && npm run qt:test (expect 27 passing), then review with git diff."
echo "Real data: copy qt-core/universe.example.json to qt-core/universe.json, fill real Upstox instrument keys,"
echo "export UPSTOX_ANALYTICS_TOKEN in your shell (never commit it), then: npm run qt:cli -- fetch"
