# Coding Conventions

**Analysis Date:** 2026-04-08

## Status

This codebase contains no source code yet. Only the following files exist:

- `README.md` — Project name and one-line description (Korean: "personal asset management application")
- `docs/개발일지.md` — Empty development journal

No conventions can be observed from existing code. The guidance below represents **recommended conventions** to establish for this project based on its apparent scope (personal asset management app).

---

## Naming Patterns

**Files:**
- Use `kebab-case` for file and directory names (e.g., `asset-service.ts`, `portfolio-chart.tsx`)
- Co-locate related files by feature, not by type

**Functions:**
- Use `camelCase` for all function and method names
- Use descriptive verbs: `getPortfolio`, `calculateReturn`, `formatCurrency`

**Variables:**
- Use `camelCase` for local variables and parameters
- Use `UPPER_SNAKE_CASE` for module-level constants

**Types/Interfaces:**
- Use `PascalCase` for types, interfaces, enums, and classes
- Prefix interfaces with `I` is not recommended — use plain names like `Asset`, `Portfolio`

---

## Code Style

**Formatting:**
- Not yet configured — no `.prettierrc`, `.eslintrc`, or `biome.json` detected
- Recommended: establish Prettier with 2-space indent, single quotes, trailing commas

**Linting:**
- Not yet configured
- Recommended: ESLint with TypeScript rules, or Biome for combined lint + format

---

## Import Organization

**Recommended Order:**
1. Node built-ins
2. External packages (e.g., `react`, `next`, third-party SDKs)
3. Internal aliases (e.g., `@/lib/...`, `@/components/...`)
4. Relative imports (`./`, `../`)

**Path Aliases:**
- Not yet configured — establish `@/` pointing to `src/` once project scaffolding begins

---

## Error Handling

**Patterns:**
- Not yet established
- Recommended: use `Result<T, E>` pattern or typed error classes for domain errors
- Avoid silent `catch` blocks that swallow errors

---

## Logging

**Framework:** Not yet established
- Recommended: `console` for development, structured logger (e.g., `pino`) for production

---

## Comments

**When to Comment:**
- Comment non-obvious business logic (e.g., financial calculations, rounding rules)
- Do not comment what the code already says

**JSDoc/TSDoc:**
- Use for public-facing functions and service methods

---

## Function Design

**Size:** Prefer small, single-purpose functions
**Parameters:** Use named options objects for functions with more than 2 parameters
**Return Values:** Be explicit with return types in TypeScript

---

## Module Design

**Exports:** Use named exports; avoid default exports except for framework-required cases (Next.js pages/layouts)
**Barrel Files:** Use `index.ts` barrel files sparingly — only at feature boundaries, not for every directory

---

*Convention analysis: 2026-04-08 — no source code present, recommendations only*
