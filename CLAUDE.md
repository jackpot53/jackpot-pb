<!-- GSD:project-start source:PROJECT.md -->
## Project

**jackpot-pb**

개인 자산 관리 웹 앱. 주식/ETF, 예적금, 부동산, 암호화폐 등 다양한 상품의 보유 내역을 기록하고, 실시간 시세 API로 수익률을 자동 계산해 연간/월간 단위로 자산 성장을 추적한다. 싱글 유저 대상으로, 연말에 "올해 내 자산이 얼마나 늘었나"를 한 화면에서 확인하는 것이 핵심이다.

**Core Value:** 연말 결산 — 전체 자산의 연간 수익률과 상품별 성과를 한눈에 볼 수 있어야 한다.

### Constraints

- **플랫폼**: 웹 브라우저 — 모바일 네이티브 불필요
- **사용자 규모**: 싱글 유저 — 복잡한 멀티테넌시 불필요
- **데이터 입력**: 주식/코인 시세는 외부 API, 부동산/예적금은 수동 — 증권사 스크래핑 없음
- **Tech stack**: 미정 — 기획 단계에서 결정
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Status
## Host Environment
| Item | Value |
|------|-------|
| Node.js | v23.10.0 |
| Shell | zsh |
| OS | macOS (darwin) |
## Application Stack
## GSD Framework (tooling only)
| Component | Detail |
|-----------|--------|
| GSD version | v1.34.2 |
| Runtime | Node.js CJS scripts |
| Hooks | Bash + Node.js |
## Configuration Files
| File | Purpose |
|------|---------|
| `.claude/settings.json` | Claude Code permissions, hooks, statusline |
## Languages
## To Be Determined
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Status
- `README.md` — Project name and one-line description (Korean: "personal asset management application")
- `docs/개발일지.md` — Empty development journal
## Naming Patterns
- Use `kebab-case` for file and directory names (e.g., `asset-service.ts`, `portfolio-chart.tsx`)
- Co-locate related files by feature, not by type
- Use `camelCase` for all function and method names
- Use descriptive verbs: `getPortfolio`, `calculateReturn`, `formatCurrency`
- Use `camelCase` for local variables and parameters
- Use `UPPER_SNAKE_CASE` for module-level constants
- Use `PascalCase` for types, interfaces, enums, and classes
- Prefix interfaces with `I` is not recommended — use plain names like `Asset`, `Portfolio`
## Code Style
- Not yet configured — no `.prettierrc`, `.eslintrc`, or `biome.json` detected
- Recommended: establish Prettier with 2-space indent, single quotes, trailing commas
- Not yet configured
- Recommended: ESLint with TypeScript rules, or Biome for combined lint + format
## Import Organization
- Not yet configured — establish `@/` pointing to `src/` once project scaffolding begins
## Error Handling
- Not yet established
- Recommended: use `Result<T, E>` pattern or typed error classes for domain errors
- Avoid silent `catch` blocks that swallow errors
## Logging
- Recommended: `console` for development, structured logger (e.g., `pino`) for production
## Comments
- Comment non-obvious business logic (e.g., financial calculations, rounding rules)
- Do not comment what the code already says
- Use for public-facing functions and service methods
## Function Design
## Module Design
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Status
- `README.md` — project description
- `docs/개발일지.md` — empty development journal
- `.claude/` — GSD agent framework
- `.agent/` — agent configuration
- `.planning/codebase/` — codebase map (this document)
## Intended Purpose
## Pattern
- CRUD-based data model (assets, valuations, transactions)
- Client-server or local-first architecture
- Authentication layer (personal/single-user or multi-user)
## Entry Points
## Data Flow
## Abstractions
## Layers
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
