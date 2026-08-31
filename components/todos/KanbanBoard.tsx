'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { TodoStatus } from '@/types';
import { useTodoStore, useWeeklyStore, useGoalStore } from '@/store';
import { resolveDrop } from '@/lib/kanban';
import { getWeekStart } from '@/lib/utils';
import KanbanColumn from './KanbanColumn';
import TodoCard from './TodoCard';

const COLUMNS: { status: TodoStatus; title: string }[] = [
  { status: 'todo', title: 'To Do' },
  { status: 'doing', title: 'Doing' },
  { status: 'done', title: 'Done' },
];

const STATUS_SET = new Set<TodoStatus>(['todo', 'doing', 'done']);

export default function KanbanBoard() {
  const todos = useTodoStore((s) => s.todos);
  const fetchTodos = useTodoStore((s) => s.fetchTodos);
  const reorderTodo = useTodoStore((s) => s.reorderTodo);
  const byStatus = useTodoStore((s) => s.byStatus);
  const error = useTodoStore((s) => s.error);
  const plans = useWeeklyStore((s) => s.plans);
  const fetchRecentPlans = useWeeklyStore((s) => s.fetchRecent);
  const fetchGoals = useGoalStore((s) => s.fetchGoals);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    void fetchTodos();
    // 카드 수정 모달의 "주간 계획 / 1년 목표 연결" 셀렉트용 옵션
    void fetchRecentPlans(8);
    void fetchGoals();
  }, [fetchTodos, fetchRecentPlans, fetchGoals]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const columns = useMemo(
    () => COLUMNS.map((c) => ({ ...c, items: byStatus(c.status) })),
    // byStatus derives from todos; re-run when todos changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [todos],
  );

  // 빠른 추가로 만든 카드를 이번 주 계획에 자동 연결하기 위한 현재 주 계획
  const currentPlan = useMemo(
    () =>
      plans.find(
        (p) => getWeekStart(new Date(p.weekStart)).getTime() === getWeekStart().getTime(),
      ) ?? null,
    [plans],
  );

  const activeTodo = activeId ? todos.find((t) => t._id === activeId) ?? null : null;

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  async function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;

    const activeTodoId = String(active.id);
    const target = resolveDrop(todos, activeTodoId, String(over.id), STATUS_SET);
    if (!target) return;

    try {
      await reorderTodo({ id: activeTodoId, ...target });
    } catch {
      /* 스토어가 롤백 + error 세팅 */
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto">
          {columns.map((col) => (
            <KanbanColumn
              key={col.status}
              status={col.status}
              title={col.title}
              todos={col.items}
              weeklyPlanId={currentPlan?._id ?? null}
              goalId={currentPlan?.goalId ?? null}
            />
          ))}
        </div>
        <DragOverlay>{activeTodo ? <TodoCard todo={activeTodo} /> : null}</DragOverlay>
      </DndContext>
    </div>
  );
}
