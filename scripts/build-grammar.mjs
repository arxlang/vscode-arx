#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const manifestPath = path.join(root, "syntax", "arx.syntax.json");
const grammarPath = path.join(root, "syntaxes", "arx.tmLanguage.json");

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeCharClass(text) {
  // Escape only characters that are special inside [...].
  return text.replace(/[[\]\\^-]/g, "\\$&");
}

function unique(values) {
  return [...new Set(values)];
}

function wordRegex(words) {
  if (!words.length) {
    return "(?!)";
  }

  const escaped = words.map((item) => escapeRegex(item));
  return `\\b(?:${escaped.join("|")})\\b`;
}

function alternationRegex(words) {
  if (!words.length) {
    return "(?!)";
  }

  const escaped = words.map((item) => escapeRegex(item));
  return `(?:${escaped.join("|")})`;
}

function buildGrammar(spec) {
  const reservedKeywords = [...(spec.keywords?.reserved ?? [])].sort();
  const contextualKeywords = [...(spec.keywords?.contextual ?? [])].sort();
  const identifierPattern = spec.identifiers?.pattern ?? "[A-Za-z_][A-Za-z0-9_]*";
  const reservedKeywordAlternation = alternationRegex(reservedKeywords);

  // TODO(ARX-VSCODE-LITERALS-001): upstream manifest currently has [] literals.
  // Keep a conservative fallback for editor highlighting only.
  const literalDefaults = ["true", "false", "null"];
  const literalWords =
    spec.literals && spec.literals.length > 0 ? spec.literals : literalDefaults;

  const opSingles = unique([
    ...(spec.operators?.assignment ?? []),
    ...(spec.operators?.comparison ?? []),
    ...(spec.operators?.arithmetic ?? [])
  ]).filter((item) => item.length === 1);

  const punctuationSingles = unique(spec.operators?.punctuation ?? []).filter(
    (item) => item.length === 1
  );

  const singleOpCharClass = opSingles.length
    ? `[${opSingles.map((item) => escapeCharClass(item)).join("")}]`
    : "(?!)";

  const punctuationCharClass = punctuationSingles.length
    ? `[${punctuationSingles.map((item) => escapeCharClass(item)).join("")}]`
    : "(?!)";

  // TODO(ARX-VSCODE-OPS-001): confirm multi-char operators in upstream spec.
  const provisionalMultiOps = ["==", "!=", "<=", ">=", "->"];
  const provisionalMultiOpRegex = provisionalMultiOps
    .map((item) => escapeRegex(item))
    .join("|");

  // TODO(ARX-VSCODE-STRINGS-001): upstream spec says strings.supported=false.
  // Keep conservative single/double quote patterns as provisional defaults.
  const grammar = {
    $schema:
      "https://raw.githubusercontent.com/martinring/tmlanguage/master/tmlanguage.json",
    name: "Arx",
    scopeName: "source.arx",
    patterns: [
      { include: "#comments" },
      { include: "#strings" },
      { include: "#declarations" },
      { include: "#keywords" },
      { include: "#constants" },
      { include: "#numbers" },
      { include: "#operators" },
      { include: "#functions" },
      { include: "#punctuation" }
    ],
    repository: {
      comments: {
        patterns: [
          {
            name: "comment.line.number-sign.arx",
            match: "#.*$"
          }
        ]
      },
      strings: {
        patterns: [
          {
            name: "string.quoted.double.arx",
            match: '"(?:\\\\.|[^"\\\\\\n])*"'
          },
          {
            name: "string.quoted.single.arx",
            match: "'(?:\\\\.|[^'\\\\\\n])*'"
          },
          {
            name: "invalid.illegal.unterminated-string.arx",
            match: '"(?:\\\\.|[^"\\\\\\n])*$'
          },
          {
            name: "invalid.illegal.unterminated-string.arx",
            match: "'(?:\\\\.|[^'\\\\\\n])*$"
          }
        ]
      },
      declarations: {
        patterns: [
          {
            name: "meta.function.definition.arx",
            match: `\\b(fn)\\s+(${identifierPattern})\\b`,
            captures: {
              "1": { name: "keyword.control.arx" },
              "2": { name: "entity.name.function.arx" }
            }
          },
          {
            name: "meta.variable.declaration.arx",
            match: `\\b(?:const|var)\\s+(${identifierPattern})\\b`,
            captures: {
              "1": { name: "variable.other.definition.arx" }
            }
          }
        ]
      },
      keywords: {
        patterns: [
          {
            name: "keyword.control.arx",
            match: wordRegex(reservedKeywords)
          },
          {
            name: "keyword.other.contextual.arx",
            match: wordRegex(contextualKeywords)
          }
        ]
      },
      constants: {
        patterns: [
          {
            name: "constant.language.arx",
            match: wordRegex(literalWords)
          }
        ]
      },
      numbers: {
        patterns: [
          {
            name: "constant.numeric.float.decimal.arx",
            match: "\\b\\d+\\.\\d+\\b"
          },
          {
            name: "constant.numeric.float.decimal.arx",
            match: "(?<![\\w.])\\.\\d+\\b"
          },
          {
            name: "constant.numeric.float.decimal.arx",
            match: "\\b\\d+\\.(?!\\.)"
          },
          {
            name: "constant.numeric.integer.decimal.arx",
            match: "\\b\\d+\\b"
          }
        ]
      },
      operators: {
        patterns: [
          {
            name: "keyword.operator.arx",
            match: `(?:${provisionalMultiOpRegex})`
          },
          {
            name: "keyword.operator.arx",
            match: singleOpCharClass
          }
        ]
      },
      functions: {
        patterns: [
          {
            name: "support.function.arx",
            match: `\\b(?!${reservedKeywordAlternation}\\b)(${identifierPattern})(?=\\s*\\()`
          }
        ]
      },
      punctuation: {
        patterns: [
          {
            name: "punctuation.separator.arx",
            match: punctuationCharClass
          },
          {
            name: "punctuation.section.brackets.begin.arx",
            match: "[({[]"
          },
          {
            name: "punctuation.section.brackets.end.arx",
            match: "[)}\\]]"
          }
        ]
      }
    }
  };

  return `${JSON.stringify(grammar, null, 2)}\n`;
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const output = buildGrammar(manifest);
const mode = process.argv.includes("--check") ? "check" : "write";

if (mode === "check") {
  const current = fs.existsSync(grammarPath)
    ? fs.readFileSync(grammarPath, "utf8")
    : "";

  if (current !== output) {
    process.stderr.write(
      "syntaxes/arx.tmLanguage.json is out of date. Run npm run build:grammar.\n"
    );
    process.exit(1);
  }

  process.stdout.write("Grammar is in sync with syntax/arx.syntax.json.\n");
  process.exit(0);
}

fs.writeFileSync(grammarPath, output, "utf8");
process.stdout.write(`Wrote ${path.relative(root, grammarPath)}\n`);
