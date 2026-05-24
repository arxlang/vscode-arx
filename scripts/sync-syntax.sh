#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ARX_REPO_URL="${ARX_REPO_URL:-https://github.com/arxlang/arx.git}"
ARX_REPO_REF="${ARX_REPO_REF:-main}"
TMP_DIR="$(mktemp -d)"
CLONE_DIR="$TMP_DIR/arx"
SOURCE_PATH="$CLONE_DIR/packages/arx/src/arx/lexer/syntax.json"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

echo "Cloning $ARX_REPO_URL (ref: $ARX_REPO_REF) into a temporary directory..."
if ! git clone --depth 1 --branch "$ARX_REPO_REF" "$ARX_REPO_URL" "$CLONE_DIR"; then
  rm -rf "$CLONE_DIR"
  git clone --filter=blob:none --no-checkout "$ARX_REPO_URL" "$CLONE_DIR"
  git -C "$CLONE_DIR" fetch --depth 1 origin "$ARX_REPO_REF"
  git -C "$CLONE_DIR" checkout --detach FETCH_HEAD
fi

if [[ ! -f "$SOURCE_PATH" ]]; then
  echo "Could not find syntax manifest at packages/arx/src/arx/lexer/syntax.json" >&2
  exit 1
fi

cp "$SOURCE_PATH" "$ROOT_DIR/syntax/arx.syntax.json"
node "$ROOT_DIR/scripts/build-grammar.mjs" --write

echo "Synced syntax manifest from $ARX_REPO_URL@$ARX_REPO_REF"
