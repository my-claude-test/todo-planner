'use client';

import { useEffect, useState } from 'react';
import { useGoalStore, useWeeklyStore, useTodoStore } from '@/store';
import type { Goal } from '@/types';
import Modal from '@/components/shared/Modal';
import GoalCard from '@/components/goals/GoalCard';
import GoalForm from '@/components/goals/GoalForm';

export default function GoalsPage() {
  const { goals, loading, error, fetchGoals, addGoal, updateGoal, deleteGoal } = useGoalStore();
  const plans = useWeeklyStore((s) => s.plans);
  const fetchRecent = useWeeklyStore((s) => s.fetchRecent);
  const todos = useTodoStore((s) => s.todos);
  const fetchTodos = useTodoStore((s) => s.fetchTodos);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [deleting, setDeleting] = useState<Goal | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    void fetchGoals();
    void fetchRecent(20);
    void fetchTodos();
  }, [fetchGoals, fetchRecent, fetchTodos]);

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const openNew = () => {
    setActionError(null);
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (g: Goal) => {
    setActionError(null);
    setEditing(g);
    setFormOpen(true);
  };

  const handleSubmit = async (v: { title: string; description: string }) => {
    try {
      if (editing) {
        await updateGoal(editing._id, v);
      } else {
        await addGoal(v);
      }
      closeForm();
    } catch (err) {
      setActionError((err as Error).message);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteGoal(deleting._id);
      setDeleting(null);
    } catch (err) {
      setActionError((err as Error).message);
      setDeleting(null);
    }
  };

  const banner = error ?? actionError;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">1년 목표</h2>
        <button
          type="button"
          onClick={openNew}
          className="rounded-lg bg-[var(--primary)] px-3 py-2 text-sm text-white"
        >
          ＋ 새 목표
        </button>
      </div>

      {banner ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {banner}
        </div>
      ) : null}

      {loading ? (
        <div className="text-sm text-[var(--muted)]">불러오는 중…</div>
      ) : goals.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 text-center text-sm text-[var(--muted)]">
          아직 1년 목표가 없습니다. 새 목표를 추가해 보세요.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {goals.map((g) => {
            const goalTodos = todos.filter((t) => t.goalId === g._id);
            const stats = {
              weeklyPlans: plans.filter((p) => p.goalId === g._id).length,
              todos: goalTodos.length,
              doneTodos: goalTodos.filter((t) => t.status === 'done').length,
            };
            return (
              <GoalCard
                key={g._id}
                goal={g}
                stats={stats}
                onEdit={openEdit}
                onDelete={setDeleting}
              />
            );
          })}
        </div>
      )}

      <Modal open={formOpen} title={editing ? '목표 수정' : '새 목표'} onClose={closeForm}>
        <GoalForm initial={editing} onSubmit={handleSubmit} onCancel={closeForm} />
      </Modal>

      <Modal open={deleting !== null} title="목표 삭제" onClose={() => setDeleting(null)}>
        <div className="flex flex-col gap-4">
          <p className="text-sm">
            {deleting?.title} 목표를 삭제할까요? 이 작업은 되돌릴 수 없습니다.
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeleting(null)}
              className="rounded-lg px-3 py-2 text-sm text-[var(--muted)] transition-colors hover:bg-black/5"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-lg bg-red-500 px-3 py-2 text-sm text-white"
            >
              삭제
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
