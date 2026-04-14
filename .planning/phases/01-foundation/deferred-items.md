# Deferred Items — Phase 01 Foundation

## Pre-existing TypeScript Errors (out of scope for Plan 04)

These errors existed before Plan 04 execution and are not caused by Plan 04 changes.

### components/app/asset-form.tsx(115)
- Error: `Expected 1 arguments, but got 0`
- Context: Internal useRef/setTimeout usage — pre-existing

### components/app/transactions-page-client.tsx (100, 115, 155)
- Error: `Dispatch<SetStateAction<string>>` not assignable to `(value: string | null, ...) => void`
- Context: Select component onValueChange handler null type mismatch — pre-existing

### components/app/transactions-tab.tsx (55, 92)
- Error: `'fund'` not assignable to `AssetType`
- Context: AssetType enum missing 'fund' — pre-existing

### app/(app)/transactions/page.tsx (21)
- Error: `AssetOption` type missing 'fund' in assetType union
- Context: Same root cause as transactions-tab.tsx — pre-existing

### app/api/cron/snapshot/route.ts (92)
- Error: `AssetWithHolding.totalQuantity: number | null` not assignable to `AssetHoldingInput.totalQuantity: number`
- Context: Null safety gap in computeAssetPerformance input — pre-existing

### lib/portfolio/__tests__/compute.test.ts (25, 44, 56)
- Error: Missing `currency`, `accountType`, `notes` properties in test fixtures
- Context: AssetHoldingInput type expanded but tests not updated — pre-existing
