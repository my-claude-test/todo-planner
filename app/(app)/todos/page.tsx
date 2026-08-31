'use client';

import dynamic from 'next/dynamic';

const KanbanBoard = dynamic(() => import('@/components/todos/KanbanBoard'), {
  ssr: false,
  loading: () => <div className="text-sm text-[var(--muted)]">보드 불러오는 중…</div>,
});

export default function TodosPage() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-[var(--muted)]">
        카드를 끌어 To Do → Doing → Done 으로 옮기세요. 상태와 순서는 자동 저장됩니다.
      </p>
      <KanbanBoard />
    </div>
  );
}
