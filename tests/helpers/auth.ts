import User, { type UserDoc } from '@/models/User';
import { SESSION_COOKIE, createSessionToken } from '@/lib/session';

/** 모든 테스트가 공유하는 AUTH_SECRET (최소 16자) */
export const TEST_AUTH_SECRET = 'test-secret-value-at-least-16-chars-long';

/** beforeAll 에서 호출해 세션 서명 키를 고정한다. */
export function useTestAuthSecret(): void {
  process.env.AUTH_SECRET = TEST_AUTH_SECRET;
}

/** 테스트용 User 문서를 하나 만든다. */
export async function createTestUser(username = 'tester', githubId = '1001'): Promise<UserDoc> {
  const user = await User.create({ githubId, username, avatarUrl: '' });
  return user as UserDoc;
}

/** 해당 사용자로 로그인한 상태를 나타내는 Cookie 헤더 문자열을 만든다. */
export async function sessionCookie(user: UserDoc): Promise<string> {
  const token = await createSessionToken({
    uid: String(user._id),
    githubId: String(user.githubId),
    username: String(user.username),
  });
  return `${SESSION_COOKIE}=${token}`;
}

/** 사용자를 만들고 그 쿠키까지 한 번에 돌려준다. */
export async function createUserWithCookie(
  username = 'tester',
  githubId = '1001',
): Promise<{ user: UserDoc; cookie: string }> {
  const user = await createTestUser(username, githubId);
  return { user, cookie: await sessionCookie(user) };
}
