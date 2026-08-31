import { create } from 'zustand';
import type { Goal } from '@/types';
import { api } from '@/lib/api';

interface GoalState {
  goals: Goal[];
  loading: boolean;
  error: string | null;
  fetchGoals: () => Promise<void>;
  addGoal: (input: { title: string; description?: string }) => Promise<void>;
  updateGoal: (id: string, input: { title?: string; description?: string }) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
}

export const useGoalStore = create<GoalState>((set, get) => ({
  goals: [],
  loading: false,
  error: null,

  fetchGoals: async () => {
    set({ loading: true, error: null });
    try {
      const goals = await api.get<Goal[]>('/api/goals');
      set({ goals, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  addGoal: async (input) => {
    const goal = await api.post<Goal>('/api/goals', input);
    set({ goals: [goal, ...get().goals] });
  },

  updateGoal: async (id, input) => {
    const updated = await api.put<Goal>(`/api/goals/${id}`, input);
    set({ goals: get().goals.map((g) => (g._id === id ? { ...g, ...updated } : g)) });
  },

  deleteGoal: async (id) => {
    await api.del(`/api/goals/${id}`);
    set({ goals: get().goals.filter((g) => g._id !== id) });
  },
}));
