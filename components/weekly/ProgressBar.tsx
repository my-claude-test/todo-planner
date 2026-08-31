interface ProgressBarProps {
  value: number;
  label?: string;
}

export default function ProgressBar({ value, label }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div className="flex items-center gap-2">
      {label ? <span className="shrink-0 text-xs text-[var(--muted)]">{label}</span> : null}
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--border)]">
        <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${clamped}%` }} />
      </div>
      <span className="w-10 shrink-0 text-right text-xs text-[var(--muted)]">{clamped}%</span>
    </div>
  );
}
