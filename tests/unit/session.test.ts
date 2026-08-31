import { describe, it, expect, beforeAll } from 'vitest';
import {
  createSessionToken,
  verifySessionToken,
  sessionCookieHeader,
  clearCookieHeader,
  SESSION_COOKIE,
} from '@/lib/session';

const PAYLOAD = { uid: '64b7f9a2f1a2c3d4e5f60718', githubId: '12345', username: 'octocat' };

beforeAll(() => {
  process.env.AUTH_SECRET = 'test-secret-value-at-least-16-chars-long';
});

describe('session token', () => {
  it('서명 후 verify 왕복 성공', async () => {
    const token = await createSessionToken(PAYLOAD);
    const out = await verifySessionToken(token);
    expect(out).toEqual(PAYLOAD);
  });

  it('변조된 토큰 -> null', async () => {
    const token = await createSessionToken(PAYLOAD);
    const tampered = token.slice(0, -3) + 'abc';
    expect(await verifySessionToken(tampered)).toBeNull();
  });

  it('만료된 토큰 -> null', async () => {
    const token = await createSessionToken(PAYLOAD, -10); // 이미 만료
    expect(await verifySessionToken(token)).toBeNull();
  });

  it('다른 AUTH_SECRET 로 검증하면 null', async () => {
    const token = await createSessionToken(PAYLOAD);
    process.env.AUTH_SECRET = 'a-completely-different-secret-value-16';
    const out = await verifySessionToken(token);
    process.env.AUTH_SECRET = 'test-secret-value-at-least-16-chars-long';
    expect(out).toBeNull();
  });

  it('undefined/빈 토큰 -> null', async () => {
    expect(await verifySessionToken(undefined)).toBeNull();
    expect(await verifySessionToken('')).toBeNull();
    expect(await verifySessionToken('not-a-jwt')).toBeNull();
  });

  it('AUTH_SECRET 미설정 시 서명은 에러', async () => {
    const prev = process.env.AUTH_SECRET;
    delete process.env.AUTH_SECRET;
    await expect(createSessionToken(PAYLOAD)).rejects.toThrow(/AUTH_SECRET/);
    process.env.AUTH_SECRET = prev;
  });
});

describe('cookie headers', () => {
  it('sessionCookieHeader 는 HttpOnly + SameSite=Lax + Path=/ + Max-Age 포함', () => {
    const h = sessionCookieHeader('abc.def.ghi', 3600);
    expect(h).toContain(`${SESSION_COOKIE}=abc.def.ghi`);
    expect(h).toContain('HttpOnly');
    expect(h).toContain('SameSite=Lax');
    expect(h).toContain('Path=/');
    expect(h).toContain('Max-Age=3600');
  });

  it('clearCookieHeader 는 Max-Age=0', () => {
    expect(clearCookieHeader(SESSION_COOKIE)).toContain('Max-Age=0');
  });
});
