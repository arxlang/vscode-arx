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
  return text.replace(/[[\]\\^-]/g, "\\$&");
}

function unique(values) {
  return [...new Set(values)];
}

function sortLongestFirst(values) {
  return [...values].sort(
    (left, right) => right.length - left.length || left.localeCompare(right)
  );
}

function wordRegex(words) {
  const uniqueWords = sortLongestFirst(unique(words)).filter(Boolean);
  if (!uniqueWords.length) {
    return "(?!)";
  }

  const escaped = uniqueWords.map((item) => escapeRegex(item));
  return `\\b(?:${escaped.join("|")})\\b`;
}

function alternationRegex(words) {
  const uniqueWords = sortLongestFirst(unique(words)).filter(Boolean);
  if (!uniqueWords.length) {
    return "(?!)";
  }

  const escaped = uniqueWords.map((item) => escapeRegex(item));
  return `(?:${escaped.join("|")})`;
}

function charClassRegex(chars) {
  const singleChars = unique(chars).filter((item) => item.length === 1);
  if (!singleChars.length) {
    return "(?!)";
  }

  return `[${singleChars.map((item) => escapeCharClass(item)).join("")}]`;
}

function valueAt(object, pathParts) {
  return pathParts.reduce((value, part) => value?.[part], object);
}

function manifestError(message) {
  throw new Error(`Invalid latest Arx syntax manifest: ${message}`);
}

function requireArray(spec, path) {
  const value = valueAt(spec, path.split("."));
  if (!Array.isArray(value)) {
    manifestError(`${path} must be an array`);
  }
}

function requireBoolean(spec, path) {
  const value = valueAt(spec, path.split("."));
  if (typeof value !== "boolean") {
    manifestError(`${path} must be a boolean`);
  }
}

function requireObject(spec, path) {
  const value = valueAt(spec, path.split("."));
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    manifestError(`${path} must be an object`);
  }
}

function requireString(spec, path) {
  const value = valueAt(spec, path.split("."));
  if (typeof value !== "string" || value.length === 0) {
    manifestError(`${path} must be a non-empty string`);
  }
}

function validateManifest(spec) {
  requireObject({ spec }, "spec");

  if ("comment" in spec) {
    manifestError("use comments, not legacy comment");
  }

  if (Array.isArray(spec.literals)) {
    manifestError("literals must use the latest object shape");
  }

  [
    "syntax_pack_version",
    "language",
    "source_of_truth",
    "docstrings.delimiter",
    "docstrings.token_kind",
    "identifiers.pattern"
  ].forEach((path) => requireString(spec, path));

  [
    "file_extensions",
    "keywords.reserved",
    "keywords.contextual",
    "literals.keywords",
    "comments.line.delimiters",
    "strings.quote_types",
    "strings.escapes",
    "numbers.formats",
    "operators.single_char",
    "operators.multi_char",
    "operators.word_operators",
    "operators.assignment",
    "operators.comparison",
    "operators.arithmetic",
    "operators.logical",
    "operators.type_union",
    "operators.punctuation",
    "structural_forms.annotations.modifiers",
    "builtins.types",
    "builtins.functions",
    "brackets"
  ].forEach((path) => requireArray(spec, path));

  [
    "comments.line.enabled",
    "strings.supported",
    "docstrings.supported",
    "whitespace.indentation_significant"
  ].forEach((path) => requireBoolean(spec, path));

  [
    "literals.booleans",
    "literals.none",
    "comments.block",
    "strings.interpolation",
    "numbers.underscores",
    "numbers.exponent",
    "whitespace",
    "structural_forms",
    "structural_forms.annotations",
    "builtins"
  ].forEach((path) => requireObject(spec, path));

  if (spec.language !== "arx") {
    manifestError("language must be arx");
  }
}

function literalWords(spec) {
  return spec.literals.keywords;
}

function builtinTypes(spec) {
  return spec.builtins.types;
}

function builtinFunctions(spec) {
  return spec.builtins.functions;
}

function declarationModifiers(spec) {
  return spec.structural_forms.annotations.modifiers;
}

