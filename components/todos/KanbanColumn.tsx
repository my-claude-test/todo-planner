'use client';

import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Todo, TodoStatus } from '@/types';
import { useTodoStore } from '@/store';
import TodoCard from './TodoCard';

interface Props {
  status: TodoStatus;
  title: string;
  todos: Todo[];
  weeklyPlanId?: string | null;
  goalId?: string | null;
}

export default function KanbanColumn({ status, title, todos, weeklyPlanId, goalId }: Props) {
  const addTodo = useTodoStore((s) => s.addTodo);
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);

  async function submit() {
    const title = draft.trim();
    if (!title) return;
    setAdding(true);
    try {
      await addTodo({ title, status, weeklyPlanId: weeklyPlanId ?? null, goalId: goalId ?? null });
      setDraft('');
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col rounded-xl bg-black/[0.03] p-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="text-xs text-[var(--muted)]">{todos.length}</span>
      </div>

      <div
        ref={setNodeRef}
        className={`flex min-h-[60px] flex-1 flex-col gap-2 rounded-lg p-1 transition-colors ${
          isOver ? 'bg-[var(--primary)]/10' : ''
        }`}
      >
        <SortableContext items={todos.map((t) => t._id)} strategy={verticalListSortingStrategy}>
          {todos.map((todo) => (
            <TodoCard key={todo._id} todo={todo} />
          ))}
        </SortableContext>
      </div>

      <div className="mt-2 flex gap-1">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submit();
          }}
          placeholder="＋ 할 일 추가"
          className="flex-1 rounded-md border border-[var(--border)] bg-[var(--card)] px-2 py-1.5 text-sm outline-none focus:border-[var(--primary)]"
        />
        <button
          type="button"
          onClick={() => void submit()}
          disabled={adding || !draft.trim()}
          className="rounded-md bg-[var(--primary)] px-2.5 py-1.5 text-sm text-white disabled:opacity-40"
        >
          추가
        </button>
      </div>
    </div>
  );
}
