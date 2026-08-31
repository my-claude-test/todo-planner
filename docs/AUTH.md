# 인증 (GitHub OAuth)

이 앱은 GitHub OAuth 로그인이 필요하다. 로그인하지 않은 사용자는 모든 페이지에서
`/login` 으로 리다이렉트되고, 모든 `/api/*` 요청은 `401` 을 받는다.

## 1. GitHub OAuth App 만들기

1. https://github.com/settings/developers → **OAuth Apps** → **New OAuth App**
   (또는 조직: `https://github.com/organizations/<org>/settings/applications`)
2. 값 입력:
   - **Application name**: 아무 이름 (예: `todo-app-local`)
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/auth/github/callback`
     (포트가 다르면 그 포트로. 배포 시엔 실제 도메인 + `/auth/github/callback`)
3. **Register application** → 생성된 화면에서 **Client ID** 복사
4. **Generate a new client secret** → **Client secret** 복사 (한 번만 보임)

## 2. .env 설정

`.env.example` 을 복사해 `.env` 를 만들고 값을 채운다.

```bash
cp .env.example .env
```

| 이름 | 필수 | 설명 |
| --- | --- | --- |
| `MONGODB_URI` | ✅ | MongoDB 연결 문자열 (DB 이름 포함, 예: `.../todo`) |
| `AUTH_SECRET` | ✅ | 세션 JWT(HS256) 서명 키. 최소 16자. 생성: `openssl rand -base64 32` |
| `GITHUB_CLIENT_ID` | ✅ | 1번에서 복사한 Client ID |
| `GITHUB_CLIENT_SECRET` | ✅ | 1번에서 복사한 Client secret |
| `GITHUB_CALLBACK_URL` | – | 미설정 시 요청 origin + `/auth/github/callback` 로 자동 계산. 프록시/커스텀 도메인일 때만 지정 |

> `.env` 는 `.gitignore` 에 포함되어 커밋되지 않는다. 시크릿은 코드에 절대 하드코딩하지 않는다.

## 3. 로그인 플로우

| 경로 | 동작 |
| --- | --- |
| `GET /auth/github` | 랜덤 `state` 쿠키 설정 후 GitHub 인가 페이지로 302 (`scope=read:user`) |
| `GET /auth/github/callback` | `state` 검증 → `code`→토큰 교환 → `GET /user` 프로필 조회 → `User` upsert(githubId 기준) → 세션 쿠키 설정 후 `/` 로 302 |
| `GET /auth/logout` | 세션 쿠키를 `Max-Age=0` 으로 만료 후 `/login` 으로 302 |

세션 쿠키(`todo_session`)는 HttpOnly + SameSite=Lax + (프로덕션) Secure, 수명 7일.

## 환경변수 빠른 표

## 소유권 모델

`Todo` 문서는 `userId`(→ `User._id`) 필드로 소유자를 가진다.

- 소유자는 **세션에서만** 결정된다. 요청 본문의 `userId` 는 무시한다.
- `/api/todos` 계열 라우트는 항상 `userId = 로그인 사용자` 로 범위를 좁힌다.
  다른 사용자의 할일에 접근하면 존재하지 않는 것처럼 404 를 돌려준다.
- 목표 진행률/카운트 집계도 요청자의 Todo 만 센다. 목표 삭제 시 정리되는
  Todo 참조도 요청자 소유분에만 적용된다.

### 알려진 한계 (다중 사용자)

이 학습용 MVP 는 **한 명의 사용자**를 전제로 한다. `Todo` 는 사용자별로
분리되지만 `Goal` 과 `WeeklyPlan` 은 여전히 **모든 로그인 사용자가 공유**한다:

- 아무 로그인 사용자나 임의의 목표/주간계획을 조회·수정·삭제할 수 있다
  (본인 것이 아니어도).
- `WeeklyPlan.weekStart` 에 전역 unique 인덱스가 걸려 있어, 두 번째 사용자는
  같은 주의 계획을 새로 만들 수 없다(409).

두 번째 계정을 실제로 쓰려면 `Goal`/`WeeklyPlan` 에도 `userId` 를 추가하고
`WeeklyPlan` 의 unique 인덱스를 `{ userId, weekStart }` 복합으로 바꿔야 한다.

## 마이그레이션

`userId` 는 나중에 추가된 필드이므로, 기존 할일 문서는 `userId == null` 상태다.
아래 스크립트로 현황을 확인하고 특정 GitHub 사용자에게 일괄 배정할 수 있다.

```bash
# 1) 현황만 출력 (dry-run, 아무것도 변경하지 않음)
node scripts/migrate-todos-userId.mjs

# 2) userId 가 비어 있는 할일을 GitHub username 이 octocat 인 사용자에게 배정
node scripts/migrate-todos-userId.mjs --assign octocat
```

- `MONGODB_URI` 는 프로세스 환경변수에서 먼저 읽고, 없으면 프로젝트 루트의 `.env` 를
  스크립트가 직접 파싱해서 채운다 (별도 dotenv 의존성 없음). 끝내 값이 없으면 종료 코드 1 로 실패한다.
- 두 모드 모두 **전체 할일 수**와 **소유자 없는 할일 수**를 먼저 출력한다.
- `--assign` 에 준 username 의 사용자가 없으면 아무것도 바꾸지 않고 종료 코드 1 로 실패한다.
  (해당 사용자로 최소 한 번 로그인해서 `User` 문서를 만든 뒤 실행할 것)
- 성공 시 갱신된 문서 수(`modifiedCount`)를 출력한다. 이미 배정된 할일은 건드리지 않으므로
  여러 번 실행해도 안전하다.
