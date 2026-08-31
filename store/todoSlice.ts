import { create } from 'zustand';
import type { Todo, TodoStatus, CreateTodoInput } from '@/types';
import { api } from '@/lib/api';
import { orderForInsert } from '@/lib/fractionalIndex';

interface ReorderArgs {
  id: string;
  toStatus: TodoStatus;
  /** 대상 컬럼에서 삽입될 인덱스 (해당 카드 제외한 목록 기준) */
  toIndex: number;
}

interface TodoState {
  todos: Todo[];
  loading: boolean;
  error: string | null;
  fetchTodos: () => Promise<void>;
  addTodo: (input: CreateTodoInput) => Promise<void>;
  updateTodo: (id: string, input: Partial<Todo>) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  reorderTodo: (args: ReorderArgs) => Promise<void>;
  byStatus: (status: TodoStatus) => Todo[];
}

/** 우선순위 우선 정렬 후 order 사전순. High 를 상단 고정. */
const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };
export function sortTodos(list: Todo[]): Todo[] {
  return [...list].sort((a, b) => {
    const pr = (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1);
    if (pr !== 0) return pr;
    return a.order < b.order ? -1 : a.order > b.order ? 1 : 0;
  });
}

/** order 만으로 정렬 (테스트/재배치 계산용) */
export function sortByOrder(list: Todo[]): Todo[] {
  return [...list].sort((a, b) => (a.order < b.order ? -1 : a.order > b.order ? 1 : 0));
}

export const useTodoStore = create<TodoState>((set, get) => ({
  todos: [],
  loading: false,
  error: null,

  fetchTodos: async () => {
    set({ loading: true, error: null });
    try {
      const todos = await api.get<Todo[]>('/api/todos');
      set({ todos, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  addTodo: async (input) => {
    const todo = await api.post<Todo>('/api/todos', input);
    set({ todos: [...get().todos, todo], error: null });
  },

  updateTodo: async (id, input) => {
    const prev = get().todos;
    set({ todos: prev.map((t) => (t._id === id ? { ...t, ...input } : t)) });
    try {
      const updated = await api.put<Todo>(`/api/todos/${id}`, input);
      set({
        todos: get().todos.map((t) => (t._id === id ? { ...t, ...updated } : t)),
        error: null,
      });
    } catch (err) {
      set({ todos: prev, error: (err as Error).message });
      throw err;
    }
  },

  deleteTodo: async (id) => {
    const prev = get().todos;
    set({ todos: prev.filter((t) => t._id !== id) });
    try {
      await api.del(`/api/todos/${id}`);
      set({ error: null });
    } catch (err) {
      set({ todos: prev, error: (err as Error).message });
      throw err;
    }
  },

  reorderTodo: async ({ id, toStatus, toIndex }) => {
    const prev = get().todos;
    const moving = prev.find((t) => t._id === id);
    if (!moving) return;

    try {
      const columnOthers = sortByOrder(
        prev.filter((t) => t.status === toStatus && t._id !== id),
      );
      const newOrder = orderForInsert(
        columnOthers.map((t) => t.order),
        Math.max(0, Math.min(toIndex, columnOthers.length)),
      );

      // optimistic update — 이동 카드 1건만 변경
      set({
        todos: prev.map((t) =>
          t._id === id ? { ...t, status: toStatus, order: newOrder } : t,
        ),
      });

      await api.patch<Todo>(`/api/todos/${id}`, { status: toStatus, order: newOrder });
      set({ error: null });
    } catch (err) {
      set({ todos: prev, error: (err as Error).message });
      throw err;
    }
  },

  /** 보드 컬럼 목록. 보드는 WYSIWYG — order 만으로 정렬한다 (우선순위는 배지로만 표시). */
  byStatus: (status) => sortByOrder(get().todos.filter((t) => t.status === status)),
}));
