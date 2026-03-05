#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Publish the extension to VS Code Marketplace and/or Open VSX.

Environment variables:
  VSCE_PAT   Personal Access Token for VS Code Marketplace
  OVSX_PAT   Access token for Open VSX
  PUBLISHER  Publisher namespace (used by --ensure-openvsx-namespace)

Usage:
  scripts/publish.sh [--marketplace] [--openvsx] [--all]
                     [--vsix PATH] [--pre-release]
                     [--bump {major|minor|patch|X.Y.Z}]
                     [--ensure-openvsx-namespace]
                     [--no-dependencies]

Options:
  --marketplace              Publish to VS Code Marketplace only.
  --openvsx                  Publish to Open VSX only.
  --all                      Publish to both (default if none chosen).
  --vsix PATH                Publish an existing VSIX (skips build).
  --pre-release              Build as pre-release (ignored with --vsix).
  --bump ...                 Use vsce version bump for Marketplace publish.
                             Incompatible with --openvsx and --vsix.
  --ensure-openvsx-namespace Try to create Open VSX namespace if missing.
  --no-dependencies          Pass --no-dependencies to package/build steps.
USAGE
}

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v npx >/dev/null 2>&1; then
  echo "npx is required." >&2
  exit 2
fi

assert_publish_metadata() {
  local publisher
  local repo_url

  publisher="$(node -p "require('./package.json').publisher || ''")"
  repo_url="$(node -p "(require('./package.json').repository || {}).url || ''")"

  if [[ -z "$publisher" || "$publisher" == TODO_* ]]; then
    echo "package.json publisher is not set. Update package.json before publishing." >&2
    exit 2
  fi

  if [[ "$repo_url" == *"TODO_"* ]]; then
    echo "package.json repository.url still contains TODO placeholder." >&2
    exit 2
  fi
}

do_marketplace=0
do_openvsx=0
do_all=0
vsix_path=""
pre_release=0
bump=""
ensure_namespace=0
no_deps=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --marketplace)
      do_marketplace=1
      shift
      ;;
    --openvsx)
      do_openvsx=1
      shift
      ;;
    --all)
      do_all=1
      shift
      ;;
    --vsix)
      vsix_path="${2:-}"
      shift 2
      ;;
    --pre-release)
      pre_release=1
      shift
      ;;
    --bump)
      bump="${2:-}"
      shift 2
      ;;
    --ensure-openvsx-namespace)
      ensure_namespace=1
      shift
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

if [[ "$do_all" -eq 1 ]] || [[ "$do_marketplace" -eq 0 && "$do_openvsx" -eq 0 ]]; then
  do_marketplace=1
  do_openvsx=1
fi

if [[ -n "$bump" && "$do_openvsx" -eq 1 ]]; then
  echo "--bump cannot be used when publishing to Open VSX in the same run." >&2
  echo "Use two runs: Marketplace with --bump, then Open VSX using --vsix." >&2
  exit 2
fi

if [[ -n "$bump" && -n "$vsix_path" ]]; then
  echo "--bump cannot be combined with --vsix." >&2
  exit 2
fi

if [[ -n "$vsix_path" && ! -f "$vsix_path" ]]; then
  echo "VSIX not found: $vsix_path" >&2
  exit 2
fi

if [[ "$do_marketplace" -eq 1 && -z "${VSCE_PAT:-}" ]]; then
  echo "VSCE_PAT is required for Marketplace publishing." >&2
  exit 2
fi

if [[ "$do_openvsx" -eq 1 && -z "${OVSX_PAT:-}" ]]; then
  echo "OVSX_PAT is required for Open VSX publishing." >&2
  exit 2
fi

assert_publish_metadata
npm run check:grammar

build_vsix() {
  local args=()
  if [[ "$pre_release" -eq 1 ]]; then
    args+=(--pre-release)
  fi
  if [[ "$no_deps" -eq 1 ]]; then
    args+=(--no-dependencies)
  fi
  scripts/build.sh "${args[@]}"
}

if [[ -z "$vsix_path" && ( "$do_openvsx" -eq 1 || ( "$do_marketplace" -eq 1 && -z "$bump" ) ) ]]; then
  vsix_path="$(build_vsix)"
fi

if [[ "$do_marketplace" -eq 1 ]]; then
  if [[ -n "$bump" ]]; then
    pub_args=()
    if [[ "$pre_release" -eq 1 ]]; then
      pub_args+=(--pre-release)
    fi
    if [[ "$no_deps" -eq 1 ]]; then
      pub_args+=(--no-dependencies)
    fi

    npx --yes @vscode/vsce publish "$bump" -p "$VSCE_PAT" "${pub_args[@]}"
  else
    npx --yes @vscode/vsce publish --packagePath "$vsix_path" -p "$VSCE_PAT"
  fi
fi

if [[ "$do_openvsx" -eq 1 ]]; then
  if [[ "$ensure_namespace" -eq 1 ]]; then
    if [[ -z "${PUBLISHER:-}" ]]; then
      echo "PUBLISHER is required to create an Open VSX namespace." >&2
      exit 2
    fi
    set +e
    npx --yes ovsx create-namespace "$PUBLISHER" --pat "$OVSX_PAT"
    set -e
  fi

  npx --yes ovsx publish "$vsix_path" --pat "$OVSX_PAT"
fi

echo "Done."
