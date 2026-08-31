import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE = 'todo_session';
export const OAUTH_STATE_COOKIE = 'todo_oauth_state';

/** 세션 JWT 에 담기는 클레임 */
export interface SessionPayload {
  /** User._id (문자열) */
  uid: string;
  /** GitHub numeric id (문자열) */
  githubId: string;
  username: string;
}

const DEFAULT_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7일

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      'AUTH_SECRET 환경변수가 없거나 너무 짧습니다(최소 16자). .env 에 설정하세요. 생성: openssl rand -base64 32',
    );
  }
  return new TextEncoder().encode(secret);
}

/** payload 를 HS256 로 서명한 JWT 문자열을 반환한다. */
export async function createSessionToken(
  payload: SessionPayload,
  maxAgeSec: number = DEFAULT_MAX_AGE_SEC,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + maxAgeSec)
    .sign(secretKey());
}

/** JWT 를 검증하고 payload 를 반환한다. 서명 불일치/만료/파싱 실패 시 null. */
export async function verifySessionToken(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ['HS256'] });
    if (
      typeof payload.uid === 'string' &&
      typeof payload.githubId === 'string' &&
      typeof payload.username === 'string'
    ) {
      return { uid: payload.uid, githubId: payload.githubId, username: payload.username };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 미들웨어 리다이렉트 결정용 순수 헬퍼.
 * 토큰이 유효하면 false(통과), 없거나/변조/만료/검증 불가면 true(→ /login).
 */
export async function shouldRedirectToLogin(token: string | undefined): Promise<boolean> {
  try {
    return !(await verifySessionToken(token));
  } catch {
    return true;
  }
}

function cookieHeader(name: string, value: string, maxAgeSec: number): string {
  const secure = process.env.NODE_ENV === 'production' ? ' Secure;' : '';
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax;${secure} Max-Age=${maxAgeSec}`;
}

/** Set-Cookie 헤더 값 (세션 설정용) */
export function sessionCookieHeader(token: string, maxAgeSec: number = DEFAULT_MAX_AGE_SEC): string {
  return cookieHeader(SESSION_COOKIE, token, maxAgeSec);
}

/** Set-Cookie 헤더 값 (세션/상태 쿠키 삭제용) */
export function clearCookieHeader(name: string): string {
  return cookieHeader(name, '', 0);
}

/** OAuth state 쿠키 Set-Cookie 값 (짧은 수명, 10분) */
export function stateCookieHeader(state: string): string {
  return cookieHeader(OAUTH_STATE_COOKIE, state, 600);
}
