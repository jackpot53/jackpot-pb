# Testing Patterns

**Analysis Date:** 2026-04-08

## Status

This codebase contains no source code yet. No test framework, test files, or configuration have been established. The guidance below represents **recommended testing patterns** to establish as the project develops.

Existing files:
- `README.md` — Project name only
- `docs/개발일지.md` — Empty

---

## Test Framework

**Runner:**
- Not yet configured
- Recommended: Vitest (fast, native ESM, works well with Vite-based stacks) or Jest

**Assertion Library:**
- Built-in `expect` from Vitest or Jest is sufficient

**Run Commands (to establish):**
```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

---

## Test File Organization

**Location:**
- Recommended: co-locate test files alongside source files

**Naming:**
- `[filename].test.ts` for unit tests
- `[filename].spec.ts` for integration/behavioral tests

**Structure (recommended):**
```
src/
  services/
    asset-service.ts
    asset-service.test.ts
  components/
    PortfolioChart.tsx
    PortfolioChart.test.tsx
```

---

## Test Structure

**Suite Organization (recommended):**
```typescript
describe('AssetService', () => {
  describe('calculateReturn', () => {
    it('returns correct percentage for positive gain', () => {
      // arrange
      const asset = { purchasePrice: 100, currentPrice: 120 }

      // act
      const result = calculateReturn(asset)

      // assert
      expect(result).toBe(20)
    })

    it('returns negative percentage for loss', () => {
      // ...
    })
  })
})
```

**Patterns:**
- Use `beforeEach` for test setup that repeats across cases
- Use `afterEach` or `afterAll` only when cleanup is truly required
- Use AAA (Arrange-Act-Assert) structure within each test body

---

## Mocking

**Framework:** `vi.mock` (Vitest) or `jest.mock` (Jest)

**Recommended Patterns:**
```typescript
// Mock an external SDK
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
  },
}))

// Mock a service module
vi.mock('@/services/asset-service', () => ({
  getAssets: vi.fn().mockResolvedValue([]),
}))
```

**What to Mock:**
- External API clients and SDKs
- Database clients
- Browser APIs not available in test environment (e.g., `localStorage`, `fetch`)

**What NOT to Mock:**
- Pure utility functions
- Domain logic under test
- Internal modules unless they cross a service boundary

---

## Fixtures and Factories

**Test Data (recommended pattern):**
```typescript
// tests/factories/asset.ts
export function makeAsset(overrides?: Partial<Asset>): Asset {
  return {
    id: 'asset-1',
    name: 'Samsung Electronics',
    ticker: '005930',
    purchasePrice: 70000,
    quantity: 10,
    ...overrides,
  }
}
```

**Location:**
- Place shared factories in `tests/factories/` or `src/__tests__/factories/`

---

## Coverage

**Requirements:** Not yet configured
- Recommended minimum: 70% for service/domain logic; UI components are lower priority

**View Coverage:**
```bash
npm run test:coverage
```

---

## Test Types

**Unit Tests:**
- Scope: individual functions, services, utilities
- Fast, no I/O, no external dependencies

**Integration Tests:**
- Scope: service + database interactions, multi-module flows
- Use test database or in-memory equivalents

**E2E Tests:**
- Not yet established
- Recommended: Playwright when UI is built

---

## Common Patterns

**Async Testing:**
```typescript
it('fetches assets from API', async () => {
  const assets = await getAssets(userId)
  expect(assets).toHaveLength(3)
})
```

**Error Testing:**
```typescript
it('throws when asset not found', async () => {
  await expect(getAsset('nonexistent-id')).rejects.toThrow('Asset not found')
})
```

---

*Testing analysis: 2026-04-08 — no test files present, recommendations only*
