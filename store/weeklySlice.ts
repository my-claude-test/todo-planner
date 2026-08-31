import { create } from 'zustand';
import type { WeeklyPlan, WeeklyGoalItem } from '@/types';
import { api } from '@/lib/api';
import { getWeekStartISO } from '@/lib/utils';

interface WeeklyState {
  plans: WeeklyPlan[];
  current: WeeklyPlan | null;
  loading: boolean;
  error: string | null;
  fetchRecent: (limit?: number) => Promise<void>;
  fetchByWeekStart: (weekStartISO: string) => Promise<WeeklyPlan | null>;
  fetchCurrentWeek: () => Promise<void>;
  fetchById: (id: string) => Promise<void>;
  addWeekly: (input: {
    weekStart: string;
    goals?: WeeklyGoalItem[];
    memo?: string;
    goalId?: string | null;
  }) => Promise<WeeklyPlan>;
  updateWeekly: (id: string, input: Partial<WeeklyPlan>) => Promise<void>;
  toggleGoal: (planId: string, goalItemId: string, done?: boolean) => Promise<void>;
}

function replaceInList(list: WeeklyPlan[], plan: WeeklyPlan): WeeklyPlan[] {
  const idx = list.findIndex((p) => p._id === plan._id);
  if (idx === -1) return [plan, ...list];
  const next = [...list];
  next[idx] = plan;
  return next;
}

export const useWeeklyStore = create<WeeklyState>((set, get) => ({
  plans: [],
  current: null,
  loading: false,
  error: null,

  fetchRecent: async (limit = 4) => {
    set({ loading: true, error: null });
    try {
      const plans = await api.get<WeeklyPlan[]>(`/api/weekly?limit=${limit}`);
      set({ plans, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  fetchByWeekStart: async (weekStartISO) => {
    const plan = await api.get<WeeklyPlan | null>(
      `/api/weekly?weekStart=${encodeURIComponent(weekStartISO)}`,
    );
    if (plan) set({ current: plan, plans: replaceInList(get().plans, plan) });
    return plan;
  },

  fetchCurrentWeek: async () => {
    set({ loading: true, error: null });
    try {
      const plan = await get().fetchByWeekStart(getWeekStartISO());
      set({ current: plan, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  fetchById: async (id) => {
    set({ loading: true, error: null });
    try {
      const plan = await api.get<WeeklyPlan>(`/api/weekly/${id}`);
      set({ current: plan, plans: replaceInList(get().plans, plan), loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  addWeekly: async (input) => {
    const plan = await api.post<WeeklyPlan>('/api/weekly', input);
    set({ plans: replaceInList(get().plans, plan), current: plan });
    return plan;
  },

  updateWeekly: async (id, input) => {
    const prevPlans = get().plans;
    const prevCurrent = get().current;
    try {
      const plan = await api.put<WeeklyPlan>(`/api/weekly/${id}`, input);
      set({
        plans: replaceInList(get().plans, plan),
        current: get().current?._id === id ? plan : get().current,
        error: null,
      });
    } catch (err) {
      set({ plans: prevPlans, current: prevCurrent, error: (err as Error).message });
      throw err;
    }
  },

  toggleGoal: async (planId, goalItemId, done) => {
    const prevPlans = get().plans;
    const prevCurrent = get().current;

    // 낙관적 토글 — 서버 응답 전에 체크박스가 즉시 반응하도록
    const applyToggle = (plan: WeeklyPlan): WeeklyPlan => ({
      ...plan,
      goals: plan.goals.map((g) =>
        g._id === goalItemId ? { ...g, done: typeof done === 'boolean' ? done : !g.done } : g,
      ),
    });
    set({
      plans: prevPlans.map((p) => (p._id === planId ? applyToggle(p) : p)),
      current: prevCurrent?._id === planId ? applyToggle(prevCurrent) : prevCurrent,
    });

    try {
      const plan = await api.patch<WeeklyPlan>(`/api/weekly/${planId}`, { goalItemId, done });
      set({
        plans: replaceInList(get().plans, plan),
        current: get().current?._id === planId ? plan : get().current,
        error: null,
      });
    } catch (err) {
      set({ plans: prevPlans, current: prevCurrent, error: (err as Error).message });
      throw err;
    }
  },
}));
