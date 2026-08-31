import type { Todo } from '@/types';
import { cn } from '@/lib/utils';

interface WeekGridProps {
  todos: Todo[];
}

const DAYS: { label: string; dow: number }[] = [
  { label: '월', dow: 1 },
  { label: '화', dow: 2 },
  { label: '수', dow: 3 },
  { label: '목', dow: 4 },
  { label: '금', dow: 5 },
  { label: '토', dow: 6 },
  { label: '일', dow: 0 },
];

const PRIORITY_DOT: Record<string, string> = {
  high: 'bg-red-500',
  medium: 'bg-yellow-500',
  low: 'bg-gray-400',
};

export default function WeekGrid({ todos }: WeekGridProps) {
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[640px] grid-cols-7 gap-2">
        {DAYS.map((day) => {
          const items = todos.filter((t) => t.dayOfWeek === day.dow);
          return (
            <div
              key={day.dow}
              className="flex min-h-[8rem] flex-col rounded-lg border border-[var(--border)] bg-[var(--card)]"
            >
              <div className="border-b border-[var(--border)] px-2 py-1 text-center text-xs font-medium text-[var(--muted)]">
                {day.label}
              </div>
              <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
                {items.map((t) => (
                  <div
                    key={t._id}
                    className="flex items-center gap-1.5 rounded-md border border-[var(--border)] px-2 py-1 text-xs"
                  >
                    <span
                      className={cn(
                        'h-1.5 w-1.5 shrink-0 rounded-full',
                        PRIORITY_DOT[t.priority] ?? 'bg-gray-400',
                      )}
                    />
                    <span className="truncate">{t.title}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