function lineCommentDelimiters(spec) {
  const line = spec.comments.line;
  if (line.enabled === false) {
    return [];
  }

  return line.delimiters;
}

function stringPatterns(spec) {
  const strings = spec.strings;
  if (strings.supported === false) {
    return [];
  }

  const quoteTypes = strings.quote_types;
  const patterns = [];

  if (quoteTypes.includes("double")) {
    patterns.push(
      {
        name: "string.quoted.double.arx",
        match: '"(?:\\\\.|[^"\\\\\\n])*"'
      },
      {
        name: "invalid.illegal.unterminated-string.arx",
        match: '"(?:\\\\.|[^"\\\\\\n])*$'
      }
    );
  }

  if (quoteTypes.includes("single")) {
    patterns.push(
      {
        name: "invalid.illegal.empty-character.arx",
        match: "''"
      },
      {
        name: "constant.character.quoted.single.arx",
        match: "'(?:\\\\.|[^'\\\\\\n])'"
      },
      {
        name: "invalid.illegal.character-too-long.arx",
        match: "'(?:\\\\.|[^'\\\\\\n]){2,}'"
      },
      {
        name: "invalid.illegal.unterminated-character.arx",
        match: "'(?:\\\\.|[^'\\\\\\n])*$"
      }
    );
  }

  return patterns;
}

function docstringPatterns(spec) {
  const docstrings = spec.docstrings;
  if (!docstrings.supported) {
    return [];
  }

  const delimiter = escapeRegex(docstrings.delimiter);
  return [
    {
      name: "comment.block.documentation.arx",
      contentName: "comment.block.documentation.content.arx",
      begin: delimiter,
      beginCaptures: {
        0: { name: "punctuation.definition.comment.begin.arx" }
      },
      end: delimiter,
      endCaptures: {
        0: { name: "punctuation.definition.comment.end.arx" }
      }
    }
  ];
}

function commentPatterns(spec) {
  return lineCommentDelimiters(spec).map((delimiter) => ({
    name: "comment.line.number-sign.arx",
    match: `${escapeRegex(delimiter)}.*$`
  }));
}

function operatorPatterns(spec) {
  const operators = spec.operators;
  const multiCharOperators = operators.multi_char;
  const wordOperators = operators.word_operators;
  const symbolicOperators = unique([
    ...operators.assignment,
    ...operators.comparison,
    ...operators.arithmetic,
    ...operators.logical,
    ...operators.type_union
  ]).filter((item) => item.length === 1);

  return [
    {
      name: "keyword.operator.arx",
      match: alternationRegex(multiCharOperators)
    },
    {
      name: "keyword.operator.word.arx",
      match: wordRegex(wordOperators)
    },
    {
      name: "keyword.operator.arx",
      match: charClassRegex(symbolicOperators)
    }
  ];
}

function punctuationPatterns(spec) {
  const punctuation = spec.operators.punctuation;

  return [
    {
      name: "punctuation.separator.arx",
      match: charClassRegex(punctuation.filter((item) => item !== "@"))
    },
    {
      name: "punctuation.definition.annotation.begin.arx",
      match: "@(?=\\[|<)"
    },
    {
      name: "punctuation.section.brackets.begin.arx",
      match: "[\\(\\{\\[]"
    },
    {
      name: "punctuation.section.brackets.end.arx",
      match: "[\\)\\}\\]]"
    }
  ];
}

