import { describe, it, expect } from 'vitest';
import { resolveDrop } from '@/lib/kanban';
import { orderForInsert } from '@/lib/fractionalIndex';
import { sortByOrder } from '@/store/todoSlice';
import type { Todo, TodoStatus } from '@/types';

const STATUS_SET = new Set<TodoStatus>(['todo', 'doing', 'done']);

function mk(id: string, order: string, status: TodoStatus = 'todo'): Todo {
  return {
    _id: id,
    title: id,
    status,
    priority: 'medium',
    order,
    createdAt: '',
    updatedAt: '',
  };
}

/** A,B,C,D — 화면 표시 순서와 동일 (order 사전순) */
const A = mk('A', 'a0');
const B = mk('B', 'a1');
const C = mk('C', 'a2');
const D = mk('D', 'a3');
const COLUMN = [A, B, C, D];

/** resolveDrop 결과를 스토어와 동일한 방식으로 적용해 최종 표시 순서를 만든다. */
function applyDrop(todos: Todo[], activeId: string, overId: string): string[] {
  const target = resolveDrop(todos, activeId, overId, STATUS_SET);
  if (!target) throw new Error('resolveDrop returned null');
  const moving = todos.find((t) => t._id === activeId)!;
  const others = sortByOrder(
    todos.filter((t) => t.status === target.toStatus && t._id !== activeId),
  );
  const newOrder = orderForInsert(
    others.map((t) => t.order),
    Math.max(0, Math.min(target.toIndex, others.length)),
  );
  return sortByOrder([
    ...todos.filter((t) => t._id !== activeId),
    { ...moving, status: target.toStatus, order: newOrder },
  ])
    .filter((t) => t.status === target.toStatus)
    .map((t) => t._id);
}

describe('resolveDrop', () => {
  it('아래로 이동: A 를 C 위에 드롭 -> C 자리로 (B, C, A, D)', () => {
    const target = resolveDrop(COLUMN, 'A', 'C', STATUS_SET);
    expect(target).toEqual({ toStatus: 'todo', toIndex: 2 });
    expect(applyDrop(COLUMN, 'A', 'C')).toEqual(['B', 'C', 'A', 'D']);
  });

  it('인접 아래 이동이 무동작이 아님: A 를 B 위에 드롭 -> B 와 C 사이', () => {
    const target = resolveDrop(COLUMN, 'A', 'B', STATUS_SET);
    // 이동 카드를 제외한 목록 [B, C, D] 기준 index 1 = B 와 C 사이
    expect(target).toEqual({ toStatus: 'todo', toIndex: 1 });
    expect(applyDrop(COLUMN, 'A', 'B')).toEqual(['B', 'A', 'C', 'D']);
  });

  it('위로 이동: D 를 B 위에 드롭 -> A 와 B 사이', () => {
    const target = resolveDrop(COLUMN, 'D', 'B', STATUS_SET);
    expect(target).toEqual({ toStatus: 'todo', toIndex: 1 });
    expect(applyDrop(COLUMN, 'D', 'B')).toEqual(['A', 'D', 'B', 'C']);
  });

  it('빈 컬럼 id 에 드롭 -> 해당 컬럼 맨 뒤', () => {
    expect(resolveDrop(COLUMN, 'A', 'doing', STATUS_SET)).toEqual({
      toStatus: 'doing',
      toIndex: 0,
    });
  });

  it('다른 컬럼 id 에 드롭 -> 이동 카드를 제외한 길이만큼 뒤', () => {
    const todos = [...COLUMN, mk('X', 'b0', 'doing'), mk('Y', 'b1', 'doing')];
    expect(resolveDrop(todos, 'A', 'doing', STATUS_SET)).toEqual({
      toStatus: 'doing',
      toIndex: 2,
    });
    // 이미 doing 에 있는 카드를 doing 컬럼에 드롭하면 자기 자신은 제외
    expect(resolveDrop(todos, 'X', 'doing', STATUS_SET)).toEqual({
      toStatus: 'doing',
      toIndex: 1,
    });
  });

  it('자기 자신 / 알 수 없는 id 는 null', () => {
    expect(resolveDrop(COLUMN, 'A', 'A', STATUS_SET)).toBeNull();
    expect(resolveDrop(COLUMN, 'A', 'ZZZ', STATUS_SET)).toBeNull();
    expect(resolveDrop(COLUMN, 'ZZZ', 'B', STATUS_SET)).toBeNull();
  });
});
