# Arx syntax fixtures

These files are local fixtures for checking the VS Code TextMate grammar in an
Extension Development Host. They are intentionally small, dummy examples that
try to place the current Arx syntax surfaces next to each other so highlighting
regressions are easy to spot.

- `syntax-tour.x` covers compiler-backed language forms copied from the current
  Arx tests and syntax manifest.
- `support/arithmetic.x` and `support/stats.arx` provide import targets and also
  exercise relative imports plus the `.arx` file extension.
- `highlight-only.arx` is a lexical/highlighting scratchpad for manifest tokens
  that may be reserved or not fully compiler-backed yet. Do not treat it as a
  compile/run fixture.

To inspect the fixtures locally:

1. Open this repository in VS Code.
2. Run `npm run build:grammar` if the generated grammar changed.
3. Press `F5` to launch an Extension Development Host.
4. Open the files under this folder in the new window.
