"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Task, TaskPriority, TaskStatus } from "@/lib/types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueDate?: string;
  }) => Promise<void>;
  initialTask?: Task | null;
  initialStatus?: TaskStatus;
  title: string;
};

const statusOptions: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE", "ON_HOLD"];
const priorityOptions: TaskPriority[] = ["LOW", "MEDIUM", "HIGH"];
const statusLabels: Record<TaskStatus, string> = {
  TODO: "To Do",
  IN_PROGRESS: "Doing",
  DONE: "Completed",
  ON_HOLD: "On Hold",
};

export function TaskFormModal({ open, onClose, onSubmit, initialTask, initialStatus = "TODO", title }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const dialogTitleId = "task-dialog-title";
  const [form, setForm] = useState({
    title: "",
    description: "",
    status: "TODO" as TaskStatus,
    priority: "MEDIUM" as TaskPriority,
    dueDate: "",
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      title: initialTask?.title ?? "",
      description: initialTask?.description ?? "",
        status: initialTask?.status ?? initialStatus,
      priority: initialTask?.priority ?? "MEDIUM",
      dueDate: initialTask?.dueDate ? initialTask.dueDate.slice(0, 10) : "",
    });
  }, [initialStatus, initialTask, open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        status: form.status,
        priority: form.priority,
        dueDate: form.dueDate || undefined,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-2xl sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogTitleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--text-muted)]">Task</p>
            <h2 id={dialogTitleId} className="mt-1 text-xl font-semibold text-[color:var(--text)]">{title}</h2>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Close dialog">
            <X size={16} />
          </Button>
        </div>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-[color:var(--text)]">Title</label>
            <Input autoFocus value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-[color:var(--text)]">Description</label>
            <Textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-[color:var(--text)]">Status</label>
              <select
                className="h-11 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 text-sm text-[color:var(--text)] outline-none"
                value={form.status}
                onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as TaskStatus }))}
              >
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {statusLabels[option]}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-[color:var(--text)]">Priority</label>
              <select
                className="h-11 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 text-sm text-[color:var(--text)] outline-none"
                value={form.priority}
                onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value as TaskPriority }))}
              >
                {priorityOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-[color:var(--text)]">Due date</label>
              <Input type="date" value={form.dueDate} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} />
            </div>
          </div>

          <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !form.title.trim()}>
              {submitting ? "Saving..." : initialTask ? "Update task" : "Create task"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
