'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useWeeklyStore, useTodoStore, useGoalStore } from '@/store';
import { percent, formatWeekRange, countByStatus } from '@/lib/utils';
import ProgressBar from '@/components/weekly/ProgressBar';
import WeeklyGoalItem from '@/components/weekly/WeeklyGoalItem';
import type { TodoStatus } from '@/types';

const STATUS_META: { key: TodoStatus; label: string }[] = [
  { key: 'todo', label: 'To Do' },
  { key: 'doing', label: 'Doing' },
  { key: 'done', label: 'Done' },
];

export default function DashboardPage() {
  const { current, loading, error, fetchCurrentWeek, toggleGoal } = useWeeklyStore();
  const { todos, fetchTodos } = useTodoStore();
  const { goals, fetchGoals } = useGoalStore();

  useEffect(() => {
    void fetchCurrentWeek();
    void fetchTodos();
    void fetchGoals();
  }, [fetchCurrentWeek, fetchTodos, fetchGoals]);

  if (loading && !current) {
    return <div className="text-sm text-[var(--muted)]">불러오는 중…</div>;
  }

  // 주간 계획에 연결된 할 일 (캡션 + 1년 목표 섹션용). 계획이 없으면 빈 배열.
  const weekTodos = current ? todos.filter((t) => t.weeklyPlanId === current._id) : [];

  const statusSection = (
    <div className="flex flex-col gap-2">
      <section className="grid grid-cols-3 gap-3">
        {STATUS_META.map((s) => (
          <div
            key={s.key}
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-center"
          >
            <div className="text-2xl font-bold">{countByStatus(todos, s.key)}</div>
            <div className="text-xs text-[var(--muted)]">{s.label}</div>
          </div>
        ))}
      </section>
      <p className="text-xs text-[var(--muted)]">
        이번 주 계획에 연결된 할 일 {weekTodos.length}개
      </p>
    </div>
  );

  if (!current) {
    return (
      <div className="flex flex-col gap-6">
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        ) : null}
        {statusSection}
        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)] p-8">
          <p className="text-sm text-[var(--muted)]">
            {error ? '데이터를 불러오지 못했습니다.' : '이번 주 계획이 아직 없습니다.'}
          </p>
          <Link
            href="/weekly"
            className="rounded-md bg-[var(--primary)] px-3 py-1.5 text-sm text-white"
          >
            이번 주 계획 만들기
          </Link>
        </div>
      </div>
    );
  }

  const doneGoals = current.goals.filter((g) => g.done).length;
  const weeklyPct = percent(doneGoals, current.goals.length);

  return (
    <div className="flex flex-col gap-6">
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      ) : null}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">이번 주 · {formatWeekRange(current.weekStart)}</h2>
          <Link href={`/weekly/${current._id}`} className="text-xs text-[var(--primary)]">
            상세 보기 →
          </Link>
        </div>
        <ProgressBar value={weeklyPct} label="주간 목표 진행률" />
        <ul className="mt-3 flex flex-col gap-1">
          {current.goals.length === 0 ? (
            <li className="text-sm text-[var(--muted)]">등록된 주간 목표가 없습니다.</li>
          ) : (
            current.goals.map((item) =>
              item._id ? (
                <WeeklyGoalItem
                  key={item._id}
                  item={item}
                  onToggle={(done) => {
                    // 실패 시 스토어가 롤백 + error 세팅 → 상단 배너로 노출
                    void toggleGoal(current._id, item._id as string, done).catch(() => {});
                  }}
                />
              ) : null,
            )
          )}
        </ul>
      </section>

      {statusSection}

      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        <h2 className="mb-3 text-sm font-semibold">1년 목표별 이번 주 할 일</h2>
        {goals.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">등록된 1년 목표가 없습니다.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {goals.map((g) => {
              const linked = weekTodos.filter((t) => t.goalId === g._id).length;
              return (
                <li key={g._id} className="flex items-center justify-between text-sm">
                  <span>{g.title}</span>
                  <span className="text-[var(--muted)]">{linked}개</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
