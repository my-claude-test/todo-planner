import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE, shouldRedirectToLogin } from '@/lib/session';

/**
 * Edge 미들웨어: todo_session 쿠키를 검증한다.
 * 유효하지 않으면 /login 으로 리다이렉트, 유효하면 그대로 통과.
 * Mongoose / lib/auth 는 Edge 에서 못 쓰므로 lib/session 만 사용한다.
 */
export async function middleware(req: NextRequest): Promise<NextResponse> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (await shouldRedirectToLogin(token)) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  return NextResponse.next();
}

export const config = {
  // 제외: API(자체 401), _next 정적/이미지, /login, /auth/*(로그아웃 상태에서 접근 가능해야 함),
  // favicon 및 정적 파일 확장자. 그 외(/, /todos, /weekly, /weekly/<id>, /goals)는 미들웨어를 탄다.
  matcher: [
    '/((?!api|_next/static|_next/image|login|auth|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf)$).*)',
  ],
};
