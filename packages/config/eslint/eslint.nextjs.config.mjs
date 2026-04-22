import { Linter } from "eslint";
import tsParser from "@typescript-eslint/parser";

export const nextJsConfig: Linter.FlatConfig = {
  files: ["**/*.ts", "**/*.tsx"],
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      project: true,
      tsconfigRootDir: process.cwd(),
    },
  },
  rules: {
    "no-console": "warn",
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      },
    ],
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/consistent-type-imports": [
      "error",
      { prefer: "type-imports" },
    ],
    "import/consistent-kind": "error",
    "@next/next/no-html-link-for-pages": "error",
  },
  plugins: {
    "@typescript-eslint": {} as Linter.Plugin,
  },
};