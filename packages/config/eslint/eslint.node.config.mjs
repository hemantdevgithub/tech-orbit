import { Linter } from "eslint";
import tsParser from "@typescript-eslint/parser";

export const nodeConfig: Linter.FlatConfig = {
  files: ["**/*.ts"],
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
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/consistent-type-imports": [
      "error",
      { prefer: "type-imports" },
    ],
    "import/consistent-kind": "error",
  },
  plugins: {
    "@typescript-eslint": {} as Linter.Plugin,
  },
};