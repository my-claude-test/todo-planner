'use client';

import { useEffect, useState } from 'react';

interface Me {
  username: string;
  avatarUrl: string;
}

/** 셸 푸터용: /api/me 를 마운트 시 조회해 아바타 + username + 로그아웃 링크를 렌더한다.
 *  로딩 중이거나 401(미인증)이면 아무것도 그리지 않는다. */
export default function UserMenu() {
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/me')
      .then((res) => (res.ok ? (res.json() as Promise<Me>) : null))
      .then((data) => {
        if (!cancelled) setMe(data);
      })
      .catch(() => {
        if (!cancelled) setMe(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!me) return null;

  return (
    <div className="mt-auto flex items-center gap-2 border-t border-[var(--border)] pt-3">
      {me.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- 작은 아바타(28px), next/image 불필요
        <img
          src={me.avatarUrl}
          alt={me.username}
          width={28}
          height={28}
          className="h-7 w-7 shrink-0 rounded-full"
        />
      ) : null}
      <span className="min-w-0 flex-1 truncate text-sm text-[var(--foreground)]">{me.username}</span>
      <a
        href="/auth/logout"
        className="shrink-0 text-xs text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
      >
        로그아웃
      </a>
    </div>
  );
}
