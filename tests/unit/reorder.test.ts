import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTodoStore } from '@/store/todoSlice';
import type { Todo } from '@/types';

function mk(id: string, order: string, status: Todo['status'] = 'todo'): Todo {
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

describe('useTodoStore.reorderTodo', () => {
  beforeEach(() => {
    useTodoStore.setState({ todos: [], error: null });
    vi.restoreAllMocks();
  });

  it('두 카드 사이로 이동 시 fetch(PATCH) 정확히 1회, 이동 카드만 변경', async () => {
    const a = mk('a', 'a0');
    const b = mk('b', 'a1');
    const c = mk('c', 'a2');
    useTodoStore.setState({ todos: [a, b, c] });

    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? '{}'));
      return new Response(JSON.stringify({ ...c, ...body }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    // c 를 a 와 b 사이(index 1)로
    await useTodoStore.getState().reorderTodo({ id: 'c', toStatus: 'todo', toIndex: 1 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/todos/c');
    expect(init?.method).toBe('PATCH');

    const todos = useTodoStore.getState().todos;
    const newC = todos.find((t) => t._id === 'c')!;
    expect(a.order < newC.order).toBe(true);
    expect(newC.order < b.order).toBe(true);
    // a, b 의 order 는 불변
    expect(todos.find((t) => t._id === 'a')!.order).toBe('a0');
    expect(todos.find((t) => t._id === 'b')!.order).toBe('a1');
  });

  it('PATCH 실패 시 롤백', async () => {
    const a = mk('a', 'a0');
    const b = mk('b', 'a1', 'doing');
    useTodoStore.setState({ todos: [a, b] });
    const prevSnapshot = JSON.stringify(useTodoStore.getState().todos);

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ error: 'boom' }), { status: 500 })),
    );

    await expect(
      useTodoStore.getState().reorderTodo({ id: 'a', toStatus: 'doing', toIndex: 0 }),
    ).rejects.toThrow();

    expect(JSON.stringify(useTodoStore.getState().todos)).toBe(prevSnapshot);
    expect(useTodoStore.getState().error).toBeTruthy();
  });
});
