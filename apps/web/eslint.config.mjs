import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// PIN-DOC: apps/web pins TypeScript to `~5.9.3` and ESLint to `~9.39.5`
// because the wider toolchain for `.ts`/`.tsx` linting
// (`@typescript-eslint@8.x`, brought in transitively by
// `eslint-config-next/typescript`) does not, as of its 8.x line, consume
// TypeScript 7 or ESLint 10 without crashing. The `~` ranges hold us to the
// exact 5.9.x and 9.39.x lines that were empirically verified working
// (see CEILING below). TypeScript-aware linting rules are active; the pins
// are temporary.
//
// CEILING (empirically verified at the time of writing against
// `@typescript-eslint/{utils,typescript-estree}@8.63.0`): the highest working
// configuration for `apps/web` is:
//   - TypeScript:   ✓  5.9.x                 (pinned `~5.9.3`)
//   - ESLint:       ✓  9.39.x                (pinned `~9.39.5`)
//   - tseslint:     ✓  8.63.0 (latest stable 8.x; no v9 yet)
//
// What does NOT work (as of the 8.x line):
//   ESLint 10       → tseslint `class extends undefined`     (FlatESLint refactor)
//   TypeScript 7    → tseslint `ts.Extension.Cjs undefined`   (AST enum changed)
//   any 8.x canary  → override ignored; peer-dep pin from `eslint-config-next` wins
//
// PRECONDITION for touching `typescript: ^5.7.3`: if you ever change this pin
// to allow TS 6.x or 7.x, manually verify the resolved version is still
// consumed cleanly by the locked `@typescript-eslint/*@^8.63.0` override in
// the root `package.json` before merging. The current `^5.7.3` already blocks
// 6.x and 7.x automatically; this warning is about anyone *editing* the pin.
// If you can't verify, tighten to `~5.9.3` (the last floor actually tested)
// until v9 ships.
//
// TODO(ts-eslint-v9): when `@typescript-eslint` v9 is released with stable
// support for TypeScript 7 + ESLint 10, remove:
//   1. the entire root `overrides` block in package.json
//   2. the `eslint` and `typescript` pins in apps/web/package.json
//   3. this comment
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
