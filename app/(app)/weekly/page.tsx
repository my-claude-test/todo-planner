'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useWeeklyStore, useGoalStore } from '@/store';
import { formatWeekRange, percent } from '@/lib/utils';
import Modal from '@/components/shared/Modal';
import ProgressBar from '@/components/weekly/ProgressBar';
import WeeklyPlanForm from '@/components/weekly/WeeklyPlanForm';

export default function WeeklyPage() {
  const { plans, loading, error, fetchRecent, addWeekly } = useWeeklyStore();
  const { goals, fetchGoals } = useGoalStore();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    void fetchRecent(4);
    void fetchGoals();
  }, [fetchRecent, fetchGoals]);

  const handleSubmit = async (v: {
    weekStart: string;
    goals: { text: string }[];
    memo: string;
    goalId: string | null;
  }) => {
    setSubmitting(true);
    setFormError(null);
    try {
      await addWeekly({
        weekStart: v.weekStart,
        goals: v.goals.map((g) => ({ text: g.text, done: false })),
        memo: v.memo,
        goalId: v.goalId,
      });
      setOpen(false);
    } catch (err) {
      const e = err as Error & { status?: number };
      setFormError(e.status === 409 ? '해당 주의 계획이 이미 존재합니다.' : e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">주간 계획</h2>
        <button
          type="button"
          onClick={() => {
            setFormError(null);
            setOpen(true);
          }}
          className="rounded-lg bg-[var(--primary)] px-3 py-2 text-sm text-white"
        >
          ＋ 이번 주 계획
        </button>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="text-sm text-[var(--muted)]">불러오는 중…</div>
      ) : plans.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 text-center text-sm text-[var(--muted)]">
          아직 주간 계획이 없습니다. 이번 주 계획을 추가해 보세요.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {plans.map((plan) => {
            const doneCount = plan.goals.filter((g) => g.done).length;
            const goalTitle = plan.goalId
              ? goals.find((g) => g._id === plan.goalId)?.title
              : undefined;
            return (
              <Link
                key={plan._id}
                href={`/weekly/${plan._id}`}
                className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 transition-colors hover:border-[var(--primary)]"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{formatWeekRange(plan.weekStart)}</span>
                  <span className="text-xs text-[var(--muted)]">
                    목표 {doneCount}/{plan.goals.length}
                  </span>
                </div>
                {goalTitle ? (
                  <span className="text-xs text-[var(--muted)]">🎯 {goalTitle}</span>
                ) : null}
                {plan.memo ? (
                  <span className="truncate text-xs text-[var(--muted)]">{plan.memo}</span>
                ) : null}
                <ProgressBar value={percent(doneCount, plan.goals.length)} />
              </Link>
            );
          })}
        </div>
      )}

      <Modal open={open} title="이번 주 계획" onClose={() => setOpen(false)}>
        <div className="flex flex-col gap-3">
          {formError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {formError}
            </div>
          ) : null}
          <WeeklyPlanForm
            goalsOptions={goals}
            onSubmit={handleSubmit}
            onCancel={() => setOpen(false)}
            submitting={submitting}
          />
        </div>
      </Modal>
    </div>
  );
}
