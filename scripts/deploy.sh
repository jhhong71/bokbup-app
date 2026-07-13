#!/usr/bin/env bash
# Cloudflare Pages 배포 (한글 경로 우회)
# wrangler가 한글 CWD에서 Functions 빌드에 실패하므로 ASCII 임시 경로로 복사 후 배포.
set -e
SRC="$(cd "$(dirname "$0")/.." && pwd)"
TMP="/c/Users/joosu/AppData/Local/Temp/bokbup-deploy"

rm -rf "$TMP" && mkdir -p "$TMP"
cp -r "$SRC/public" "$SRC/functions" "$SRC/wrangler.toml" "$TMP"/
[ -d "$SRC/node_modules" ] && cp -r "$SRC/node_modules" "$TMP"/ || (cd "$TMP" && npm install --no-save --no-audit --no-fund wrangler@4.110.0)

cd "$TMP"
./node_modules/.bin/wrangler pages deploy public --project-name bokbup-app --branch main --commit-dirty=true
