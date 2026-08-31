import { json } from '@/lib/apiHelpers';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** GET /api/me — 현재 로그인 사용자 정보 (셸의 UserMenu 가 사용). 미인증이면 401. */
export async function GET(req: Request) {
  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;
  return json({ username: auth.user.username, avatarUrl: auth.user.avatarUrl });
}
