---
status: complete
phase: 01-foundation
source: [01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-03-SUMMARY.md]
started: 2026-04-10T00:00:00Z
updated: 2026-04-10T00:01:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running dev server. From the project root, run `npm run dev`. Server starts without errors. Then run `npm run build` — exits 0 with no TypeScript or lint errors.
result: pass

### 2. Unauthenticated Redirect
expected: While logged out, visit http://localhost:3000/. The browser should immediately redirect to /login?redirect=%2F — the login page loads with no flash of the protected page.
result: pass

### 3. Login Page UI
expected: At /login, you see a centered card with the app title, an email field, a password field, a Korean submit button (로그인), and all labels/placeholders are in Korean.
result: pass

### 4. Sign In with Valid Credentials
expected: Enter your real Supabase email and password and submit the login form. You should be redirected to / (the authenticated home page) and the session should persist on browser refresh.
result: pass

### 5. Redirect Parameter Preserved
expected: While logged out, visit http://localhost:3000/some-path. You should be redirected to /login?redirect=%2Fsome-path. After logging in, you should land on /some-path (not /).
result: pass

### 6. Sign Out
expected: On the authenticated home page (/), click the 로그아웃 button. Your session should be invalidated — a subsequent visit to / should redirect back to /login.
result: pass

### 7. Wrong Credentials Error
expected: On the login form, enter an incorrect password and submit. An inline Korean error message appears below the password field: "이메일 또는 비밀번호가 올바르지 않습니다." The form does not reveal whether the email or password was wrong.
result: pass

### 8. Loading State on Submit
expected: Click submit on the login form. Before the server responds, the button should show a spinner and the text "로그인 중..." and the button should be disabled (no double-submit possible).
result: pass

## Summary

total: 8
passed: 8
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]
