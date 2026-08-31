import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User, { type UserDoc } from '@/models/User';
import { readCookie } from '@/lib/auth';
import {
  OAUTH_STATE_COOKIE,
  createSessionToken,
  sessionCookieHeader,
  clearCookieHeader,
} from '@/lib/session';

export const dynamic = 'force-dynamic';

function loginError(origin: string, reason: string) {
  const url = new URL(`${origin}/login`);
  url.searchParams.set('error', reason);
  const res = NextResponse.redirect(url.toString(), 302);
  res.headers.append('Set-Cookie', clearCookieHeader(OAUTH_STATE_COOKIE));
  return res;
}

/** GET /auth/github/callback — code 교환 → 프로필 조회 → User upsert → 세션 쿠키 설정 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const savedState = readCookie(req, OAUTH_STATE_COOKIE);

  if (!code || !state || !savedState || state !== savedState) {
    return loginError(origin, 'state_mismatch');
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return loginError(origin, 'server_config');
  }

  const redirectUri = process.env.GITHUB_CALLBACK_URL || `${origin}/auth/github/callback`;

  // 1) code -> access_token
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });
  const tokenJson = (await tokenRes.json().catch(() => ({}))) as { access_token?: string };
  const accessToken = tokenJson.access_token;
  if (!accessToken) return loginError(origin, 'token_exchange_failed');

  // 2) access_token -> profile
  const profileRes = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'todo-app',
    },
  });
  const gh = (await profileRes.json().catch(() => ({}))) as {
    id?: number | string;
    login?: string;
    avatar_url?: string;
  };
  if (!gh.id || !gh.login) return loginError(origin, 'profile_fetch_failed');

  // 3) upsert User
  await connectDB();
  const githubId = String(gh.id);
  const user = (await User.findOneAndUpdate(
    { githubId },
    { githubId, username: gh.login, avatarUrl: gh.avatar_url ?? '' },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  )) as UserDoc;

  // 4) 세션 쿠키
  const token = await createSessionToken({
    uid: String(user._id),
    githubId,
    username: gh.login,
  });

  const res = NextResponse.redirect(`${origin}/`, 302);
  res.headers.append('Set-Cookie', sessionCookieHeader(token));
  res.headers.append('Set-Cookie', clearCookieHeader(OAUTH_STATE_COOKIE));
  return res;
}
