'use client';

import { useState } from 'react';
import type { Goal } from '@/types';
import { getWeekStart } from '@/lib/utils';

interface WeeklyPlanFormProps {
  goalsOptions: Goal[];
  onSubmit: (v: {
    weekStart: string;
    goals: { text: string }[];
    memo: string;
    goalId: string | null;
  }) => Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
}

const MAX_GOALS = 5;

function defaultWeekStartInput(): string {
  const d = getWeekStart();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function WeeklyPlanForm({
  goalsOptions,
  onSubmit,
  onCancel,
  submitting = false,
}: WeeklyPlanFormProps) {
  const [weekStart, setWeekStart] = useState(defaultWeekStartInput());
  const [goalRows, setGoalRows] = useState<string[]>(['']);
  const [memo, setMemo] = useState('');
  const [goalId, setGoalId] = useState('');

  const setRow = (idx: number, value: string) =>
    setGoalRows((prev) => prev.map((g, i) => (i === idx ? value : g)));

  const addRow = () =>
    setGoalRows((prev) => (prev.length >= MAX_GOALS ? prev : [...prev, '']));

  const removeRow = (idx: number) =>
    setGoalRows((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      weekStart: getWeekStart(new Date(weekStart)).toISOString(),
      goals: goalRows
        .map((t) => t.trim())
        .filter(Boolean)
        .map((text) => ({ text })),
      memo: memo.trim(),
      goalId: goalId || null,
    });
  };

  const atMax = goalRows.length >= MAX_GOALS;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">주 시작일</span>
        <input
          type="date"
          value={weekStart}
          onChange={(e) => setWeekStart(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
        />
      </label>

      <div className="flex flex-col gap-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="font-medium">주간 목표</span>
          <button
            type="button"
            onClick={addRow}
            disabled={atMax}
            className="text-xs text-[var(--primary)] disabled:text-[var(--muted)]"
          >
            {atMax ? '최대 5개' : '＋ 추가'}
          </button>
        </div>
        {goalRows.map((row, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input
              type="text"
              value={row}
              onChange={(e) => setRow(idx, e.target.value)}
              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
            />
            <button
              type="button"
              onClick={() => removeRow(idx)}
              disabled={goalRows.length === 1}
              aria-label="목표 삭제"
              className="rounded-md px-2 py-1 text-[var(--muted)] transition-colors hover:bg-black/5 disabled:opacity-40"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">메모</span>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={3}
          className="resize-y rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">1년 목표 연결</span>
        <select
          value={goalId}
          onChange={(e) => setGoalId(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
        >
          <option value="">연결 안 함</option>
          {goalsOptions.map((g) => (
            <option key={g._id} value={g._id}>
              {g.title}
            </option>
          ))}
        </select>
      </label>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-2 text-sm text-[var(--muted)] transition-colors hover:bg-black/5"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-[var(--primary)] px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          저장
        </button>
      </div>
    </form>
  );
}
