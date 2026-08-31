import type { Todo, TodoStatus } from '@/types';
import { sortByOrder } from '@/store/todoSlice';

export interface DropTarget {
  toStatus: TodoStatus;
  /** 이동 카드를 제외한 대상 컬럼 목록 기준 삽입 인덱스 */
  toIndex: number;
}

/**
 * 드래그 종료 시 대상 컬럼 / 삽입 인덱스를 계산한다.
 *
 * over 가 컬럼 id 면 맨 뒤에 붙이고, 다른 카드 id 면 "정렬된 전체 컬럼"에서의
 * 그 카드 인덱스를 그대로 삽입 인덱스로 쓴다. (이동 카드를 먼저 제외하면
 * 아래 방향 이동이 한 칸씩 밀려 인접 이동이 무동작이 된다.)
 */
export function resolveDrop(
  todos: Todo[],
  activeId: string,
  overId: string,
  statusSet: Set<TodoStatus>,
): DropTarget | null {
  if (overId === activeId) return null;
  if (!todos.some((t) => t._id === activeId)) return null;

  if (statusSet.has(overId as TodoStatus)) {
    const toStatus = overId as TodoStatus;
    const others = todos.filter((t) => t.status === toStatus && t._id !== activeId);
    return { toStatus, toIndex: others.length };
  }

  const overTodo = todos.find((t) => t._id === overId);
  if (!overTodo) return null;

  const toStatus = overTodo.status;
  const column = sortByOrder(todos.filter((t) => t.status === toStatus));
  const idx = column.findIndex((t) => t._id === overId);
  return {
    toStatus,
    toIndex: idx === -1 ? column.filter((t) => t._id !== activeId).length : idx,
  };
}
