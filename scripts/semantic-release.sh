#!/usr/bin/env bash
set -euo pipefail

npx --yes \
  -p semantic-release \
  -p conventional-changelog-conventionalcommits \
  -p "@semantic-release/commit-analyzer" \
  -p "@semantic-release/release-notes-generator" \
  -p "@semantic-release/changelog" \
  -p "@semantic-release/npm" \
  -p "@semantic-release/exec" \
  -p "@semantic-release/github" \
  -p "@semantic-release/git" \
  semantic-release "$@"
