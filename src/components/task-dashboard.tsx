"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, CirclePlus, LayoutDashboard, ListTodo, LogIn, Search, Settings2, Sparkles, Trash2 } from "lucide-react";
import { createTask, deleteTask, guestLogin, getCurrentUser, listTasks, updateTask } from "@/lib/api";
import type { Task, TaskPriority, TaskStatus, User } from "@/lib/types";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { TaskFormModal } from "./task-form-modal";
import { ThemeToggle } from "./theme-toggle";

const tokenKey = "able-space.token";

const navItems = [
  { icon: LayoutDashboard, label: "Overview", active: true },
  { icon: ListTodo, label: "Tasks", active: false },
  { icon: Settings2, label: "Settings", active: false },
];

const statCards = [
  { label: "Total", icon: CirclePlus, valueKey: "total" },
  { label: "Todo", icon: ListTodo, valueKey: "todo" },
  { label: "In progress", icon: Sparkles, valueKey: "active" },
  { label: "Done", icon: CheckCircle2, valueKey: "done" },
] as const;

const statusLabels: Record<TaskStatus, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  DONE: "Done",
  ON_HOLD: "On hold",
};

const statusTone: Record<TaskStatus, string> = {
  TODO: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  IN_PROGRESS: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  DONE: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  ON_HOLD: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300",
};

