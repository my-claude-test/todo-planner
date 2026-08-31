# 할일 + 계획 관리 앱

단기 실행(할일)과 중장기 목표(주간 계획 · 1년 목표)를 하나의 구조로 연결하는 앱.

- **연결 구조**: 할 일 → 주간 계획(objective) → 1년 목표
- 칸반 보드(To Do / Doing / Done) 드래그앤드랍, 요일별 배치, 주간·목표별 진행률 자동 계산
- **GitHub OAuth 로그인 필수** — 로그인해야 앱을 사용할 수 있고, 할 일은 사용자별로 분리됩니다. 설정: [docs/AUTH.md](docs/AUTH.md)

## 기술 스택

Next.js 14 (App Router) · TypeScript · Tailwind CSS · MongoDB(Mongoose) · Zustand · dnd-kit · fractional-indexing

## 요구사항

- Node.js 20+
- MongoDB (MongoDB Atlas 무료 클러스터 권장)

## 설치 & 실행

```bash
npm install
```

### 1. 환경 변수 설정

`.env.example` 을 복사해 `.env` 를 만들고 MongoDB 연결 문자열을 넣습니다.

```bash
cp .env.example .env
```

```env
# .env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.xxxxx.mongodb.net/todo?retryWrites=true&w=majority
AUTH_SECRET=<openssl rand -base64 32 로 생성>
GITHUB_CLIENT_ID=<GitHub OAuth App>
GITHUB_CLIENT_SECRET=<GitHub OAuth App>
```

> MongoDB Atlas: https://cloud.mongodb.com 에서 M0(무료) 클러스터 생성 →
> **Connect → Drivers** 의 URI 를 복사해 붙여넣으세요.
> `MONGODB_URI` 가 없으면 API 호출 시 명확한 에러 메시지를 반환합니다.
>
> GitHub OAuth App 생성과 나머지 환경변수는 **[docs/AUTH.md](docs/AUTH.md)** 참고.
> 기존 할일 데이터에 소유자를 붙이는 마이그레이션도 그 문서에 있습니다
> (`node scripts/migrate-todos-userId.mjs`).

### 2. 개발 서버

```bash
npm run dev
# http://localhost:3000
```

## 화면

| 경로 | 설명 |
| --- | --- |
| `/` | 대시보드 — 이번 주 계획 요약, 진행률, 상태별 할일 수, 목표별 연결 할일 수 |
| `/todos` | 칸반 보드 — 드래그앤드랍으로 상태/순서 변경 (자동 저장) |
| `/weekly` | 주간 계획 목록 / 생성 |
| `/weekly/[id]` | 주간 상세 — 주간 목표 토글, 메모, 회고, 요일 그리드 |
| `/goals` | 1년 목표 CRUD + 진행률 |

## 스크립트

```bash
npm run dev        # 개발 서버
npm run build      # 프로덕션 빌드
npm start          # 프로덕션 서버
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm test           # Vitest (mongodb-memory-server 로 API 통합 테스트 — .env 불필요)
```

## 테스트

`npm test` 는 `mongodb-memory-server` 로 인메모리 MongoDB 를 띄워 실행되므로
`.env` 설정 없이도 API CRUD · 주간 중복(409) · 목표 토글 · 드래그 재정렬 · 진행률 계산을 검증합니다.
(최초 실행 시 mongod 바이너리를 자동 다운로드합니다.)

## 구조

```
app/
  page.tsx              대시보드
  todos/ weekly/ goals/ 페이지
  api/{goals,weekly,todos}/  Route Handlers
components/{layout,goals,weekly,todos,shared}/
lib/     mongodb, api, fractionalIndex, utils, apiHelpers
models/  Goal, WeeklyPlan, Todo (Mongoose)
store/   goalSlice, weeklySlice, todoSlice (Zustand)
tests/   unit(순수 로직) + api(mongodb-memory-server)
```
