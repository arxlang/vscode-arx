#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Build a VSIX package for the current VS Code extension.

Usage:
  scripts/build.sh [--pre-release] [--out-dir DIR] [--no-dependencies]

Options:
  --pre-release        Build package metadata as pre-release.
  --out-dir DIR        Output directory (default: dist).
  --no-dependencies    Pass --no-dependencies to vsce package.
USAGE
}

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

pre_release=0
out_dir="dist"
no_deps=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --pre-release)
      pre_release=1
      shift
      ;;
    --out-dir)
      out_dir="${2:-}"
      shift 2
      ;;
    --no-dependencies)
      no_deps=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 2
      ;;
  esac
done

if [[ -z "$out_dir" ]]; then
  echo "--out-dir requires a value" >&2
  exit 2
fi

if ! command -v npx >/dev/null 2>&1; then
  echo "npx is required." >&2
  exit 2
fi

mkdir -p "$out_dir"

npm run check:grammar

pkg_name="$(node -p "require('./package.json').name")"
pkg_version="$(node -p "require('./package.json').version")"

suffix=""
if [[ "$pre_release" -eq 1 ]]; then
  suffix="-pre-release"
fi

vsix_path="$out_dir/${pkg_name}-${pkg_version}${suffix}.vsix"

args=(package --out "$vsix_path")
if [[ "$pre_release" -eq 1 ]]; then
  args+=(--pre-release)
fi
if [[ "$no_deps" -eq 1 ]]; then
  args+=(--no-dependencies)
fi

npx --yes @vscode/vsce "${args[@]}"

if [[ ! -f "$vsix_path" ]]; then
  echo "Build finished but no .vsix found at $vsix_path" >&2
  exit 1
fi

echo "$vsix_path"
