'use client';

import { usePathname } from 'next/navigation';

const TITLES: Record<string, string> = {
  '/': '대시보드',
  '/todos': '칸반 보드',
  '/weekly': '주간 계획',
  '/goals': '1년 목표',
};

export default function Header() {
  const pathname = usePathname();
  const title =
    TITLES[pathname] ??
    (pathname.startsWith('/weekly') ? '주간 계획' : pathname.startsWith('/goals') ? '1년 목표' : '');

  return (
    <header className="flex h-14 shrink-0 items-center border-b border-[var(--border)] bg-[var(--card)] px-6">
      <h1 className="text-base font-semibold">{title}</h1>
    </header>
  );
}
