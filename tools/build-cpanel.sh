#!/usr/bin/env bash
# Cria dist/loja-cpanel.zip — pronto a carregar no Gestor de Ficheiros do cPanel e extrair em public_html.
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=store
OUT=dist/loja-cpanel.zip
STAGE=$(mktemp -d)
trap 'rm -rf "$STAGE"' EXIT

for f in index.html avaliar.html avaliar.js styles.css app.js brand.js products.js favicon.svg api.php install.php produto.php produtos.php robots.txt .htaccess; do cp "$SRC/$f" "$STAGE/"; done
mkdir -p "$STAGE/admin" "$STAGE/app" "$STAGE/uploads/brand"
cp "$SRC"/admin/{index.html,admin.css,admin.js} "$STAGE/admin/"
cp "$SRC/app/lib.php" "$SRC/app/page.php" "$SRC/app/.htaccess" "$STAGE/app/"          # config.php e dev-router.php ficam de fora
cp "$SRC/uploads/.htaccess" "$STAGE/uploads/"
mkdir -p "$STAGE/uploads/products"
cp "$SRC/uploads/brand/.keep" "$STAGE/uploads/brand/"
cp "$SRC/uploads/products/.keep" "$STAGE/uploads/products/"
mkdir -p "$STAGE/uploads/testimonials"; cp "$SRC/uploads/testimonials/.keep" "$STAGE/uploads/testimonials/"
cp "$SRC/INSTALAR.txt" "$STAGE/"

# Cache busting: every build gets its own ?v= so browsers always load the new CSS/JS
VER=$(date -u +%Y%m%d%H%M%S)
for f in "$STAGE/index.html" "$STAGE/avaliar.html" "$STAGE/admin/index.html"; do sed -i "s/?v=dev/?v=$VER/g" "$f"; done
grep -q '?v=dev' "$STAGE"/*.html "$STAGE"/admin/*.html && { echo "ERRO: versão não aplicada" >&2; exit 1; }

# Sanity checks: no secrets or local data in the package
for f in app/config.php; do [ ! -e "$STAGE/$f" ] || { echo "ERRO: $f não pode ir no pacote" >&2; exit 1; }; done
for f in "$STAGE"/*.php "$STAGE"/app/*.php; do php -l "$f" >/dev/null; done

mkdir -p dist; rm -f "$OUT"
(cd "$STAGE" && zip -qr -X "$OLDPWD/$OUT" . )
echo "Pacote criado: $OUT ($(du -h "$OUT" | cut -f1))"
unzip -l "$OUT" | tail -n +4 | head -n -2 | awk '{print "  " $4}'
