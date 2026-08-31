import type { Todo, TodoStatus } from '@/types';

/**
 * 상태별 Todo 개수. weeklyPlanId 연결 여부와 무관하게 전체 목록을 센다.
 * 순수 함수 — 대시보드 카운터 로직의 단위 테스트 용도.
 */
export function countByStatus(todos: Todo[], status: TodoStatus): number {
  return todos.filter((t) => t.status === status).length;
}

/**
 * 주어진 날짜가 속한 주의 월요일 00:00:00.000 (로컬 타임존) 을 반환한다.
 * 일요일은 "이전 주"로 취급하지 않고, ISO 주(월요일 시작) 기준으로 계산한다.
 */
export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0(일)~6(토)
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** getWeekStart 의 ISO 문자열 버전 */
export function getWeekStartISO(date: Date = new Date()): string {
  return getWeekStart(date).toISOString();
}

/** n 주 전/후의 주 시작일 목록 (최신순). count=4 -> 이번주 포함 최근 4주 */
export function recentWeekStarts(count: number, from: Date = new Date()): Date[] {
  const base = getWeekStart(from);
  const weeks: Date[] = [];
  for (let i = 0; i < count; i += 1) {
    const w = new Date(base);
    w.setDate(w.getDate() - i * 7);
    weeks.push(w);
  }
  return weeks;
}

export function isPastDue(dueDate: string | Date | null | undefined, now: Date = new Date()): boolean {
  if (!dueDate) return false;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return false;
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return dueDay.getTime() < today.getTime();
}

/** 완료 개수 / 전체 개수 -> 0~100 정수 백분율. 전체 0 이면 0. */
export function percent(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((done / total) * 100);
}

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * 주 시작일 ISO 문자열 -> "2026.08.24 ~ 2026.08.30" (월~일, 로컬 타임존).
 * 순수 함수: 입력 문자열이 가리키는 시점의 로컬 날짜를 기준으로 6일 뒤까지 표기한다.
 */
export function formatWeekRange(weekStartISO: string): string {
  const start = new Date(weekStartISO);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}.${m}.${day}`;
  };
  return `${fmt(start)} ~ ${fmt(end)}`;
}
