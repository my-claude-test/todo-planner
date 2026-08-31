'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useWeeklyStore, useTodoStore, useGoalStore } from '@/store';
import { formatWeekRange, percent } from '@/lib/utils';
import ProgressBar from '@/components/weekly/ProgressBar';
import WeeklyGoalItem from '@/components/weekly/WeeklyGoalItem';
import WeekGrid from '@/components/weekly/WeekGrid';

export default function WeeklyDetailPage() {
  const params = useParams();
  const id =
    typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';

  const { current, loading, error, fetchById, toggleGoal, updateWeekly } = useWeeklyStore();
  const { todos, fetchTodos } = useTodoStore();
  const goals = useGoalStore((s) => s.goals);
  const fetchGoals = useGoalStore((s) => s.fetchGoals);

  const [memo, setMemo] = useState('');
  const [savingMemo, setSavingMemo] = useState(false);
  const [retro, setRetro] = useState('');
  const [savingRetro, setSavingRetro] = useState(false);

  useEffect(() => {
    if (!id) return;
    void fetchById(id);
    void fetchTodos();
    void fetchGoals();
  }, [id, fetchById, fetchTodos, fetchGoals]);

  const plan = current && current._id === id ? current : null;

  useEffect(() => {
    if (plan) {
      setMemo(plan.memo);
      setRetro(plan.retrospective);
    }
  }, [plan]);

  const handleSaveMemo = async () => {
    if (!plan) return;
    setSavingMemo(true);
    try {
      await updateWeekly(plan._id, { memo });
    } catch {
      /* 스토어가 롤백 + error 세팅 → 상단 배너로 노출 */
    } finally {
      setSavingMemo(false);
    }
  };

  const handleChangeGoal = async (value: string) => {
    if (!plan) return;
    try {
      await updateWeekly(plan._id, { goalId: value || null });
    } catch {
      /* 스토어가 롤백 + error 세팅 → 상단 배너로 노출 */
    }
  };

  const handleSaveRetro = async () => {
    if (!plan) return;
    setSavingRetro(true);
    try {
      await updateWeekly(plan._id, { retrospective: retro });
    } catch {
      /* 스토어가 롤백 + error 세팅 → 상단 배너로 노출 */
    } finally {
      setSavingRetro(false);
    }
  };

  if (loading && !plan) {
    return <div className="text-sm text-[var(--muted)]">불러오는 중…</div>;
  }

  if (!plan) {
    return (
      <div className="text-sm text-[var(--muted)]">
        {error ?? '주간 계획을 찾을 수 없습니다.'}
      </div>
    );
  }

  const doneCount = plan.goals.filter((g) => g.done).length;
  const planTodos = todos.filter((t) => t.weeklyPlanId === id);
  const planTodosDone = planTodos.filter((t) => t.status === 'done').length;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <h2 className="text-lg font-semibold">{formatWeekRange(plan.weekStart)}</h2>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      <section className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">1년 목표 연결</span>
          <select
            value={plan.goalId ?? ''}
            onChange={(e) => void handleChangeGoal(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
          >
            <option value="">연결 안 함</option>
            {goals.map((g) => (
              <option key={g._id} value={g._id}>
                {g.title}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-[var(--muted)]">
          이번 주 할 일 {planTodos.length}개 · 완료 {planTodosDone}개
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">주간 목표</h3>
          <span className="text-xs text-[var(--muted)]">
            {doneCount}/{plan.goals.length}
          </span>
        </div>
        <ProgressBar value={percent(doneCount, plan.goals.length)} />
        <div className="flex flex-col divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-[var(--card)] px-3">
          {plan.goals.length === 0 ? (
            <p className="py-3 text-sm text-[var(--muted)]">등록된 주간 목표가 없습니다.</p>
          ) : (
            plan.goals.map((item, idx) => (
              <WeeklyGoalItem
                key={item._id ?? idx}
                item={item}
                onToggle={(done) => {
                  // 실패 시 스토어가 롤백 + error 세팅 → 상단 배너로 노출
                  if (item._id) void toggleGoal(id, item._id, done).catch(() => {});
                }}
              />
            ))
          )}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">메모</h3>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={4}
          className="resize-y rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
        />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSaveMemo}
            disabled={savingMemo || memo === plan.memo}
            className="rounded-lg bg-[var(--primary)] px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            저장
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">주간 회고</h3>
        <textarea
          value={retro}
          onChange={(e) => setRetro(e.target.value)}
          rows={4}
          placeholder="이번 주를 돌아보며…"
          className="resize-y rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
        />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSaveRetro}
            disabled={savingRetro || retro === plan.retrospective}
            className="rounded-lg bg-[var(--primary)] px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            저장
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">주간 보드</h3>
        <WeekGrid todos={planTodos} />
      </section>
    </div>
  );
}
