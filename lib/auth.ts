import connectDB from '@/lib/mongodb';
import User, { type UserDoc } from '@/models/User';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/session';
import { errorResponse } from '@/lib/apiHelpers';

/** Cookie 헤더 문자열에서 name 값을 꺼낸다. */
export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.get('cookie');
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    if (k === name) {
      const raw = part.slice(idx + 1).trim();
      try {
        return decodeURIComponent(raw);
      } catch {
        // 잘못 인코딩된 쿠키 값(예: "%") 이 500 을 유발하지 않도록 원본을 그대로 쓴다.
        return raw;
      }
    }
  }
  return undefined;
}

/**
 * 요청의 세션 쿠키를 검증하고 DB 에서 User 를 조회해 반환한다. (Node 런타임 전용)
 * 유효한 세션이 없으면 null.
 */
export async function getCurrentUser(req: Request): Promise<UserDoc | null> {
  const token = readCookie(req, SESSION_COOKIE);
  const payload = await verifySessionToken(token);
  if (!payload) return null;
  await connectDB();
  const user = await User.findById(payload.uid);
  return (user as UserDoc | null) ?? null;
}

export interface AuthOk {
  user: UserDoc;
}

/**
 * 라우트 핸들러 상단에서 사용. 인증되지 않았으면 401 Response 를 반환한다.
 * 사용: `const auth = await requireUser(req); if (auth instanceof Response) return auth; const { user } = auth;`
 */
export async function requireUser(req: Request): Promise<AuthOk | Response> {
  const user = await getCurrentUser(req);
  if (!user) return errorResponse('로그인이 필요합니다.', 401);
  return { user };
}
