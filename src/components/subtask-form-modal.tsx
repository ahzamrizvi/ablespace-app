"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { DatePickerField } from "./date-picker-field";
import type { TaskPriority } from "@/lib/types";

export type SubtaskFormValue = {
  title: string;
  priority: TaskPriority;
  member: string;
  dueDate: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (value: SubtaskFormValue) => void;
  initialValue?: SubtaskFormValue | null;
  title: string;
};

const priorityOptions: TaskPriority[] = ["LOW", "MEDIUM", "HIGH"];

export function SubtaskFormModal({ open, onClose, onSubmit, initialValue, title }: Props) {
  const [form, setForm] = useState<SubtaskFormValue>({
    title: "",
    priority: "MEDIUM",
    member: "",
    dueDate: "",
  });

  useEffect(() => {
    if (!open) return;

    setForm({
      title: initialValue?.title ?? "",
      priority: initialValue?.priority ?? "MEDIUM",
      member: initialValue?.member ?? "",
      dueDate: initialValue?.dueDate ?? "",
    });
  }, [initialValue, open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" onClick={onClose} role="presentation">
      <div className="w-full max-w-2xl rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-2xl sm:p-6" role="dialog" aria-modal="true" aria-labelledby="subtask-dialog-title" onClick={(event) => event.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--text-muted)]">Subtask</p>
            <h2 id="subtask-dialog-title" className="mt-1 text-xl font-semibold text-[color:var(--text)]">{title}</h2>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Close dialog">
            <X size={16} />
          </Button>
        </div>

        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit({
              title: form.title.trim(),
              priority: form.priority,
              member: form.member.trim(),
              dueDate: form.dueDate,
            });
          }}
        >
          <div className="grid gap-2">
            <label className="text-sm font-medium text-[color:var(--text)]">Title</label>
            <Input autoFocus value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-[color:var(--text)]">Priority</label>
              <select className="h-11 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 text-sm text-[color:var(--text)] outline-none" value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value as TaskPriority }))}>
                {priorityOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-[color:var(--text)]">Member</label>
              <Input value={form.member} onChange={(event) => setForm((current) => ({ ...current, member: event.target.value }))} placeholder="CN" />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-[color:var(--text)]">Due date</label>
              <DatePickerField value={form.dueDate} onChange={(value) => setForm((current) => ({ ...current, dueDate: value }))} />
            </div>
          </div>

          <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={!form.title.trim()}>{initialValue ? "Update subtask" : "Create subtask"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
