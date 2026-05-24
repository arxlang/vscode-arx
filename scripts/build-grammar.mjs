#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const manifestPath = path.join(root, "syntax", "arx.syntax.json");
const grammarPath = path.join(root, "syntaxes", "arx.tmLanguage.json");

const builtinTypes = [
  "bool",
  "boolean",
  "char",
  "dataframe",
  "date",
  "datetime",
  "f16",
  "f32",
  "f64",
  "float16",
  "float32",
  "float64",
  "i8",
  "i16",
  "i32",
  "i64",
  "int8",
  "int16",
  "int32",
  "int64",
  "list",
  "series",
  "str",
  "string",
  "tensor",
  "time",
  "timestamp"
];

const builtinFunctions = ["cast", "dataframe", "isinstance", "print", "range"];
const declarationModifiers = [
  "abstract",
  "constant",
  "extern",
  "mutable",
  "private",
  "protected",
  "public",
  "static"
];

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

function literalWords(spec) {
  return spec.literals?.keywords ?? [];
}

function lineCommentDelimiters(spec) {
  const line = spec.comments?.line ?? {};
  if (line.enabled === false) {
    return [];
  }

  return line.delimiters ?? ["#"];
}

function stringPatterns(spec) {
  const strings = spec.strings ?? {};
  if (strings.supported === false) {
    return [];
  }

  const quoteTypes = strings.quote_types ?? ["single", "double"];
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
  const docstrings = spec.docstrings ?? {};
  if (!docstrings.supported) {
    return [];
  }

  const delimiter = escapeRegex(docstrings.delimiter ?? "```");
  return [
    {
      name: "string.quoted.docstring.arx",
      contentName: "meta.embedded.block.yaml.arx",
      begin: delimiter,
      beginCaptures: {
        0: { name: "punctuation.definition.string.begin.arx" }
      },
      end: delimiter,
      endCaptures: {
        0: { name: "punctuation.definition.string.end.arx" }
      },
      patterns: [{ include: "source.yaml" }]
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
  const operators = spec.operators ?? {};
  const multiCharOperators = operators.multi_char ?? [];
  const wordOperators = operators.word_operators ?? [];
  const symbolicOperators = unique([
    ...(operators.assignment ?? []),
    ...(operators.comparison ?? []),
    ...(operators.arithmetic ?? []),
    ...(operators.logical ?? []),
    ...(operators.type_union ?? [])
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
  const operators = spec.operators ?? {};
  const punctuation = operators.punctuation ?? [];

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
  const reservedKeywords = [...(spec.keywords?.reserved ?? [])];
  const contextualKeywords = [...(spec.keywords?.contextual ?? [])];
  const literals = literalWords(spec);
  const wordOperators = spec.operators?.word_operators ?? [];
  const identifierPattern =
    spec.identifiers?.pattern ?? "[A-Za-z_][A-Za-z0-9_]*";
  const nonFunctionWords = [
    ...reservedKeywords,
    ...contextualKeywords,
    ...literals,
    ...wordOperators,
    ...builtinTypes
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
      { include: "#keywords" },
      { include: "#constants" },
      { include: "#functions" },
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
            match: wordRegex(declarationModifiers)
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
            match: `\\b(?:const|var)\\s+(${identifierPattern})\\b`,
            captures: {
              1: { name: "variable.other.definition.arx" }
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
            match: wordRegex(builtinTypes)
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
            match: `\\b(?:${alternationRegex(builtinFunctions)})\\b(?=\\s*\\()`
          },
          {
            name: "support.function.arx",
            match:
              `\\b(?!${wordRegex(nonFunctionWords)})` +
              `(?:${identifierPattern})(?=\\s*\\()`
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