function buildGrammar(spec) {
  validateManifest(spec);

  const reservedKeywords = [...spec.keywords.reserved];
  const contextualKeywords = [...spec.keywords.contextual];
  const literals = literalWords(spec);
  const wordOperators = spec.operators.word_operators;
  const builtinTypeWords = builtinTypes(spec);
  const builtinFunctionWords = builtinFunctions(spec);
  const declarationModifierWords = declarationModifiers(spec);
  const identifierPattern = spec.identifiers.pattern;
  const functionCallLookahead = "(?=\\s*(?:<[^>\\n]+>\\s*)?\\()";
  const nonFunctionWords = [
    ...reservedKeywords,
    ...contextualKeywords,
    ...literals,
    ...wordOperators,
    ...builtinTypeWords
  ];

  const grammar = {
    $schema:
      "https://raw.githubusercontent.com/martinring/tmlanguage/master/tmlanguage.json",
    name: "Arx",
    scopeName: "source.arx",
    patterns: [
      { include: "#docstrings" },
      { include: "#comments" },
      { include: "#strings" },
      { include: "#annotations" },
      { include: "#declarations" },
      { include: "#functions" },
      { include: "#keywords" },
      { include: "#constants" },
      { include: "#types" },
      { include: "#numbers" },
      { include: "#operators" },
      { include: "#punctuation" }
    ],
    repository: {
      docstrings: {
        patterns: docstringPatterns(spec)
      },
      comments: {
        patterns: commentPatterns(spec)
      },
      strings: {
        patterns: stringPatterns(spec)
      },
      annotations: {
        patterns: [
          {
            name: "meta.annotation.modifiers.arx",
            begin: "@\\[",
            beginCaptures: {
              0: { name: "punctuation.definition.annotation.begin.arx" }
            },
            end: "\\]",
            endCaptures: {
              0: { name: "punctuation.definition.annotation.end.arx" }
            },
            patterns: [
              { include: "#modifiers" },
              { include: "#punctuation" }
            ]
          },
          {
            name: "meta.template.parameters.arx",
            begin: "@<",
            beginCaptures: {
              0: { name: "punctuation.definition.template.begin.arx" }
            },
            end: ">",
            endCaptures: {
              0: { name: "punctuation.definition.template.end.arx" }
            },
            patterns: [
              { include: "#keywords" },
              { include: "#types" },
              { include: "#constants" },
              { include: "#operators" },
              { include: "#punctuation" }
            ]
          }
        ]
      },
      modifiers: {
        patterns: [
          {
            name: "storage.modifier.arx",
            match: wordRegex(declarationModifierWords)
          }
        ]
      },
      declarations: {
        patterns: [
          {
            name: "meta.function.definition.arx",
            match: `\\b(fn)\\s+(${identifierPattern})\\b`,
            captures: {
              1: { name: "keyword.control.arx" },
              2: { name: "entity.name.function.arx" }
            }
          },
          {
            name: "meta.extern.definition.arx",
            match: `\\b(extern)\\s+(${identifierPattern})\\b`,
            captures: {
              1: { name: "keyword.control.arx" },
              2: { name: "entity.name.function.arx" }
            }
          },
          {
            name: "meta.class.definition.arx",
            match: `\\b(class)\\s+(${identifierPattern})\\b`,
            captures: {
              1: { name: "keyword.control.arx" },
              2: { name: "entity.name.type.class.arx" }
            }
          },
          {
            name: "meta.type.alias.arx",
            match: `\\b(type)\\s+(${identifierPattern})\\b`,
            captures: {
              1: { name: "keyword.declaration.type.arx" },
              2: { name: "entity.name.type.alias.arx" }
            }
          },
          {
            name: "meta.variable.declaration.arx",
            match: `\\b(const|var)\\s+(${identifierPattern})\\b`,
            captures: {
              1: { name: "keyword.control.arx" },
              2: { name: "variable.other.definition.arx" }
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
            match: wordRegex(literals)
          }
        ]
      },
      types: {
        patterns: [
          {
            name: "support.type.builtin.arx",
            match: wordRegex(builtinTypeWords)
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
        patterns: operatorPatterns(spec)
      },
      functions: {
        patterns: [
          {
            name: "support.function.builtin.arx",
            match:
              `\\b(?:${alternationRegex(builtinFunctionWords)})\\b` +
              functionCallLookahead
          },
          {
            name: "support.function.arx",
            match:
              `\\b(?!${wordRegex(nonFunctionWords)})` +
              `(?:${identifierPattern})${functionCallLookahead}`
          }
        ]
      },
      punctuation: {
        patterns: punctuationPatterns(spec)
      }
    }
  };

  return `${JSON.stringify(grammar, null, 2)}\n`;
}

function main() {
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
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
}
