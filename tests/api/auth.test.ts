import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { startTestDB, stopTestDB, clearCollections } from '../helpers/db';
import { OAUTH_STATE_COOKIE, SESSION_COOKIE } from '@/lib/session';

beforeAll(async () => {
  process.env.AUTH_SECRET = 'test-secret-value-at-least-16-chars-long';
  process.env.GITHUB_CLIENT_ID = 'test-client-id';
  process.env.GITHUB_CLIENT_SECRET = 'test-client-secret';
  await startTestDB();
});
afterAll(async () => {
  await stopTestDB();
  vi.unstubAllGlobals();
});
beforeEach(async () => {
  await clearCollections();
  vi.unstubAllGlobals();
});

function setCookies(res: Response): string[] {
  const anyHeaders = res.headers as Headers & { getSetCookie?: () => string[] };
  return anyHeaders.getSetCookie ? anyHeaders.getSetCookie() : [];
}

describe('GET /auth/github', () => {
  it('302 로 GitHub authorize 로 리다이렉트하고 state 쿠키를 설정', async () => {
    const { GET } = await import('@/app/auth/github/route');
    const res = await GET(new Request('http://localhost:3000/auth/github'));
    expect(res.status).toBe(302);
    const loc = res.headers.get('location') ?? '';
    expect(loc).toContain('https://github.com/login/oauth/authorize');
    expect(loc).toContain('client_id=test-client-id');
    expect(loc).toContain('scope=read%3Auser');
    expect(loc).toMatch(/state=[0-9a-f-]{36}/);

    const cookies = setCookies(res).join('\n');
    expect(cookies).toContain(`${OAUTH_STATE_COOKIE}=`);
    expect(cookies).toContain('HttpOnly');
  });
});

describe('GET /auth/github/callback', () => {
  it('state 불일치 -> /login?error 로 리다이렉트, 세션 쿠키 없음', async () => {
    const { GET } = await import('@/app/auth/github/callback/route');
    const res = await GET(
      new Request('http://localhost:3000/auth/github/callback?code=abc&state=BAD', {
        headers: { cookie: `${OAUTH_STATE_COOKIE}=GOOD` },
      }),
    );
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toContain('/login?error=');
    expect(setCookies(res).join('\n')).not.toContain(`${SESSION_COOKIE}=ey`);
  });

  it('정상 콜백: User upsert + 세션 쿠키 설정 후 / 로 리다이렉트', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const u = typeof input === 'string' ? input : input.toString();
      if (u.includes('login/oauth/access_token')) {
        return new Response(JSON.stringify({ access_token: 'gh_test_token' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (u.includes('api.github.com/user')) {
        return new Response(
          JSON.stringify({ id: 999, login: 'octocat', avatar_url: 'https://x/y.png' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      throw new Error('unexpected fetch ' + u);
    });
    vi.stubGlobal('fetch', fetchMock);

    const { GET } = await import('@/app/auth/github/callback/route');
    const User = (await import('@/models/User')).default;

    const res = await GET(
      new Request('http://localhost:3000/auth/github/callback?code=abc&state=S1', {
        headers: { cookie: `${OAUTH_STATE_COOKIE}=S1` },
      }),
    );

    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('http://localhost:3000/');
    const cookies = setCookies(res).join('\n');
    expect(cookies).toContain(`${SESSION_COOKIE}=`);
    expect(cookies).toContain('HttpOnly');

    const user = await User.findOne({ githubId: '999' }).lean();
    expect(user).not.toBeNull();
    expect((user as { username: string }).username).toBe('octocat');
    expect((user as { avatarUrl: string }).avatarUrl).toBe('https://x/y.png');
  });

  it('두 번째 로그인은 새 User 를 만들지 않고 프로필만 갱신', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const u = typeof input === 'string' ? input : input.toString();
      if (u.includes('access_token'))
        return new Response(JSON.stringify({ access_token: 't' }), { status: 200 });
      return new Response(
        JSON.stringify({ id: 999, login: 'octocat-renamed', avatar_url: 'https://x/z.png' }),
        { status: 200 },
      );
    });
    vi.stubGlobal('fetch', fetchMock);
    const { GET } = await import('@/app/auth/github/callback/route');
    const User = (await import('@/models/User')).default;

    await GET(
      new Request('http://localhost:3000/auth/github/callback?code=a&state=S', {
        headers: { cookie: `${OAUTH_STATE_COOKIE}=S` },
      }),
    );
    await GET(
      new Request('http://localhost:3000/auth/github/callback?code=b&state=S', {
        headers: { cookie: `${OAUTH_STATE_COOKIE}=S` },
      }),
    );

    expect(await User.countDocuments({ githubId: '999' })).toBe(1);
    const user = await User.findOne({ githubId: '999' }).lean();
    expect((user as { username: string }).username).toBe('octocat-renamed');
  });
});

describe('/auth/logout', () => {
  it('세션 쿠키를 Max-Age=0 으로 만료시키고 /login 으로 302', async () => {
    const { GET } = await import('@/app/auth/logout/route');
    const res = await GET(new Request('http://localhost:3000/auth/logout'));
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('http://localhost:3000/login');
    expect(setCookies(res).join('\n')).toMatch(new RegExp(`${SESSION_COOKIE}=;.*Max-Age=0`));
  });
});
