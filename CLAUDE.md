## 참고 문서
- PRD: docs/PRD.md
- 구현 계획: docs/PLAN.md

작업 전 반드시 위 문서를 읽고 시작할 것.

## 실행
- `npm run dev` — 개발 서버 (http://localhost:3000). `.env` 의 `MONGODB_URI` 필요 (Atlas).
- `npm test` — Vitest. `mongodb-memory-server` 사용, `.env` 불필요.
- `npm run build` / `npm run lint` / `npm run typecheck`

## 구조 요약
- **App Router 풀스택**: `app/api/{goals,weekly,todos}/route.ts` 가 백엔드. Mongoose 모델은 `models/`.
- **DB 커넥션**: `lib/mongodb.ts` 의 `connectDB()` — global 캐시 싱글턴. `MONGODB_URI` 는 함수 내부에서 읽음.
- **상태 관리**: `store/` Zustand 슬라이스 3개. `todoSlice` 는 낙관적 재정렬(reorderTodo) + 실패 롤백.
- **순서(order)**: `fractional-indexing` 문자열. 드래그 시 카드 1건만 PATCH.
- **주차 계산**: `lib/utils.ts` `getWeekStart` (월요일 00:00 로컬).
- **연결 구조**: `Todo.weeklyPlanId` → `WeeklyPlan`, `Todo.goalId` / `WeeklyPlan.goalId` → `Goal`.
- **진행률**: 읽기 시점 계산 (`percent(done,total)`), 저장 안 함.

## 컨벤션
- UI 텍스트는 한국어. CSS 변수: `--card --border --muted --primary --foreground`.
- 클라이언트 컴포넌트만 `'use client'`. fetch 는 `lib/api.ts` 래퍼 사용.
