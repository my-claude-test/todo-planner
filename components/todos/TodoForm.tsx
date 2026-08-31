'use client';

import { useState } from 'react';
import type { Priority, Todo, CreateTodoInput } from '@/types';
import { isPastDue } from '@/lib/utils';

interface Props {
  initial?: Todo | null;
  weeklyPlans?: { _id: string; label: string }[];
  goals?: { _id: string; title: string }[];
  onSubmit: (v: CreateTodoInput) => Promise<void>;
  onCancel: () => void;
}

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

/** 0(일)~6(토) — 표시는 월요일 시작 */
const DAYS: { value: number; label: string }[] = [
  { value: 1, label: '월' },
  { value: 2, label: '화' },
  { value: 3, label: '수' },
  { value: 4, label: '목' },
  { value: 5, label: '금' },
  { value: 6, label: '토' },
  { value: 0, label: '일' },
];

function toDateInput(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

export default function TodoForm({
  initial,
  weeklyPlans = [],
  goals = [],
  onSubmit,
  onCancel,
}: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? 'medium');
  const [dueDate, setDueDate] = useState(toDateInput(initial?.dueDate));
  const [dayOfWeek, setDayOfWeek] = useState(
    typeof initial?.dayOfWeek === 'number' ? String(initial.dayOfWeek) : '',
  );
  const [weeklyPlanId, setWeeklyPlanId] = useState(initial?.weeklyPlanId ?? '');
  const [goalId, setGoalId] = useState(initial?.goalId ?? '');
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const dueWarning = dueDate && isPastDue(new Date(dueDate));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setErr('제목을 입력하세요');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        dayOfWeek: dayOfWeek === '' ? null : Number(dayOfWeek),
        weeklyPlanId: weeklyPlanId || null,
        goalId: goalId || null,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--muted)]">제목</label>
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (err) setErr('');
          }}
          className="w-full rounded-md border border-[var(--border)] px-2.5 py-1.5 text-sm outline-none focus:border-[var(--primary)]"
          autoFocus
        />
        {err ? <p className="mt-1 text-xs text-red-500">{err}</p> : null}
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--muted)]">설명</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full resize-none rounded-md border border-[var(--border)] px-2.5 py-1.5 text-sm outline-none focus:border-[var(--primary)]"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--muted)]">우선순위</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            className="w-full rounded-md border border-[var(--border)] px-2.5 py-1.5 text-sm outline-none focus:border-[var(--primary)]"
          >
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--muted)]">마감일</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full rounded-md border border-[var(--border)] px-2.5 py-1.5 text-sm outline-none focus:border-[var(--primary)]"
          />
          {dueWarning ? (
            <p className="mt-1 text-xs text-red-500">오늘 이전 날짜입니다</p>
          ) : null}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--muted)]">요일</label>
        <select
          value={dayOfWeek}
          onChange={(e) => setDayOfWeek(e.target.value)}
          className="w-full rounded-md border border-[var(--border)] px-2.5 py-1.5 text-sm outline-none focus:border-[var(--primary)]"
        >
          <option value="">미지정</option>
          {DAYS.map((d) => (
            <option key={d.value} value={String(d.value)}>
              {d.label}
            </option>
          ))}
        </select>
      </div>

      {weeklyPlans.length > 0 ? (
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--muted)]">주간 계획 연결</label>
          <select
            value={weeklyPlanId}
            onChange={(e) => setWeeklyPlanId(e.target.value)}
            className="w-full rounded-md border border-[var(--border)] px-2.5 py-1.5 text-sm outline-none focus:border-[var(--primary)]"
          >
            <option value="">연결 안 함</option>
            {weeklyPlans.map((w) => (
              <option key={w._id} value={w._id}>
                {w.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {goals.length > 0 ? (
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--muted)]">1년 목표 연결</label>
          <select
            value={goalId}
            onChange={(e) => setGoalId(e.target.value)}
            className="w-full rounded-md border border-[var(--border)] px-2.5 py-1.5 text-sm outline-none focus:border-[var(--primary)]"
          >
            <option value="">연결 안 함</option>
            {goals.map((g) => (
              <option key={g._id} value={g._id}>
                {g.title}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="mt-1 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-[var(--primary)] px-3 py-1.5 text-sm text-white disabled:opacity-40"
        >
          {initial ? '저장' : '추가'}
        </button>
      </div>
    </form>
  );
}
