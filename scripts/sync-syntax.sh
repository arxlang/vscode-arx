#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_CANDIDATE="${ARX_SYNTAX_SOURCE:-../arx/syntax/arx.syntax.json}"

if [[ -f "$SOURCE_CANDIDATE" ]]; then
  SOURCE_PATH="$SOURCE_CANDIDATE"
elif [[ -f "$ROOT_DIR/$SOURCE_CANDIDATE" ]]; then
  SOURCE_PATH="$ROOT_DIR/$SOURCE_CANDIDATE"
else
  echo "Could not find source manifest: $SOURCE_CANDIDATE" >&2
  echo "Set ARX_SYNTAX_SOURCE to the path of arx.syntax.json." >&2
  exit 1
fi

cp "$SOURCE_PATH" "$ROOT_DIR/syntax/arx.syntax.json"
node "$ROOT_DIR/scripts/build-grammar.mjs" --write

echo "Synced syntax manifest from $SOURCE_PATH"
