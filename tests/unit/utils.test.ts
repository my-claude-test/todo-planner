import { describe, it, expect } from 'vitest';
import { getWeekStart, recentWeekStarts, isPastDue, percent, countByStatus } from '@/lib/utils';
import type { Todo } from '@/types';

function mkTodo(status: Todo['status'], weeklyPlanId: string | null): Todo {
  return {
    _id: Math.random().toString(36).slice(2),
    title: 't',
    status,
    priority: 'medium',
    order: 'a0',
    weeklyPlanId,
    createdAt: '',
    updatedAt: '',
  };
}

describe('getWeekStart', () => {
  it('수요일 -> 같은 주 월요일', () => {
    const ws = getWeekStart(new Date(2026, 7, 26)); // 2026-08-26 수
    expect(ws.getFullYear()).toBe(2026);
    expect(ws.getMonth()).toBe(7);
    expect(ws.getDate()).toBe(24); // 2026-08-24 월
    expect(ws.getHours()).toBe(0);
    expect(ws.getMinutes()).toBe(0);
  });

  it('월요일 -> 그대로', () => {
    const ws = getWeekStart(new Date(2026, 7, 24, 15, 30));
    expect(ws.getDate()).toBe(24);
    expect(ws.getHours()).toBe(0);
  });

  it('일요일 -> 직전 월요일 (이번 주로 간주)', () => {
    const ws = getWeekStart(new Date(2026, 7, 30)); // 2026-08-30 일
    expect(ws.getDate()).toBe(24);
  });

  it('자정 직전 토요일 -> 같은 주 월요일', () => {
    const ws = getWeekStart(new Date(2026, 7, 29, 23, 59, 59));
    expect(ws.getDate()).toBe(24);
  });
});

describe('recentWeekStarts', () => {
  it('최근 4주를 최신순으로 반환하고 각 7일 간격', () => {
    const weeks = recentWeekStarts(4, new Date(2026, 7, 26));
    expect(weeks).toHaveLength(4);
    expect(weeks[0].getDate()).toBe(24);
    for (let i = 1; i < weeks.length; i += 1) {
      const diff = (weeks[i - 1].getTime() - weeks[i].getTime()) / (1000 * 60 * 60 * 24);
      expect(diff).toBe(7);
    }
  });
});

describe('isPastDue', () => {
  const now = new Date(2026, 7, 26);
  it('어제 -> true', () => expect(isPastDue(new Date(2026, 7, 25), now)).toBe(true));
  it('오늘 -> false', () => expect(isPastDue(new Date(2026, 7, 26), now)).toBe(false));
  it('내일 -> false', () => expect(isPastDue(new Date(2026, 7, 27), now)).toBe(false));
  it('null -> false', () => expect(isPastDue(null, now)).toBe(false));
});

describe('percent', () => {
  it('완료 0건 -> 0', () => expect(percent(0, 4)).toBe(0));
  it('전부 완료 -> 100', () => expect(percent(4, 4)).toBe(100));
  it('전체 0건 -> 0 (division-by-zero 없음)', () => expect(percent(0, 0)).toBe(0));
  it('2/4 -> 50', () => expect(percent(2, 4)).toBe(50));
  it('1/3 -> 33 (반올림)', () => expect(percent(1, 3)).toBe(33));
});

describe('countByStatus', () => {
  const todos: Todo[] = [
    mkTodo('todo', null),
    mkTodo('todo', 'w1'),
    mkTodo('doing', null),
    mkTodo('done', 'w2'),
    mkTodo('done', null),
  ];

  it('weeklyPlanId 연결 여부와 무관하게 상태별 전체 개수를 센다', () => {
    expect(countByStatus(todos, 'todo')).toBe(2);
    expect(countByStatus(todos, 'doing')).toBe(1);
    expect(countByStatus(todos, 'done')).toBe(2);
  });

  it('해당 상태가 없으면 0', () => {
    expect(countByStatus([mkTodo('todo', null)], 'done')).toBe(0);
    expect(countByStatus([], 'todo')).toBe(0);
  });
});
