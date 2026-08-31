export type TodoStatus = 'todo' | 'doing' | 'done';
export type Priority = 'high' | 'medium' | 'low';

export interface Goal {
  _id: string;
  title: string;
  description: string;
  /** 0-100. 연결된 Todo 완료율로 자동 계산 (P1) */
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyGoalItem {
  _id?: string;
  text: string;
  done: boolean;
}

export interface WeeklyPlan {
  _id: string;
  /** 해당 주 월요일 00:00 (ISO 문자열) */
  weekStart: string;
  goals: WeeklyGoalItem[];
  memo: string;
  /** 주간 회고 (P1) */
  retrospective: string;
  goalId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Todo {
  _id: string;
  title: string;
  description?: string;
  status: TodoStatus;
  priority: Priority;
  dueDate?: string | null;
  /** 0(일)~6(토) */
  dayOfWeek?: number | null;
  /** fractional index 문자열 (사전순 정렬) */
  order: string;
  weeklyPlanId?: string | null;
  goalId?: string | null;
  /** 소유자 User._id. 세션에서 결정되며 클라이언트가 지정할 수 없다. */
  userId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CreateGoalInput = Pick<Goal, 'title'> & Partial<Pick<Goal, 'description'>>;
export type CreateWeeklyPlanInput = {
  weekStart: string;
  goals?: WeeklyGoalItem[];
  memo?: string;
  retrospective?: string;
  goalId?: string | null;
};
export type CreateTodoInput = {
  title: string;
  description?: string;
  status?: TodoStatus;
  priority?: Priority;
  dueDate?: string | null;
  dayOfWeek?: number | null;
  weeklyPlanId?: string | null;
  goalId?: string | null;
};
