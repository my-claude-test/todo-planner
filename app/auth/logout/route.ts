import { NextResponse } from 'next/server';
import { SESSION_COOKIE, clearCookieHeader } from '@/lib/session';

export const dynamic = 'force-dynamic';

function handle(req: Request) {
  const origin = new URL(req.url).origin;
  const res = NextResponse.redirect(`${origin}/login`, 302);
  res.headers.append('Set-Cookie', clearCookieHeader(SESSION_COOKIE));
  return res;
}

/** GET /auth/logout — 세션 쿠키 삭제 후 /login 으로 */
export function GET(req: Request) {
  return handle(req);
}

/** POST /auth/logout */
export function POST(req: Request) {
  return handle(req);
}
