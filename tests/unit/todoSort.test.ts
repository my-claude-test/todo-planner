import { describe, it, expect, beforeEach } from 'vitest';
import { useTodoStore, sortTodos, sortByOrder } from '@/store/todoSlice';
import type { Todo } from '@/types';

function mk(partial: Partial<Todo>): Todo {
  return {
    _id: Math.random().toString(36).slice(2),
    title: 't',
    status: 'todo',
    priority: 'medium',
    order: 'a0',
    createdAt: '',
    updatedAt: '',
    ...partial,
  };
}

describe('sortTodos', () => {
  it('High 우선순위가 상단에 고정', () => {
    const list = [
      mk({ priority: 'low', order: 'a0' }),
      mk({ priority: 'high', order: 'z9' }),
      mk({ priority: 'medium', order: 'a1' }),
    ];
    const sorted = sortTodos(list);
    expect(sorted[0].priority).toBe('high');
    expect(sorted[2].priority).toBe('low');
  });

  it('같은 우선순위면 order 사전순', () => {
    const list = [
      mk({ priority: 'medium', order: 'a2' }),
      mk({ priority: 'medium', order: 'a0' }),
      mk({ priority: 'medium', order: 'a1' }),
    ];
    expect(sortTodos(list).map((t) => t.order)).toEqual(['a0', 'a1', 'a2']);
  });
});

describe('sortByOrder', () => {
  it('order 문자열 사전순 정렬, 원본 불변', () => {
    const list = [mk({ order: 'c' }), mk({ order: 'a' }), mk({ order: 'b' })];
    const snapshot = list.map((t) => t.order);
    expect(sortByOrder(list).map((t) => t.order)).toEqual(['a', 'b', 'c']);
    expect(list.map((t) => t.order)).toEqual(snapshot);
  });
});

describe('useTodoStore.byStatus (칸반 보드 정렬)', () => {
  beforeEach(() => {
    useTodoStore.setState({ todos: [], error: null });
  });

  it('보드는 order 순서 그대로 (우선순위로 재정렬하지 않음)', () => {
    useTodoStore.setState({
      todos: [
        mk({ _id: 'low', priority: 'low', order: 'a0' }),
        mk({ _id: 'high', priority: 'high', order: 'a1' }),
        mk({ _id: 'mid', priority: 'medium', order: 'a2' }),
        mk({ _id: 'other', priority: 'high', order: 'a0', status: 'doing' }),
      ],
    });
    expect(useTodoStore.getState().byStatus('todo').map((t) => t._id)).toEqual([
      'low',
      'high',
      'mid',
    ]);
  });
});
