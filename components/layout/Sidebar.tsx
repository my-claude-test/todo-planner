'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import UserMenu from '@/components/layout/UserMenu';

const NAV = [
  { href: '/', label: '대시보드', icon: '📊' },
  { href: '/todos', label: '칸반 보드', icon: '🗂️' },
  { href: '/weekly', label: '주간 계획', icon: '📅' },
  { href: '/goals', label: '1년 목표', icon: '🎯' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--card)] p-4">
      <div className="mb-6 px-2 text-lg font-bold">할일 + 계획</div>
      <nav className="flex flex-col gap-1">
        {NAV.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-[var(--primary)] text-white'
                  : 'text-[var(--foreground)] hover:bg-black/5',
              )}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <UserMenu />
    </aside>
  );
}
