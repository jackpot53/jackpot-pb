# Phase 1: Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the discussion.

**Date:** 2026-04-09
**Phase:** 01-foundation
**Mode:** discuss
**Areas discussed:** 배포 대상, ORM 접근방식, 로그인 UI 스타일, 로컬 개발 환경

## Gray Areas Presented

4개 영역 모두 선택됨.

## Decisions Made

### 배포 대상
- **Question:** 앱을 어디에 배포할 계획인가요?
- **Decision:** Vercel
- **Reason:** Next.js 최적화, 자동 배포, Vercel Cron Jobs로 Phase 4 크론 처리 가능

### ORM 접근방식
- **Question:** Supabase와 함께 어떤 데이터 접근 방식을 쓸까요?
- **Decision:** Drizzle ORM + Supabase
- **Reason:** 타입 안전 스키마, 마이그레이션 제어, 커스텀 쿼리 지원

### 로그인 UI 스타일
- **Question:** 로그인 화면 디자인은 어때해요?
- **Decision:** 전체 페이지 로그인 (/login 라우트, 중앙 카드)
- **Reason:** 단순하고 명확한 UX

### 로컬 개발 환경
- **Question:** Supabase 로컬 개발 환경은 어때할까요?
- **Decision:** 클라우드 Supabase 직접
- **Reason:** 로컬 CLI 세팅 없이 바로 개발 시작 가능

## Corrections Made

없음 — 추천 옵션이 모두 수락됨.

## Deferred Ideas

- Supabase RLS — 싱글 유저 앱에서 불필요한 복잡성
- 비밀번호 재설정, OAuth — v2
