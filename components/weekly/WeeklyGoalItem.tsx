'use client';

import type { WeeklyGoalItem as WeeklyGoalItemModel } from '@/types';
import { cn } from '@/lib/utils';

interface WeeklyGoalItemProps {
  item: WeeklyGoalItemModel;
  onToggle: (done: boolean) => void;
}

export default function WeeklyGoalItem({ item, onToggle }: WeeklyGoalItemProps) {
  return (
    <label className="flex items-center gap-2 py-2 text-sm">
      <input
        type="checkbox"
        checked={item.done}
        onChange={(e) => onToggle(e.target.checked)}
        className="h-4 w-4 accent-[var(--primary)]"
      />
      <span className={cn(item.done && 'text-[var(--muted)] line-through')}>{item.text}</span>
    </label>
  );
}
