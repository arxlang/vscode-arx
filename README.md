# vscode-arx

Highlight-only VS Code extension for the **Arx** programming language.

## Features

- TextMate syntax highlighting (`source.arx`)
- Basic language configuration:
  - line comments (`#`)
  - brackets (`()`, `{}`, `[]`)
  - auto-closing and surrounding pairs

This extension intentionally has no language server, commands, or runtime extension code.

## Source of Truth

Lexical rules are sourced from:

- `syntax/arx.syntax.json`

This file is vendored from the main Arx repository and used to generate:

- `syntaxes/arx.tmLanguage.json`

## Local Development

1. Open this repo in VS Code.
2. Run:

```bash
npm run build:grammar
```

3. Press `F5` to launch an Extension Development Host.
4. Open an `.arx` file in the new window.

## Keep It In Sync

From this repo:

```bash
npm run sync:syntax
npm run check:grammar
```

By default, `sync:syntax` copies from `../arx/syntax/arx.syntax.json`.
You can override the source path:

```bash
ARX_SYNTAX_SOURCE=/absolute/path/to/arx.syntax.json npm run sync:syntax
```

## Updating Keywords / Operators

1. Update the canonical manifest in the main Arx repo.
2. Run `npm run sync:syntax` in this repo.
3. Commit both:
   - `syntax/arx.syntax.json`
   - `syntaxes/arx.tmLanguage.json`

## Notes and TODO Defaults

The upstream manifest currently marks some lexical areas as unspecified.
This extension uses conservative TODO defaults for highlighting only:

- TODO(ARX-VSCODE-STRINGS-001): provisional single/double-quoted string scopes.
- TODO(ARX-VSCODE-LITERALS-001): provisional `true|false|null` literal scopes.
- TODO(ARX-VSCODE-OPS-001): provisional multi-char operators (`==`, `!=`, `<=`, `>=`, `->`).

When upstream syntax rules are finalized, these defaults should be replaced by manifest-driven values.

## File Associations

This extension registers `.arx` by default.

TODO: `.x` is intentionally not auto-registered yet to avoid extension collisions.
If you want local `.x` association now, add this in your user/workspace settings:

```json
{
  "files.associations": {
    "*.x": "arx"
  }
}
```

## Contributing

1. Keep `syntax/arx.syntax.json` as the single lexical source.
2. Regenerate grammar (`npm run build:grammar`).
3. Run check (`npm run check:grammar`).
4. Open PR with generated files included.
