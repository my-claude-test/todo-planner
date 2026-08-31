'use client';

import { useState } from 'react';
import type { Goal } from '@/types';

interface GoalFormProps {
  initial?: Goal | null;
  onSubmit: (v: { title: string; description: string }) => Promise<void>;
  onCancel: () => void;
}

export default function GoalForm({ initial, onSubmit, onCancel }: GoalFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setError('제목을 입력하세요');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({ title: trimmed, description: description.trim() });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">제목</span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
        />
        {error ? <span className="text-xs text-red-500">{error}</span> : null}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">설명</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="resize-y rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
        />
      </label>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-2 text-sm text-[var(--muted)] transition-colors hover:bg-black/5"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-[var(--primary)] px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          저장
        </button>
      </div>
    </form>
  );
}
