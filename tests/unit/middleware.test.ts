import { describe, it, expect, beforeAll } from 'vitest';
import { createSessionToken, shouldRedirectToLogin } from '@/lib/session';

const PAYLOAD = { uid: '64b7f9a2f1a2c3d4e5f60718', githubId: '12345', username: 'octocat' };

beforeAll(() => {
  process.env.AUTH_SECRET = 'test-secret-value-at-least-16-chars-long';
});

describe('shouldRedirectToLogin (미들웨어 리다이렉트 결정)', () => {
  it('유효한 서명 토큰 -> false (통과)', async () => {
    const token = await createSessionToken(PAYLOAD);
    expect(await shouldRedirectToLogin(token)).toBe(false);
  });

  it('토큰 없음(undefined) -> true (리다이렉트)', async () => {
    expect(await shouldRedirectToLogin(undefined)).toBe(true);
  });

  it('쓰레기 문자열 토큰 -> true', async () => {
    expect(await shouldRedirectToLogin('garbage.token.value')).toBe(true);
  });

  it('만료된 토큰 -> true', async () => {
    const token = await createSessionToken(PAYLOAD, -10);
    expect(await shouldRedirectToLogin(token)).toBe(true);
  });
});
