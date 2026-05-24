# vscode-arx

Highlight-only VS Code extension for the **Arx** programming language.

## Features

- TextMate syntax highlighting (`source.arx`) for current Arx syntax:
  - Douki/YAML docstrings delimited by triple backticks
  - `#` line comments
  - single-character literals and double-quoted strings
  - numeric, boolean, and `none` literals
  - functions, extern declarations, classes, type aliases, imports, assertions,
    loops, variables, and constants
  - annotations (`@[...]`) and template parameter blocks (`@<...>`)
  - current symbolic and word operators
- Basic language configuration:
  - line comments (`#`)
  - brackets (`()`, `{}`, `[]`)
  - auto-closing and surrounding pairs

This extension intentionally has no language server, commands, or runtime extension code.

## Source of Truth

Lexical rules are vendored from the main Arx repository:

- `packages/arx/src/arx/lexer/syntax.json`

The vendored copy in this repository is:

- `syntax/arx.syntax.json`

The vendored manifest is used to generate:

- `syntaxes/arx.tmLanguage.json`

## Local Development

1. Open this repo in VS Code.
2. Regenerate the TextMate grammar:

```bash
npm run build:grammar
```

3. Press `F5` to launch an Extension Development Host.
4. Open an `.x` or `.arx` file in the new window.

## Keep It In Sync

From this repo:

```bash
npm run sync:syntax
npm run check:grammar
```

By default, `sync:syntax` clones:

- `https://github.com/arxlang/arx.git`
- branch/ref `main`

You can override source repo/ref:

```bash
ARX_REPO_URL=https://github.com/arxlang/arx.git \
ARX_REPO_REF=main \
npm run sync:syntax
```

To sync from a local Arx checkout instead, copy the manifest and rebuild:

```bash
cp ../arx/packages/arx/src/arx/lexer/syntax.json syntax/arx.syntax.json
npm run build:grammar
npm run check:grammar
```

## Updating Syntax Highlighting

1. Update the canonical syntax manifest in the main Arx repo first.
2. Sync or copy it into `syntax/arx.syntax.json` here.
3. Update `scripts/build-grammar.mjs` when the manifest shape or language forms
   change.
4. Run `npm run build:grammar`.
5. Commit both generated artifacts:
   - `syntax/arx.syntax.json`
   - `syntaxes/arx.tmLanguage.json`

Avoid hand-editing `syntaxes/arx.tmLanguage.json`; it should be generated from
`syntax/arx.syntax.json`.

## Build and Publish

Build a VSIX:

```bash
npm run build:vsix
```

Publish both Marketplace and Open VSX:

```bash
export VSCE_PAT="***"
export OVSX_PAT="***"
npm run publish:all
```

Marketplace only (bump patch):

```bash
export VSCE_PAT="***"
bash ./scripts/publish.sh --marketplace --bump patch --no-dependencies
```

## CI (GitHub Actions)

This repo includes `.github/workflows/main.yaml` with:

1. PR branch freshness check.
2. Script syntax validation.
3. Grammar generation sync validation.
4. Optional VSIX packaging and artifact upload when package metadata is ready.

## Pre-commit Hooks

This repo uses `.pre-commit-config.yaml` for local checks before commit.

Install once:

```bash
python3 -m pip install pre-commit
pre-commit install
```

Run manually on all files:

```bash
pre-commit run --all-files
```

Included hooks:

1. JSON/YAML/basic whitespace checks.
2. `npm run check:grammar` when syntax/grammar generator files change.
3. `bash -n` syntax checks for shell scripts.

## File Associations

This extension registers both `.x` and `.arx` as Arx files.

## Contributing

1. Keep `syntax/arx.syntax.json` synchronized with the main Arx syntax manifest.
2. Regenerate grammar (`npm run build:grammar`).
3. Run checks (`npm run check:grammar` and pre-commit where practical).
4. Open a PR with generated files included.
