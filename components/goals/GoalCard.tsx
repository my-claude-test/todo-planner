'use client';

import type { Goal } from '@/types';

interface GoalCardProps {
  goal: Goal;
  stats?: { weeklyPlans: number; todos: number; doneTodos: number };
  onEdit: (g: Goal) => void;
  onDelete: (g: Goal) => void;
}

export default function GoalCard({ goal, stats, onEdit, onDelete }: GoalCardProps) {
  const progress = Math.max(0, Math.min(100, goal.progress));

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold">{goal.title}</h3>
        <div className="flex shrink-0 gap-2 text-sm">
          <button
            type="button"
            onClick={() => onEdit(goal)}
            className="text-[var(--primary)] hover:underline"
          >
            수정
          </button>
          <button
            type="button"
            onClick={() => onDelete(goal)}
            className="text-red-500 hover:underline"
          >
            삭제
          </button>
        </div>
      </div>

      {goal.description ? (
        <p className="whitespace-pre-wrap text-sm text-[var(--muted)]">{goal.description}</p>
      ) : null}

      <div className="flex items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--border)]">
          <div
            className="h-full rounded-full bg-[var(--primary)]"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="shrink-0 text-right text-xs text-[var(--muted)]">
          {goal.progress}%{stats ? ` (${stats.doneTodos}/${stats.todos})` : ''}
        </span>
      </div>

      {stats ? (
        <p className="text-xs text-[var(--muted)]">
          주간계획 {stats.weeklyPlans} · 할 일 {stats.doneTodos}/{stats.todos}
        </p>
      ) : null}
    </div>
  );
}
