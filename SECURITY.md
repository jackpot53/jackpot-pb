# SECURITY.md

**Phase:** 02 — Asset & Transaction Management
**ASVS Level:** L1
**Audit Date:** 2026-04-10
**Auditor:** gsd-security-auditor (claude-sonnet-4-6)

---

## Threat Verification Summary

**Threats Closed:** 10/10 (mitigate disposition)
**Accepted Risks:** 8/8 (pre-CLOSED, no verification required)
**Unregistered Flags:** 0
**block_on:** open — no blockers present

---

## Mitigate Threats — Verification Results

| Threat ID | Category | Component | Status | Evidence |
|-----------|----------|-----------|--------|----------|
| T-02-01-S | Spoofing | All Server Actions (assets) | CLOSED | `app/actions/assets.ts` lines 25–30: `requireUser()` calls `supabase.auth.getUser()` as first operation; redirects to `/login` if `!user`. Called at top of `createAsset` (line 33), `updateAsset` (line 48), `deleteAsset` (line 76). |
| T-02-01-T | Tampering | createAsset / updateAsset | CLOSED | `app/actions/assets.ts` lines 13–20: `assetSchema` with `z.object(...)` validates all fields; `z.enum` on `assetType`, `priceType`, `currency`; `safeParse` called before any DB operation at lines 35, 51. |
| T-02-01-I | Info Disclosure | deleteAsset — deletes any asset by ID | CLOSED | `app/actions/assets.ts` line 76: `await requireUser()` is the first call in `deleteAsset`, ensuring only the authenticated user can trigger deletion. Auth check inherited from T-02-01-S mitigation. |
| T-02-01-E | Elevation of Privilege | AppLayout auth guard | CLOSED | `app/(app)/layout.tsx` lines 12–13: `supabase.auth.getUser()` called, `if (!user) redirect('/login')`. `middleware.ts` also calls `updateSession(request)` for all matched routes — defense in depth confirmed. |
| T-02-02-T | Tampering | computeHoldings arithmetic | CLOSED | `lib/holdings.ts` lines 37–43: WAVG uses `Math.round(...)` only at the final division boundary. Sell cost basis uses `Math.round((tx.quantity / 1e8) * avgCostPerUnit)`. 8 unit tests verified in `tests/holdings.test.ts` covering empty, single buy, fee, multi-buy WAVG, partial sell, buy-after-sell, all-voided, mixed-void. |
| T-02-03-S | Spoofing | All transaction Server Actions | CLOSED | `app/actions/transactions.ts` lines 13–18: `requireUser()` defined with `supabase.auth.getUser()`; called as first operation in `createTransaction` (line 55), `voidTransaction` (line 106), `updateTransaction` (line 119). |
| T-02-03-T | Tampering | createTransaction quantity/price | CLOSED | `app/actions/transactions.ts` lines 30–44: `transactionFormSchema` validates `quantity` with `parseFloat(v) > 0` and `pricePerUnit` with `parseFloat(v) >= 0` via `z.string().refine(...)` before any encoding. `encodeQuantity` uses `Math.round(parseFloat(input) * 1e8)` (line 22). |
| T-02-04-S | Spoofing | createManualValuation | CLOSED | `app/actions/manual-valuations.ts` lines 9–13: `requireUser()` calls `supabase.auth.getUser()`; `await requireUser()` is the first call in `createManualValuation` (line 34). |
| T-02-04-T | Tampering | valueKrw string → parseFloat | CLOSED | `app/actions/manual-valuations.ts` lines 16–25: `valuationFormSchema` validates `valueKrw` is non-empty, non-NaN, and `>= 0` via `.refine(...)`. `Math.round(parseFloat(d.valueKrw))` used for integer storage (line 50). |
| T-02-04-T | Tampering | append-only guarantee | CLOSED | `app/actions/manual-valuations.ts` line 54: only `db.insert(manualValuations).values(...)` is called. No `db.update(manualValuations` or `db.delete(manualValuations` exists in the file. D-06/D-09 comment present at line 53. |

---

## Accepted Risks Log

The following threats are pre-accepted for this phase. No mitigation verification required.

| Threat ID | Category | Rationale |
|-----------|----------|-----------|
| T-02-01-D | DoS | Field length limits enforced by varchar DB constraints; single-user app with no adversarial load. |
| T-02-02-T (upsertHoldings assetId) | Tampering | assetId is a UUID validated at the Server Action layer before reaching upsertHoldings. |
| T-02-02-D | DoS | Single-user app; transaction counts will remain small (hundreds); full re-read is acceptable. |
| T-02-03-T (voidTransaction) | Tampering | Single-user app; authenticated user owns all data; no cross-user row access possible. |
| T-02-03-T (updateTransaction) | Tampering | Single-user app; authenticated user owns all data; no cross-user row access possible. |
| T-02-03-I | Info Disclosure | KRW preview is a client-side UX calculation using only user-entered values; no server secrets exposed. |
| T-02-03-D | DoS | Single-user app; upsertHoldings full re-read scales acceptably for expected transaction volume. |
| T-02-04-I | Info Disclosure | Single-user app; valuation history belongs entirely to the authenticated user; no cross-user exposure. |

---

## Unregistered Threat Flags

None. All threat flags reported in SUMMARY.md `## Threat Surface` sections map to registered threat IDs (T-02-01-S through T-02-04-T). No new unregistered surfaces detected during implementation.

---

## Notes

- `middleware.ts` delegates to `updateSession` from `@/utils/supabase/middleware` which handles session refresh. This is standard Supabase Next.js middleware and does not replace the in-layout `getUser()` check — defense in depth is intact.
- `computeHoldings` in `lib/holdings.ts` includes an extra guard (lines 48–51) that skips sell transactions exceeding current held quantity, logging a warning. This is a defensive addition not in the original plan — it does not weaken any declared mitigation.
- All three transaction Server Actions (`createTransaction`, `voidTransaction`, `updateTransaction`) call `requireUser()` before any DB read or write, satisfying T-02-03-S for all three action paths.
