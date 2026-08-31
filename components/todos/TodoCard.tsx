'use client';

import { useMemo, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CreateTodoInput, Todo } from '@/types';
import { cn, isPastDue, formatWeekRange } from '@/lib/utils';
import { useTodoStore, useWeeklyStore, useGoalStore } from '@/store';
import PriorityBadge from '@/components/shared/PriorityBadge';
import Modal from '@/components/shared/Modal';
import TodoForm from './TodoForm';

function formatDue(due: string): string {
  const d = new Date(due);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${m}/${day}`;
}

export default function TodoCard({ todo }: { todo: Todo }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: todo._id,
  });
  const updateTodo = useTodoStore((s) => s.updateTodo);
  const deleteTodo = useTodoStore((s) => s.deleteTodo);
  const plans = useWeeklyStore((s) => s.plans);
  const goals = useGoalStore((s) => s.goals);

  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const weeklyPlans = useMemo(
    () => plans.map((p) => ({ _id: p._id, label: formatWeekRange(p.weekStart) })),
    [plans],
  );
  const goalOptions = useMemo(
    () => goals.map((g) => ({ _id: g._id, title: g.title })),
    [goals],
  );

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };
  const overdue = isPastDue(todo.dueDate ?? null);

  function close() {
    setOpen(false);
    setConfirming(false);
  }

  async function handleSubmit(v: CreateTodoInput) {
    try {
      await updateTodo(todo._id, v);
      close();
    } catch {
      /* 스토어가 롤백 + error 세팅 */
    }
  }

  async function handleDelete() {
    try {
      await deleteTodo(todo._id);
      close();
    } catch {
      /* 스토어가 롤백 + error 세팅 */
    }
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={cn(
          'cursor-grab rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm',
          'active:cursor-grabbing',
          isDragging && 'opacity-40',
        )}
      >
        <div className="mb-1.5 flex items-start justify-between gap-2">
          <span className="text-sm font-medium leading-snug">{todo.title}</span>
          <div className="flex shrink-0 items-center gap-1">
            <PriorityBadge priority={todo.priority} />
            <button
              type="button"
              aria-label="할 일 수정"
              // dnd-kit 의 포인터/키보드 드래그 활성화가 이 버튼을 가로채지 않도록 끊는다
              onPointerDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') e.stopPropagation();
              }}
              onClick={() => setOpen(true)}
              className="rounded-md px-1 text-[var(--muted)] transition-colors hover:bg-black/5"
            >
              ⋯
            </button>
          </div>
        </div>
        {todo.dueDate ? (
          <div className={cn('text-[11px]', overdue ? 'font-semibold text-red-500' : 'text-[var(--muted)]')}>
            마감 {formatDue(todo.dueDate)}
            {overdue ? ' · 지남' : ''}
          </div>
        ) : null}
      </div>

      <Modal open={open} title="할 일 수정" onClose={close}>
        <div className="flex flex-col gap-3">
          <TodoForm
            initial={todo}
            weeklyPlans={weeklyPlans}
            goals={goalOptions}
            onSubmit={handleSubmit}
            onCancel={close}
          />
          <div className="flex items-center justify-between border-t border-[var(--border)] pt-3">
            {confirming ? (
              <>
                <span className="text-xs text-[var(--muted)]">정말 삭제할까요?</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirming(false)}
                    className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete()}
                    className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white"
                  >
                    삭제 확인
                  </button>
                </div>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600"
              >
                삭제
              </button>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
