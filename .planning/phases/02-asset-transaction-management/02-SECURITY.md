---
phase: "02"
slug: asset-transaction-management
status: verified
threats_open: 0
asvs_level: L1
created: "2026-04-13"
---

# Phase 02 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Client → Server Action (assets) | createAsset / updateAsset / deleteAsset | Untrusted form data (name, type, currency, ticker, notes) |
| Client → Server Action (transactions) | createTransaction / updateTransaction / voidTransaction | Untrusted numeric strings (quantity, price, exchange rate) |
| Client → Server Action (valuations) | createManualValuation | Untrusted numeric string (valueKrw), date string |
| Server Action → Supabase Auth | Token re-validation via requireUser() | JWT token, user ID |
| Server Action → Drizzle/PostgreSQL | All DB mutations | Parameterized queries — no raw SQL |
| computeHoldings (pure function) | Internal computation | DB-sourced transaction records |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-02-01-S | Spoofing | All asset Server Actions | mitigate | `requireUser()` → `supabase.auth.getUser()` as first operation; redirects to /login if no user — verified at `app/actions/assets.ts` lines 25–30 | closed |
| T-02-01-T | Tampering | createAsset / updateAsset | mitigate | `assetSchema` with `z.enum` on all type fields; `safeParse` before any DB op — verified at `app/actions/assets.ts` lines 13–20, 35, 51 | closed |
| T-02-01-I | Info Disclosure | deleteAsset | mitigate | Auth check via `requireUser()` as first call in deleteAsset — verified at `app/actions/assets.ts` line 76 | closed |
| T-02-01-D | Denial of Service | notes/name field lengths | accept | See Accepted Risks Log | closed |
| T-02-01-E | Elevation of Privilege | AppLayout auth guard | mitigate | `app/(app)/layout.tsx` lines 12–13: `getUser()` + `redirect('/login')`; `middleware.ts` also runs `updateSession` on all matched routes — defense in depth confirmed | closed |
| T-02-02-T | Tampering | computeHoldings arithmetic | mitigate | `Math.round` at division boundary only; 8 unit tests covering all edge cases — verified at `lib/holdings.ts` lines 37–43, `tests/holdings.test.ts` | closed |
| T-02-02-T | Tampering | upsertHoldings assetId | accept | See Accepted Risks Log | closed |
| T-02-02-D | Denial of Service | upsertHoldings full re-read | accept | See Accepted Risks Log | closed |
| T-02-03-S | Spoofing | All transaction Server Actions | mitigate | `requireUser()` called first in createTransaction (line 55), voidTransaction (line 106), updateTransaction (line 119) — verified at `app/actions/transactions.ts` | closed |
| T-02-03-T | Tampering | createTransaction quantity/price | mitigate | `z.string().refine()` validates quantity > 0 and pricePerUnit >= 0 before parseFloat; `Math.round` for integer encoding — verified at `app/actions/transactions.ts` lines 33–39 | closed |
| T-02-03-T | Tampering | voidTransaction transactionId | accept | See Accepted Risks Log | closed |
| T-02-03-T | Tampering | updateTransaction | accept | See Accepted Risks Log | closed |
| T-02-03-I | Info Disclosure | KRW preview client-side | accept | See Accepted Risks Log | closed |
| T-02-03-D | Denial of Service | upsertHoldings re-read on mutate | accept | See Accepted Risks Log | closed |
| T-02-04-S | Spoofing | createManualValuation | mitigate | `requireUser()` with `supabase.auth.getUser()` as first operation at line 34 — verified at `app/actions/manual-valuations.ts` lines 9–13 | closed |
| T-02-04-T | Tampering | valueKrw string → parseFloat | mitigate | zod `.refine()` validates non-empty, non-NaN, >= 0; `Math.round(parseFloat(...))` ensures integer storage — verified at `app/actions/manual-valuations.ts` lines 18–20, 47, 50 | closed |
| T-02-04-T | Tampering | append-only guarantee | mitigate | Only `db.insert(manualValuations)` present — no `db.update` or `db.delete` on this table — verified at `app/actions/manual-valuations.ts` line 54 | closed |
| T-02-04-I | Info Disclosure | valuation history display | accept | See Accepted Risks Log | closed |

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-02-01 | T-02-01-D | Low-value target; single-user app; varchar DB constraints (name 255, notes 1000) provide final guard | gsd-security-auditor | 2026-04-13 |
| AR-02-02 | T-02-02-T (assetId) | assetId is a UUID from an authenticated Server Action — validated at the action layer before reaching upsertHoldings | gsd-security-auditor | 2026-04-13 |
| AR-02-03 | T-02-02-D | Single-user app; transaction counts will be small (hundreds, not millions); linear scan acceptable for correctness | gsd-security-auditor | 2026-04-13 |
| AR-02-04 | T-02-03-T (void) | Single-user app; authenticated user owns all data — no cross-user isolation needed | gsd-security-auditor | 2026-04-13 |
| AR-02-05 | T-02-03-T (update) | Single-user app; authenticated user owns all data | gsd-security-auditor | 2026-04-13 |
| AR-02-06 | T-02-03-I | KRW preview is a UX calculation using only user-entered values — no sensitive server data exposed | gsd-security-auditor | 2026-04-13 |
| AR-02-07 | T-02-03-D | Single-user, small dataset; re-read cost acceptable for correctness guarantee | gsd-security-auditor | 2026-04-13 |
| AR-02-08 | T-02-04-I | Single-user app — user owns all data; no cross-user exposure possible | gsd-security-auditor | 2026-04-13 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-04-13 | 18 | 18 | 0 | gsd-security-auditor (ASVS L1) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-04-13
