import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/session';

interface LoginPageProps {
  searchParams: { error?: string | string[] };
}

/** GET /login — 로그인 화면. 이미 로그인했으면 대시보드로 보낸다. (셸 밖에서 렌더) */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const token = cookies().get(SESSION_COOKIE)?.value;
  let authed = false;
  try {
    authed = Boolean(await verifySessionToken(token));
  } catch {
    authed = false;
  }
  if (authed) redirect('/');

  const hasError = searchParams.error != null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 text-center">
        <h1 className="text-xl font-bold text-[var(--foreground)]">할일 + 계획 관리</h1>
        <p className="text-sm text-[var(--muted)]">
          GitHub 계정으로 로그인하면 내 할 일과 계획만 안전하게 관리할 수 있어요.
        </p>
        {hasError ? (
          <p className="text-sm text-red-600">로그인에 실패했습니다. 다시 시도해 주세요.</p>
        ) : null}
        <a
          href="/auth/github"
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            width={18}
            height={18}
            fill="currentColor"
          >
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
          </svg>
          GitHub로 로그인
        </a>
      </div>
    </div>
  );
}