const priorityTone: Record<TaskPriority, string> = {
  LOW: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300",
  MEDIUM: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  HIGH: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

const priorityLabels: Record<TaskPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

export function TaskDashboard() {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<TaskStatus | "">("");
  const [priority, setPriority] = useState<TaskPriority | "">("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = window.localStorage.getItem(tokenKey);
    if (storedToken) {
      setToken(storedToken);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (!token) {
      setLoading(false);
      setUser(null);
      setTasks([]);
      return;
    }

    let active = true;
    setLoading(true);

    getCurrentUser(token)
      .then((currentUser) => {
        if (!active) return;

        if (!currentUser) {
          clearSession();
          return;
        }

        setUser(currentUser);
        return loadTasks(token);
      })
      .catch(() => {
        if (active) {
          clearSession();
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [ready, token]);

  const filteredTasks = useMemo(
    () =>
      tasks.filter((task) => {
        const matchesQuery =
          !query ||
          task.title.toLowerCase().includes(query.toLowerCase()) ||
          (task.description ?? "").toLowerCase().includes(query.toLowerCase());
        const matchesStatus = !status || task.status === status;
        const matchesPriority = !priority || task.priority === priority;

        return matchesQuery && matchesStatus && matchesPriority;
      }),
    [tasks, query, status, priority],
  );

  const hasFilters = Boolean(query || status || priority);

  const stats = useMemo(
    () => ({
      total: tasks.length,
      todo: tasks.filter((task) => task.status === "TODO").length,
      active: tasks.filter((task) => task.status === "IN_PROGRESS").length,
      done: tasks.filter((task) => task.status === "DONE").length,
    }),
    [tasks],
  );

  async function loadTasks(currentToken: string) {
    try {
      const response = await listTasks(currentToken);
      setTasks(response);
      setError(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Failed to load tasks");
    }
  }

  function clearSession() {
    window.localStorage.removeItem(tokenKey);
    setToken(null);
    setUser(null);
    setTasks([]);
  }

  async function handleGuestLogin() {
    setAuthLoading(true);
    setError(null);

    try {
      const response = await guestLogin();
      window.localStorage.setItem(tokenKey, response.token);
      setToken(response.token);
      setUser(response.user);
      await loadTasks(response.token);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Guest login failed");
    } finally {
      setAuthLoading(false);
      setLoading(false);
    }
  }

  async function refreshTasks() {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      await loadTasks(token);
    } finally {
      setLoading(false);
    }
  }

  function clearFilters() {
    setQuery("");
    setStatus("");
    setPriority("");
  }

  async function handleSubmitTask(payload: {
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueDate?: string;
  }) {
    if (!token) return;

    if (editingTask) {
      await updateTask(token, editingTask.id, payload);
    } else {
      await createTask(token, payload);
    }

    setEditingTask(null);
    await refreshTasks();
  }

  async function handleDeleteTask(id: string) {
    if (!token) return;
    await deleteTask(token, id);
    await refreshTasks();
  }

  async function handleStatusChange(task: Task, nextStatus: TaskStatus) {
    if (!token) return;
    await updateTask(token, task.id, { status: nextStatus });
    await refreshTasks();
  }

  const isAuthenticated = Boolean(token && user);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[color:var(--background)] px-4 py-8 text-[color:var(--text)] sm:px-6 lg:px-8">
        <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2 text-sm text-[color:var(--text-muted)] shadow-sm">
              <Sparkles size={14} />
              Figma-first task management system
            </div>
            <div className="space-y-4">
              <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
                Build, track, and ship tasks with a clean, theme-aware workspace.
              </h1>
              <p className="max-w-xl text-base leading-7 text-[color:var(--text-muted)]">
                Guest login is ready, the theme persists across refresh, and the app is wired to a real NestJS API with validation.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ["Theme support", "Persisted UI preference"],
                ["Guest login", "One click access"],
                ["Clean APIs", "Validated NestJS routes"],
              ].map(([title, copy]) => (
                <Card key={title} className="p-4">
                  <p className="text-sm font-medium">{title}</p>
                  <p className="mt-1 text-sm text-[color:var(--text-muted)]">{copy}</p>
                </Card>
              ))}
            </div>
          </div>

          <Card className="overflow-hidden p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--text-muted)]">Guest Login</p>
                <h2 className="mt-2 text-2xl font-semibold">Continue into the workspace</h2>
              </div>
              <ThemeToggle />
            </div>

            <div className="mt-6 space-y-4 rounded-3xl bg-[color:var(--surface-2)] p-5">
              <div className="flex items-start gap-3 rounded-2xl bg-[color:var(--surface)] p-4">
                <LogIn className="mt-0.5 text-[color:var(--primary)]" size={18} />
                <div>
                  <p className="font-medium">Guest session</p>
                  <p className="text-sm text-[color:var(--text-muted)]">Creates a temporary workspace with starter tasks.</p>
                </div>
              </div>

              {error ? (
                <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertCircle size={16} />
                  {error}
                </div>
              ) : null}

              <Button className="w-full" size="lg" onClick={handleGuestLogin} disabled={authLoading}>
                {authLoading ? "Creating guest session..." : "Continue as Guest"}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[color:var(--background)] text-[color:var(--text)]">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-72 border-r border-[color:var(--border)] bg-[color:var(--surface)] px-5 py-6 lg:flex lg:flex-col">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--primary)] text-white shadow-sm">
              <LayoutDashboard size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--text-muted)]">TaskFlow</p>
              <p className="text-lg font-semibold">Workspace</p>
            </div>
          </div>

          <nav className="mt-8 grid gap-2">
            {navItems.map(({ icon: Icon, label, active }) => (
              <button
                key={label}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                  active
                    ? "bg-[color:var(--primary-soft)] text-[color:var(--primary)]"
                    : "text-[color:var(--text-muted)] hover:bg-[color:var(--surface-2)] hover:text-[color:var(--text)]"
                }`}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </nav>

          <div className="mt-auto rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-4">
            <p className="text-sm font-medium">Logged in as</p>
            <p className="mt-1 text-sm text-[color:var(--text-muted)]">{user?.name ?? "Guest User"}</p>
            <Button className="mt-4 w-full" variant="secondary" size="sm" onClick={clearSession}>
              Switch guest
            </Button>
          </div>
        </aside>

        <main className="flex-1 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
          <header className="flex flex-col gap-4 rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between lg:gap-6">
              <div>
                <p className="text-sm text-[color:var(--text-muted)]">Welcome back</p>
                <h1 className="text-2xl font-semibold tracking-tight">{user?.name ?? "Guest User"}</h1>
              </div>
              <div className="flex items-center gap-3">
                <ThemeToggle />
                <Button variant="secondary" size="sm" onClick={refreshTasks} disabled={loading}>
                  Refresh
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm text-[color:var(--text-muted)]">
              <Badge className="bg-[color:var(--primary-soft)] text-[color:var(--primary)]">Guest mode</Badge>
              <span>Real API connected</span>
            </div>
          </header>

          <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map(({ label, icon: Icon, valueKey }) => (
              <Card key={label} className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-[color:var(--text-muted)]">{label}</p>
                  <Icon size={18} className="text-[color:var(--primary)]" />
                </div>
                <p className="mt-4 text-3xl font-semibold">{stats[valueKey]}</p>
              </Card>
            ))}
          </section>

          <section className="mt-6 rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-4 sm:p-5" aria-busy={loading}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Tasks</h2>
                <p className="text-sm text-[color:var(--text-muted)]">Search, filter, create, edit, and delete tasks through the NestJS API.</p>
              </div>
              <Button onClick={() => { setEditingTask(null); setDialogOpen(true); }}>
                <CirclePlus size={16} />
                Add task
              </Button>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_180px_180px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]" size={16} />
                <Input
                  className="pl-11"
                  placeholder="Search tasks"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <select
                className="h-11 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 text-sm text-[color:var(--text)] outline-none"
                value={status}
                onChange={(event) => setStatus(event.target.value as TaskStatus | "")}
              >
                <option value="">All statuses</option>
                <option value="TODO">Todo</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="DONE">Done</option>
              </select>
              <select
                className="h-11 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 text-sm text-[color:var(--text)] outline-none"
                value={priority}
                onChange={(event) => setPriority(event.target.value as TaskPriority | "")}
              >
                <option value="">All priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-[color:var(--border)]">
              <div className="hidden lg:block">
                <table className="min-w-full divide-y divide-[color:var(--border)]">
                  <thead className="bg-[color:var(--surface-2)] text-left text-xs uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                    <tr>
                      <th className="px-4 py-3 font-medium">Task</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Priority</th>
                      <th className="px-4 py-3 font-medium">Due</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[color:var(--border)]">
                    {filteredTasks.map((task) => (
                      <tr key={task.id} className="align-top">
                        <td className="px-4 py-4">
                          <p className="font-medium">{task.title}</p>
                          <p className="mt-1 max-w-xl text-sm text-[color:var(--text-muted)]">{task.description || "No description"}</p>
                        </td>
                        <td className="px-4 py-4">
                          <Badge className={statusTone[task.status]}>{statusLabels[task.status]}</Badge>
                        </td>
                        <td className="px-4 py-4">
                          <Badge className={priorityTone[task.priority]}>{priorityLabels[task.priority]}</Badge>
                        </td>
                        <td className="px-4 py-4 text-sm text-[color:var(--text-muted)]">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "--"}</td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            <Button variant="secondary" size="sm" onClick={() => { setEditingTask(task); setDialogOpen(true); }}>
                              Edit
                            </Button>
                            <Button variant="secondary" size="sm" onClick={() => handleStatusChange(task, task.status === "DONE" ? "TODO" : "DONE")}> 
                              Toggle
                            </Button>
                            <Button variant="danger" size="sm" onClick={() => handleDeleteTask(task.id)}>
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {loading && tasks.length === 0 ? (
                <div className="hidden lg:block p-4">
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="grid animate-pulse grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 rounded-2xl bg-[color:var(--surface-2)] px-4 py-4">
                        <div className="h-4 rounded bg-[color:var(--surface)]" />
                        <div className="h-4 rounded bg-[color:var(--surface)]" />
                        <div className="h-4 rounded bg-[color:var(--surface)]" />
                        <div className="h-4 rounded bg-[color:var(--surface)]" />
                        <div className="h-4 rounded bg-[color:var(--surface)]" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {loading ? (
                <div className="grid gap-3 p-3 lg:hidden">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Card key={index} className="animate-pulse p-4">
                      <div className="h-4 w-3/5 rounded bg-[color:var(--surface-2)]" />
                      <div className="mt-3 h-3 w-4/5 rounded bg-[color:var(--surface-2)]" />
                      <div className="mt-4 flex gap-2">
                        <div className="h-8 w-20 rounded-xl bg-[color:var(--surface-2)]" />
                        <div className="h-8 w-24 rounded-xl bg-[color:var(--surface-2)]" />
                      </div>
                    </Card>
                  ))}
                </div>
              ) : null}

              {error ? (
                <div className="border-t border-[color:var(--border)] p-4">
                  <div className="flex items-start justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200" role="alert">
                    <div>
                      <p className="font-medium">Unable to load tasks</p>
                      <p className="mt-1 text-sm">{error}</p>
                    </div>
                    <Button variant="secondary" size="sm" onClick={refreshTasks} disabled={loading}>
                      Retry
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-3 p-3 lg:hidden">
                {filteredTasks.map((task) => (
                  <Card key={task.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{task.title}</p>
                        <p className="mt-1 text-sm text-[color:var(--text-muted)]">{task.description || "No description"}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteTask(task.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge className={statusTone[task.status]}>{statusLabels[task.status]}</Badge>
                      <Badge className={priorityTone[task.priority]}>{priorityLabels[task.priority]}</Badge>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => { setEditingTask(task); setDialogOpen(true); }}>
                        Edit
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => handleStatusChange(task, task.status === "DONE" ? "TODO" : "DONE")}>Toggle</Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {!loading && !error && filteredTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--primary-soft)] text-[color:var(--primary)]">
                  <AlertCircle size={22} />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{hasFilters ? "No matches found" : "No tasks yet"}</h3>
                <p className="mt-1 max-w-md text-sm text-[color:var(--text-muted)]">
                  {hasFilters
                    ? "Try changing or clearing the filters to see tasks."
                    : "Create your first task to start organizing the workspace."}
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  {hasFilters ? (
                    <Button variant="secondary" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  ) : null}
                  <Button onClick={() => { setEditingTask(null); setDialogOpen(true); }}>
                    <CirclePlus size={16} />
                    Add task
                  </Button>
                </div>
              </div>
            ) : null}
          </section>
        </main>
      </div>

      <TaskFormModal
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingTask(null);
        }}
        onSubmit={handleSubmitTask}
        initialTask={editingTask}
        title={editingTask ? "Edit task" : "Create task"}
      />
    </div>
  );
}
