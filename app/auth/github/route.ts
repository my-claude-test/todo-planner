import { NextResponse } from 'next/server';
import { stateCookieHeader } from '@/lib/session';

export const dynamic = 'force-dynamic';

/** GET /auth/github — GitHub 인가 페이지로 리다이렉트 (+ state 쿠키 설정) */
export async function GET(req: Request) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return new Response('GITHUB_CLIENT_ID 환경변수가 설정되지 않았습니다. (docs/AUTH.md 참고)', {
      status: 500,
    });
  }

  const origin = new URL(req.url).origin;
  const redirectUri = process.env.GITHUB_CALLBACK_URL || `${origin}/auth/github/callback`;
  const state = crypto.randomUUID();

  const authorize = new URL('https://github.com/login/oauth/authorize');
  authorize.searchParams.set('client_id', clientId);
  authorize.searchParams.set('redirect_uri', redirectUri);
  authorize.searchParams.set('scope', 'read:user');
  authorize.searchParams.set('state', state);

  const res = NextResponse.redirect(authorize.toString(), 302);
  res.headers.append('Set-Cookie', stateCookieHeader(state));
  return res;
}
