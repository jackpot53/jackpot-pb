## Project

**jackpot-pb**

개인 자산 관리 웹 앱. 주식/ETF, 예적금, 부동산, 암호화폐 등 다양한 상품의 보유 내역을 기록하고, 실시간 시세 API로 수익률을 자동 계산해 연간/월간 단위로 자산 성장을 추적한다. 싱글 유저 대상으로, 연말에 "올해 내 자산이 얼마나 늘었나"를 한 화면에서 확인하는 것이 핵심이다.

**Core Value:** 연말 결산 — 전체 자산의 연간 수익률과 상품별 성과를 한눈에 볼 수 있어야 한다.

### Constraints

- **플랫폼**: 웹 브라우저 — 모바일 네이티브 불필요
- **사용자 규모**: 싱글 유저 — 복잡한 멀티테넌시 불필요
- **데이터 입력**: 주식/코인 시세는 외부 API, 부동산/예적금은 수동 — 증권사 스크래핑 없음

## Technology Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 (strict mode) |
| UI | React 19, Tailwind CSS 4, shadcn/ui (Base UI), Lucide |
| Charts | Recharts, D3 |
| Forms | React Hook Form + Zod |
| Database | Supabase (Postgres) + Drizzle ORM |
| Testing | Vitest + Testing Library |
| Linting | ESLint 9 (eslint-config-next) |

**Import alias:** `@/` → project root

## Conventions

### Naming
- `kebab-case` — 파일·디렉터리
- `camelCase` — 함수, 변수, 파라미터
- `PascalCase` — 타입, 인터페이스, 열거형, 클래스
- `UPPER_SNAKE_CASE` — 모듈 레벨 상수
- 인터페이스 `I` 접두사 금지 — `Asset`, `Portfolio` 형태로
- 기능 단위로 파일 배치 (타입별 분리 지양)

### Code Style
- Prettier 미설정 — 수동 2-space indent, single quotes, trailing commas 권장
- ESLint 설정됨 (`eslint.config.mjs`)

### Error Handling
- 도메인 오류는 타입 에러 클래스 또는 `Result<T, E>` 패턴 권장
- 빈 `catch` 블록으로 오류 무시 금지

### Comments
- 비즈니스 로직의 비직관적인 부분만 주석 (금융 계산, 반올림 규칙 등)
- 코드가 이미 말하는 것은 주석 불필요
