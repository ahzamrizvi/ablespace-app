"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Circle,
  CircleCheck,
  CircleDashed,
  Filter,
  FolderKanban,
  LayoutGrid,
  List,
  LogOut,
  Menu,
  MoonStar,
  MoreHorizontal,
  Palette,
  Plus,
  Search,
  Settings2,
  SquareStack,
  SunMedium,
  UserCircle2,
} from "lucide-react";
import { createTask, deleteTask, guestLogin, getCurrentUser, listTasks, updateTask } from "@/lib/api";
import type { Task, TaskPriority, TaskStatus, User } from "@/lib/types";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { TaskFormModal } from "./task-form-modal";
import { useTheme } from "next-themes";

type View = "login" | "tasks" | "projects" | "profile";
type TaskMode = "board" | "list";
type Accent = "amber" | "blue" | "pink" | "rose" | "emerald" | "black";
type ProjectState = "Backlog" | "In Progress" | "Completed";

type ProjectItem = {
  id: string;
  name: string;
  priority: "High" | "Medium" | "Low";
  lead: string;
  dueDate: string;
  state: ProjectState;
  members: string[];
  labels: string[];
};

const tokenKey = "able-space.token";
const accentKey = "able-space.accent";

const accentOptions: Array<{ value: Accent; label: string }> = [
  { value: "amber", label: "Amber" },
  { value: "blue", label: "Blue" },
  { value: "pink", label: "Pink" },
  { value: "rose", label: "Rose" },
  { value: "emerald", label: "Emerald" },
  { value: "black", label: "Black" },
];

const taskStatusLabels: Record<TaskStatus, string> = {
  TODO: "To Do",
  IN_PROGRESS: "Doing",
  DONE: "Completed",
};

const taskPriorityTone: Record<TaskPriority, string> = {
  LOW: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300",
  MEDIUM: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  HIGH: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

const taskPriorityLabel: Record<TaskPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

const projectPriorityTone = {
  High: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  Medium: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  Low: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300",
} as const;

const avatarPalette = ["bg-rose-500", "bg-violet-500", "bg-cyan-500", "bg-amber-500", "bg-emerald-500", "bg-pink-500"];
const accentSwatches: Record<Accent, string> = {
  amber: "bg-amber-500",
  blue: "bg-blue-500",
  pink: "bg-pink-500",
  rose: "bg-rose-500",
  emerald: "bg-emerald-500",
  black: "bg-slate-900",
};

const seedProjects: ProjectItem[] = [
  {
    id: "proj-1",
    name: "Design Homepage",
    priority: "High",
    lead: "AD",
    dueDate: "12 Sep 2026",
    state: "Backlog",
    members: ["A", "T"],
    labels: ["Design", "Research"],
  },
  {
    id: "proj-2",
    name: "Develop Login Feature",
    priority: "Low",
    lead: "CN",
    dueDate: "15 Sep 2026",
    state: "In Progress",
    members: ["C", "N"],
    labels: ["Development"],
  },
  {
    id: "proj-3",
    name: "Test Payment Gateway",
    priority: "Medium",
    lead: "QA",
    dueDate: "18 Sep 2026",
    state: "Completed",
    members: ["Q"],
    labels: ["Testing", "Deployment"],
  },
];

const profileDefaults = {
  name: "Guest User",
  email: "Guest account",
  title: "Guest",
  username: "guest",
};

export function AssessmentApp() {
  const { setTheme } = useTheme();
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>("login");
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [taskQuery, setTaskQuery] = useState("");
  const [taskStatus, setTaskStatus] = useState<TaskStatus | "">("");
  const [taskPriority, setTaskPriority] = useState<TaskPriority | "">("");
  const [taskMode, setTaskMode] = useState<TaskMode>("board");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [projects, setProjects] = useState<ProjectItem[]>(seedProjects);
  const [projectQuery, setProjectQuery] = useState("");
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(seedProjects[0]?.id ?? null);
  const [accent, setAccent] = useState<Accent>("blue");
  const [profile, setProfile] = useState(profileDefaults);
  const [openMenu, setOpenMenu] = useState<"workspace" | "user" | null>(null);
  const [openSubMenu, setOpenSubMenu] = useState<"theme" | "color" | null>(null);
  const [settingsTab, setSettingsTab] = useState<"profile" | "theme" | "color">("profile");

  useEffect(() => {
    const storedToken = window.localStorage.getItem(tokenKey);
    const storedAccent = window.localStorage.getItem(accentKey) as Accent | null;

    if (storedAccent) {
      setAccent(storedAccent);
    }

    if (storedToken) {
      setToken(storedToken);
      setView("tasks");
    }

    setReady(true);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.accent = accent;
    window.localStorage.setItem(accentKey, accent);
  }, [accent]);

  useEffect(() => {
    if (!ready || !token) return;

    let active = true;

    getCurrentUser(token)
      .then((currentUser) => {
        if (!active) return;
        if (!currentUser) {
          clearSession();
          return;
        }

        setUser(currentUser);
        setProfile((current) => ({
          ...current,
          name: currentUser.name,
          email: currentUser.isGuest ? "Guest account" : currentUser.email ?? "",
          title: currentUser.isGuest ? "Guest" : current.title,
          username: currentUser.isGuest ? "guest" : current.username,
        }));
        loadTasks(token);
      })
      .catch(() => {
        if (active) clearSession();
      });

    return () => {
      active = false;
    };
  }, [ready, token]);

  useEffect(() => {
    if (!token || view !== "tasks") return;
    const handler = window.setTimeout(() => {
      void loadTasks(token);
    }, 120);

    return () => window.clearTimeout(handler);
  }, [token, taskQuery, taskStatus, taskPriority, view]);

  const activeTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? tasks[0] ?? null,
    [selectedTaskId, tasks],
  );

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? projects[0] ?? null,
    [projects, selectedProjectId],
  );

  const filteredProjects = useMemo(
    () =>
      projects.filter((project) =>
        [project.name, project.lead, project.priority, project.state, ...project.labels]
          .join(" ")
          .toLowerCase()
          .includes(projectQuery.toLowerCase()),
      ),
    [projectQuery, projects],
  );

  async function loadTasks(currentToken: string) {
    try {
      const response = await listTasks(currentToken, {
        q: taskQuery,
        status: taskStatus,
        priority: taskPriority,
      });
      setTasks(response);
      setSelectedTaskId((current) => current && response.some((task) => task.id === current) ? current : response[0]?.id ?? null);
      setTaskError(null);
    } catch (error) {
      setTaskError(error instanceof Error ? error.message : "Failed to load tasks");
    }
  }

  function clearSession() {
    window.localStorage.removeItem(tokenKey);
    setToken(null);
    setUser(null);
    setTasks([]);
    setView("login");
    setSelectedTaskId(null);
    setTaskError(null);
    setOpenMenu(null);
    setOpenSubMenu(null);
  }

  async function handleGuestLogin() {
    setLoadingAuth(true);
    try {
      const response = await guestLogin();
      window.localStorage.setItem(tokenKey, response.token);
      setToken(response.token);
      setUser(response.user);
      setProfile({
        name: response.user.name,
        email: "Guest account",
        title: "Guest",
        username: "guest",
      });
      setView("tasks");
      await loadTasks(response.token);
    } catch (error) {
      setTaskError(error instanceof Error ? error.message : "Guest login failed");
    } finally {
      setLoadingAuth(false);
    }
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
    setTaskDialogOpen(false);
    await loadTasks(token);
  }

  async function handleDeleteTask(id: string) {
    if (!token) return;
    await deleteTask(token, id);
    await loadTasks(token);
  }

  async function handleToggleTheme(nextTheme: "light" | "dark") {
    setTheme(nextTheme);
  }

  if (!ready || view === "login") {
    return (
      <div className="min-h-screen bg-[color:var(--background)] px-4 py-8 text-[color:var(--text)] sm:px-6 lg:px-10">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col justify-center gap-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-8">
            <div className="inline-flex items-center gap-3 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2 shadow-sm">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--text)] text-xs font-semibold text-white">P</div>
              <span className="text-sm font-medium text-[color:var(--text)]">Pyramid</span>
            </div>

            <div className="space-y-3">
              <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-[color:var(--text)] sm:text-5xl">
                Build, track, and ship tasks with a clean, theme-aware workspace.
              </h1>
              <p className="max-w-xl text-base leading-7 text-[color:var(--text-muted)]">
                Guest login, task management, and Figma-inspired workspace screens are wired into a real NestJS API.
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

          <Card className="w-full max-w-[390px] rounded-[28px] p-6 shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
            <div className="text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-[color:var(--text)] text-sm font-semibold text-white">P</div>
              <h2 className="mt-4 text-2xl font-semibold">Let&apos;s get back on track</h2>
              <p className="mt-2 text-sm text-[color:var(--text-muted)]">Enter your email below to login to your account.</p>
            </div>

            <div className="mt-6 grid gap-3">
              <Button className="h-12 w-full rounded-full bg-[color:var(--text)] text-white hover:opacity-95" onClick={handleGuestLogin} disabled={loadingAuth}>
                {loadingAuth ? "Creating guest session..." : "Continue as Guest"}
              </Button>
              <Button variant="secondary" className="h-12 w-full rounded-full border border-[color:var(--border)] bg-white text-[color:var(--text)] hover:bg-[color:var(--surface-2)]" onClick={() => undefined}>
                <span className="font-semibold">G</span>
                Login with Google
              </Button>
            </div>

            <p className="mt-6 text-center text-xs leading-5 text-[color:var(--text-muted)]">
              By clicking continue, you agree to our <span className="underline">Terms of Service</span> and <span className="underline">Privacy Policy</span>
            </p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[color:var(--background)] text-[color:var(--text)]">
      <div className="mx-auto flex min-h-screen max-w-[1600px] overflow-hidden">
        <aside className="hidden w-[280px] shrink-0 border-r border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-4 lg:flex lg:flex-col">
          <div className="relative">
            <button className="flex w-full items-center justify-between rounded-2xl px-2 py-2 text-left hover:bg-[color:var(--surface-2)]" onClick={() => setOpenMenu(openMenu === "user" ? null : "user")}>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--text)] text-xs font-semibold text-white">{profile.name.slice(0, 1)}</div>
                <div>
                  <p className="text-sm font-medium">{profile.name}</p>
                  <p className="text-xs text-[color:var(--text-muted)]">{profile.email}</p>
                </div>
              </div>
              <ChevronDown size={14} className="text-[color:var(--text-muted)]" />
            </button>
            {openMenu === "user" ? <UserMenu accent={accent} onAccentChange={setAccent} onThemeChange={handleToggleTheme} onNavigateProfile={() => setView("profile")} onLogout={clearSession} onClose={() => setOpenMenu(null)} /> : null}
          </div>

          <div className="mt-4 rounded-2xl px-2 py-2">
            <button className="flex w-full items-center justify-between rounded-xl px-2 py-2 text-sm text-[color:var(--text-muted)] hover:bg-[color:var(--surface-2)] hover:text-[color:var(--text)]" onClick={() => setOpenMenu(openMenu === "workspace" ? null : "workspace") }>
              <span>Workspace</span>
              <ChevronDown size={14} />
            </button>
            {openMenu === "workspace" ? (
              <div className="mt-1 grid gap-1 pl-2">
                <SidebarButton active={view === "tasks"} icon={SquareStack} label="Tasks" onClick={() => setView("tasks")} />
                <SidebarButton active={view === "projects"} icon={FolderKanban} label="Projects" onClick={() => setView("projects")} />
              </div>
            ) : (
              <div className="mt-1 grid gap-1 pl-2">
                <SidebarButton active={view === "tasks"} icon={SquareStack} label="Tasks" onClick={() => setView("tasks")} />
                <SidebarButton active={view === "projects"} icon={FolderKanban} label="Projects" onClick={() => setView("projects")} />
              </div>
            )}
          </div>

          <div className="mt-auto rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3">
            <button className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left hover:bg-[color:var(--surface)]" onClick={() => setView("profile") }>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--primary)] text-white">G</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{profile.name}</p>
                <p className="truncate text-xs text-[color:var(--text-muted)]">{profile.email}</p>
              </div>
            </button>
            <div className="mt-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-3">
              <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--text-muted)]">Workspace access</p>
              <p className="mt-1 text-sm text-[color:var(--text-muted)]">Remove yourself from the workspace</p>
              <Button variant="danger" size="sm" className="mt-3 w-full rounded-full" onClick={clearSession}>
                <LogOut size={14} />
                Leave Workspace
              </Button>
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-auto px-4 py-4 lg:px-6 lg:py-5">
          <div className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <header className="flex items-center justify-between gap-3 border-b border-[color:var(--border)] px-4 py-4 lg:px-5">
              <div className="flex items-center gap-3">
                <button className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--border)] lg:hidden" onClick={() => setOpenMenu(openMenu === "workspace" ? null : "workspace") }>
                  <Menu size={18} />
                </button>
              <div>
                {view === "tasks" ? (
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text-muted)]">
                    <LayoutGrid size={16} />
                  </div>
                ) : (
                  <>
                    <div className="text-xs uppercase tracking-[0.22em] text-[color:var(--text-muted)]">{view}</div>
                    <h1 className="text-xl font-semibold sm:text-2xl">{view === "projects" ? "Projects" : "Profile"}</h1>
                  </>
                )}
              </div>
              </div>

            </header>

            <div className="p-4 lg:p-5">
              {view === "tasks" ? (
                <TasksScreen
                  token={token}
                  user={user}
                  tasks={tasks}
                  error={taskError}
                  mode={taskMode}
                  setMode={setTaskMode}
                  query={taskQuery}
                  setQuery={setTaskQuery}
                  status={taskStatus}
                  setStatus={setTaskStatus}
                  priority={taskPriority}
                  setPriority={setTaskPriority}
                  activeTask={activeTask}
                  setActiveTaskId={setSelectedTaskId}
                  onCreate={() => { setEditingTask(null); setTaskDialogOpen(true); }}
                  onEdit={(task) => { setEditingTask(task); setTaskDialogOpen(true); }}
                  onDelete={handleDeleteTask}
                />
              ) : null}

              {view === "projects" ? (
                <ProjectsScreen
                  query={projectQuery}
                  setQuery={setProjectQuery}
                  projects={filteredProjects}
                  selectedProject={selectedProject}
                  setSelectedProjectId={setSelectedProjectId}
                  onOpenAdd={() => setProjectDialogOpen(true)}
                />
              ) : null}

              {view === "profile" ? (
                <ProfileScreen
                  profile={profile}
                  setProfile={setProfile}
                  accent={accent}
                  setAccent={setAccent}
                  onThemeChange={handleToggleTheme}
                  onNavigate={(next) => setView(next)}
                />
              ) : null}
            </div>
          </div>
        </main>
      </div>

      <TaskFormModal
        open={taskDialogOpen}
        onClose={() => {
          setTaskDialogOpen(false);
          setEditingTask(null);
        }}
        onSubmit={handleSubmitTask}
        initialTask={editingTask}
        title={editingTask ? "Edit task" : "Create task"}
      />

      {projectDialogOpen ? <ProjectModal onClose={() => setProjectDialogOpen(false)} onCreate={(project) => { setProjects((current) => [project, ...current]); setSelectedProjectId(project.id); setProjectDialogOpen(false); }} /> : null}
    </div>
  );
}

function SidebarButton({ active, icon: Icon, label, onClick }: { active?: boolean; icon: React.ComponentType<{ size?: number; className?: string }>; label: string; onClick: () => void; }) {
  return (
    <button
      className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${active ? "bg-[color:var(--primary-soft)] text-[color:var(--primary)]" : "text-[color:var(--text-muted)] hover:bg-[color:var(--surface-2)] hover:text-[color:var(--text)]"}`}
      onClick={onClick}
    >
      <Icon size={15} />
      {label}
    </button>
  );
}

function UserMenu({ accent, onAccentChange, onThemeChange, onNavigateProfile, onLogout, onClose }: { accent: Accent; onAccentChange: (accent: Accent) => void; onThemeChange: (theme: "light" | "dark") => void; onNavigateProfile: () => void; onLogout: () => void; onClose: () => void; }) {
  const [submenu, setSubmenu] = useState<"theme" | "color" | null>(null);

  useEffect(() => {
    const handle = (event: MouseEvent) => {
      if (!(event.target instanceof HTMLElement)) return;
      if (!event.target.closest("[data-user-menu]")) onClose();
    };
    window.addEventListener("click", handle);
    return () => window.removeEventListener("click", handle);
  }, [onClose]);

  return (
    <div data-user-menu className="absolute left-0 top-[calc(100%+10px)] z-50 w-[min(300px,calc(100vw-1rem))] rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-2 shadow-2xl lg:w-[300px]">
      <div className="w-full rounded-xl bg-[color:var(--surface)] p-2">
        <MenuItem icon={SunMedium} label="Change Theme" onClick={() => setSubmenu(submenu === "theme" ? null : "theme")} />
        <MenuItem icon={Palette} label="Color Mode" onClick={() => setSubmenu(submenu === "color" ? null : "color")} />
        <MenuItem icon={Settings2} label="Settings" onClick={onNavigateProfile} />
        <MenuItem icon={LogOut} label="Logout" onClick={onLogout} danger />
      </div>

      {submenu === "theme" ? (
        <div className="mt-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-2">
          <SubMenuItem icon={SunMedium} label="Light" onClick={() => onThemeChange("light")} />
          <SubMenuItem icon={MoonStar} label="Dark" onClick={() => onThemeChange("dark")} />
        </div>
      ) : null}

      {submenu === "color" ? (
        <div className="mt-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-2">
          {accentOptions.map((option) => (
            <SubMenuItem key={option.value} label={option.label} swatch={option.value} selected={accent === option.value} onClick={() => onAccentChange(option.value)} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; onClick: () => void; danger?: boolean; }) {
  return (
    <button className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-[color:var(--surface-2)] ${danger ? "text-red-600" : "text-[color:var(--text)]"}`} onClick={onClick}>
      <Icon size={14} />
      {label}
      <ChevronRight size={14} className="ml-auto text-[color:var(--text-muted)]" />
    </button>
  );
}

function SubMenuItem({ icon: Icon, label, onClick, swatch, selected }: { icon?: React.ComponentType<{ size?: number; className?: string }>; label: string; onClick: () => void; swatch?: Accent; selected?: boolean; }) {
  return (
    <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-[color:var(--surface-2)]" onClick={onClick}>
      {swatch ? <span className={`h-3.5 w-3.5 rounded-sm ${accentSwatches[swatch]}`} /> : Icon ? <Icon size={13} /> : null}
      <span className="flex-1 text-left">{label}</span>
      {selected ? <span className="text-[color:var(--primary)]">✓</span> : null}
    </button>
  );
}

function TasksScreen({
  token,
  user,
  tasks,
  error,
  mode,
  setMode,
  query,
  setQuery,
  status,
  setStatus,
  priority,
  setPriority,
  activeTask,
  setActiveTaskId,
  onCreate,
  onEdit,
  onDelete,
}: {
  token: string | null;
  user: User | null;
  tasks: Task[];
  error: string | null;
  mode: TaskMode;
  setMode: (mode: TaskMode) => void;
  query: string;
  setQuery: (value: string) => void;
  status: TaskStatus | "";
  setStatus: (value: TaskStatus | "") => void;
  priority: TaskPriority | "";
  setPriority: (value: TaskPriority | "") => void;
  activeTask: Task | null;
  setActiveTaskId: (id: string | null) => void;
  onCreate: () => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}) {
  const [fieldsOpen, setFieldsOpen] = useState(false);
  const [columnView, setColumnView] = useState<TaskMode>(mode);
  const grouped = useMemo(() => ({
    TODO: tasks.filter((task) => task.status === "TODO"),
    IN_PROGRESS: tasks.filter((task) => task.status === "IN_PROGRESS"),
    DONE: tasks.filter((task) => task.status === "DONE"),
  }), [tasks]);

  useEffect(() => {
    setColumnView(mode);
  }, [mode]);

  return (
    <div className="space-y-4">
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold tracking-tight">Tasks</h2>
          <div className="flex items-center gap-2">
            <button className="flex h-10 w-10 items-center justify-center rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text-muted)] shadow-sm" aria-label="Search tasks">
              <Search size={16} />
            </button>
            <div className="relative">
              <button className="flex h-10 items-center gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 text-sm shadow-sm" onClick={() => setFieldsOpen((current) => !current)}>
                <List size={14} /> Fields
              </button>
              {fieldsOpen ? (
                <Card className="absolute right-0 top-[calc(100%+8px)] z-30 w-[270px] p-2 shadow-[0_16px_50px_rgba(15,23,42,0.14)]">
                  <div className="flex overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] text-sm">
                    <button className={`flex flex-1 items-center justify-center gap-2 px-3 py-2 ${columnView === "list" ? "bg-[color:var(--surface-2)] font-medium" : ""}`} onClick={() => { setColumnView("list"); setMode("list"); }}>
                      <List size={14} /> List
                    </button>
                    <button className={`flex flex-1 items-center justify-center gap-2 px-3 py-2 ${columnView === "board" ? "bg-[color:var(--surface-2)] font-medium" : ""}`} onClick={() => { setColumnView("board"); setMode("board"); }}>
                      <LayoutGrid size={14} /> Board
                    </button>
                  </div>
                  <div className="mt-2 space-y-1 text-sm">
                    {[
                      ["Priority", false],
                      ["Members", true],
                      ["Due Date", false],
                      ["Labels", false],
                      ["Status", false],
                      ["Reporter", false],
                    ].map(([label, checked], index) => (
                      <div key={`${label}-${index}`} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-[color:var(--surface-2)]">
                        <span>{label}</span>
                        <span className={`flex h-4 w-4 items-center justify-center rounded-sm border ${checked ? "border-[color:var(--text)] bg-[color:var(--text)] text-white" : "border-[color:var(--border)] bg-[color:var(--surface)]"}`}>
                          {checked ? "✓" : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              ) : null}
            </div>
            <button className="flex h-10 w-10 items-center justify-center rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text-muted)] shadow-sm" aria-label="Filter tasks">
              <Filter size={16} />
            </button>
            <Button className="h-10 rounded-lg bg-[color:var(--text)] px-3 text-white hover:opacity-95" onClick={onCreate}><Plus size={14} /> Add Task</Button>
          </div>
        </div>

        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        {mode === "board" ? (
          <div className="overflow-x-auto pb-2">
            <div className="flex min-w-max gap-3">
            {([
              ["TODO", "To Do"],
              ["IN_PROGRESS", "Doing"],
              ["DONE", "Completed"],
              ["HOLD", "On Hold"],
            ] as const).map(([key, label]) => (
              <Card key={key} className="w-[315px] rounded-[18px] border border-[color:var(--border)] bg-[color:var(--surface-2)] p-2">
                <div className="mb-2 flex items-center justify-between px-1 py-1 text-sm font-medium">
                  <span className="flex items-center gap-2">
                    <span className="text-[10px] text-[color:var(--text-muted)]">⠿</span>
                    {label}
                  </span>
                  <div className="flex items-center gap-2 text-[color:var(--text-muted)]">
                    <Plus size={14} />
                    <MoreHorizontal size={14} />
                  </div>
                </div>
                <div className="space-y-2.5">
                  {(key === "HOLD" ? [] : grouped[key as keyof typeof grouped]).map((task, index) => (
                    <button key={task.id} className="w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-3 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-[color:var(--primary)]" onClick={() => setActiveTaskId(task.id)}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[15px] font-medium leading-5">{task.title}</p>
                          <p className="mt-1 line-clamp-2 text-xs text-[color:var(--text-muted)]">{task.description || "Create clear and detailed task notes."}</p>
                        </div>
                        <MoreHorizontal size={14} className="text-[color:var(--text-muted)]" />
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[12px] text-[color:var(--text)]">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[color:var(--primary)] text-[10px] text-white">A</div> Admin
                        </span>
                        <Badge className="rounded-full bg-[color:var(--surface-2)] px-2 py-1 text-[11px] text-[color:var(--text)]">Deployment</Badge>
                        <Badge className="rounded-full bg-[color:var(--surface-2)] px-2 py-1 text-[11px] text-[color:var(--text)]">Deployment</Badge>
                        <Badge className="rounded-full bg-rose-500/10 px-2 py-1 text-[11px] text-rose-600 dark:text-rose-300">29 Jul</Badge>
                      </div>
                    </button>
                  ))}
                  {key !== "HOLD" ? <button className="flex h-10 w-full items-center justify-center rounded-2xl border border-dashed border-[color:var(--border)] text-sm text-[color:var(--text-muted)]">+ Add Task</button> : <div className="h-10" />}
                </div>
              </Card>
            ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {([
              ["TODO", "To Do"],
              ["IN_PROGRESS", "Doing"],
              ["DONE", "Completed"],
            ] as const).map(([key, label]) => (
              <section key={key} className="rounded-2xl border border-[color:var(--border)]">
                <div className="flex items-center justify-between border-b border-[color:var(--border)] bg-[color:var(--surface-2)] px-4 py-3 text-sm font-medium">
                  <button className="flex items-center gap-2" onClick={() => undefined}><ChevronDown size={14} />{label}</button>
                </div>
                <div className="overflow-hidden">
                  <table className="min-w-full text-sm">
                    <thead className="bg-[color:var(--surface)] text-left text-xs text-[color:var(--text-muted)]">
                      <tr>
                        <th className="px-4 py-3 font-medium">Task</th>
                        <th className="px-4 py-3 font-medium">Priority</th>
                        <th className="px-4 py-3 font-medium">Members</th>
                        <th className="px-4 py-3 font-medium">Due Date</th>
                        <th className="px-4 py-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(grouped[key as keyof typeof grouped] ?? []).map((task) => (
                        <tr key={task.id} className="border-t border-[color:var(--border)] hover:bg-[color:var(--surface-2)]">
                          <td className="px-4 py-3">
                            <button className="text-left font-medium" onClick={() => setActiveTaskId(task.id)}>{task.title}</button>
                          </td>
                          <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs ${taskPriorityTone[task.priority]}`}>{taskPriorityLabel[task.priority]}</span></td>
                          <td className="px-4 py-3"><AvatarStack count={task.priority === "HIGH" ? 3 : 2} /></td>
                          <td className="px-4 py-3 text-[color:var(--text-muted)]">{task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "--"}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button className="text-[color:var(--text-muted)]" onClick={() => onEdit(task)}>Edit</button>
                              <button className="text-[color:var(--text-muted)]" onClick={() => onDelete(task.id)}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button className="w-full border-t border-[color:var(--border)] px-4 py-3 text-left text-sm text-[color:var(--text-muted)]">+ Add Task</button>
                </div>
              </section>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ProjectsScreen({
  query,
  setQuery,
  projects,
  selectedProject,
  setSelectedProjectId,
  onOpenAdd,
}: {
  query: string;
  setQuery: (value: string) => void;
  projects: ProjectItem[];
  selectedProject: ProjectItem | null;
  setSelectedProjectId: (id: string | null) => void;
  onOpenAdd: () => void;
}) {
  const [fieldsOpen, setFieldsOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]" />
          <Input className="h-9 rounded-xl pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects" />
        </div>
        <button className="flex h-9 items-center gap-2 rounded-xl border border-[color:var(--border)] px-3 text-sm" onClick={() => setFieldsOpen((current) => !current)}>
          <List size={14} /> Fields
        </button>
        <button className="flex h-9 items-center gap-2 rounded-xl border border-[color:var(--border)] px-3 text-sm"><Filter size={14} /> Filter</button>
        <Button className="h-9 rounded-xl px-3" onClick={onOpenAdd}><Plus size={14} /> Add Project</Button>
        {fieldsOpen ? (
          <Card className="absolute z-20 mt-12 w-[220px] p-2 shadow-xl">
            {[
              "Priority",
              "Members",
              "Due Date",
              "Labels",
              "Status",
              "Reporter",
            ].map((field) => (
              <div key={field} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-[color:var(--surface-2)]">
                <span>{field}</span>
                <span className="h-3 w-3 rounded-sm border border-[color:var(--border)] bg-[color:var(--surface)]" />
              </div>
            ))}
          </Card>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-[color:var(--surface-2)] text-left text-xs text-[color:var(--text-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Projects</th>
                <th className="px-4 py-3 font-medium">Priority</th>
                <th className="px-4 py-3 font-medium">Lead</th>
                <th className="px-4 py-3 font-medium">Due Date</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id} className="border-t border-[color:var(--border)] hover:bg-[color:var(--surface-2)]">
                  <td className="px-4 py-3"><button className="text-left font-medium" onClick={() => setSelectedProjectId(project.id)}>{project.name}</button></td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs ${projectPriorityTone[project.priority]}`}>{project.priority}</span></td>
                  <td className="px-4 py-3"><AvatarStack initials={project.lead} count={1} /></td>
                  <td className="px-4 py-3">{project.dueDate}</td>
                  <td className="px-4 py-3 text-[color:var(--text-muted)]">...</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="border-t border-[color:var(--border)] px-4 py-3 text-left text-sm text-[color:var(--text-muted)]">+ Add Project</button>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-muted)]">Details</p>
              <h3 className="mt-1 text-lg font-semibold">{selectedProject?.name ?? "Project details"}</h3>
            </div>
            <button className="rounded-full border border-[color:var(--border)] p-2"><MoreHorizontal size={14} /></button>
          </div>
          <div className="mt-4 grid gap-3 text-sm">
            <RowDetail label="Priority" value={selectedProject?.priority ?? "--"} />
            <RowDetail label="Lead" value={selectedProject?.lead ?? "--"} />
            <RowDetail label="State" value={selectedProject?.state ?? "--"} />
            <RowDetail label="Due Date" value={selectedProject?.dueDate ?? "--"} />
            <RowDetail label="Labels" value={selectedProject?.labels.join(", ") ?? "--"} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function ProfileScreen({
  profile,
  setProfile,
  accent,
  setAccent,
  onThemeChange,
  onNavigate,
}: {
  profile: { name: string; email: string; title: string; username: string };
  setProfile: (value: { name: string; email: string; title: string; username: string }) => void;
  accent: Accent;
  setAccent: (accent: Accent) => void;
  onThemeChange: (theme: "light" | "dark") => void;
  onNavigate: (view: View) => void;
}) {
  const [sidebarTab, setSidebarTab] = useState<"profile" | "theme" | "color">("profile");

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
      <Card className="p-3">
        <button className="flex items-center gap-2 rounded-xl px-2 py-2 text-sm text-[color:var(--text-muted)]" onClick={() => onNavigate("tasks")}>
          <ArrowLeft size={14} /> Back to app
        </button>
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm text-[color:var(--text-muted)]">
          <Search size={13} /> Search
        </div>
        <div className="mt-3 grid gap-1">
          <SidebarButton active={sidebarTab === "profile"} icon={UserCircle2} label="Profile" onClick={() => setSidebarTab("profile")} />
          <SidebarButton active={sidebarTab === "theme"} icon={SunMedium} label="Theme" onClick={() => setSidebarTab("theme")} />
          <SidebarButton active={sidebarTab === "color"} icon={Palette} label="Color" onClick={() => setSidebarTab("color")} />
        </div>
      </Card>

      <div className="space-y-8">
        <h2 className="text-2xl font-semibold">Profile</h2>

        <Card className="p-6">
          <div className="grid gap-5">
            <ProfileRow label="Profile picture" value={<div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-violet-500 text-white">D</div>} />
            <ProfileRow label="Email" value={<div className="flex items-center gap-3"><span>{profile.email}</span><button className="rounded-full border border-[color:var(--border)] p-2 text-[color:var(--text-muted)]"><Settings2 size={14} /></button></div>} />
            <ProfileRow label="Full name" value={<Input className="h-10 max-w-[200px] bg-[color:var(--surface-2)]" value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} />} />
            <ProfileRow label="Title" sub="Your job title or role" value={<Input className="h-10 max-w-[200px] bg-[color:var(--surface-2)]" value={profile.title} onChange={(event) => setProfile({ ...profile, title: event.target.value })} />} />
            <ProfileRow label="Username" sub="One word, like a nickname or first name" value={<Input className="h-10 max-w-[200px] bg-[color:var(--surface-2)]" value={profile.username} onChange={(event) => setProfile({ ...profile, username: event.target.value })} />} />
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold">Workspace access</h3>
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-[color:var(--border)] p-4">
            <span className="text-sm text-[color:var(--text-muted)]">Remove yourself from the workspace</span>
            <Button variant="danger" size="sm" className="rounded-full">Leave Workspace</Button>
          </div>
        </Card>

        {sidebarTab === "theme" ? (
          <Card className="p-6">
            <h3 className="text-lg font-semibold">Theme</h3>
            <div className="mt-4 flex gap-3">
              <button className="flex items-center gap-2 rounded-xl border border-[color:var(--border)] px-4 py-3" onClick={() => onThemeChange("light")}><SunMedium size={14} /> Light</button>
              <button className="flex items-center gap-2 rounded-xl border border-[color:var(--border)] px-4 py-3" onClick={() => onThemeChange("dark")}><MoonStar size={14} /> Dark</button>
            </div>
          </Card>
        ) : null}

        {sidebarTab === "color" ? (
          <Card className="p-6">
            <h3 className="text-lg font-semibold">Color Mode</h3>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {accentOptions.map((option) => (
                <button key={option.value} className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left ${accent === option.value ? "border-[color:var(--primary)] bg-[color:var(--primary-soft)]" : "border-[color:var(--border)]"}`} onClick={() => setAccent(option.value)}>
                  <span className={`h-3.5 w-3.5 rounded-sm ${accentSwatches[option.value]}`} />
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function ProfileRow({ label, sub, value }: { label: string; sub?: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-3 border-b border-[color:var(--border)] pb-4 last:border-b-0 last:pb-0 sm:grid-cols-[1fr_auto] sm:items-center">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {sub ? <p className="text-sm text-[color:var(--text-muted)]">{sub}</p> : null}
      </div>
      <div>{value}</div>
    </div>
  );
}

function RowDetail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-[color:var(--text-muted)]">{label}</span>
      <span className="text-right font-medium text-[color:var(--text)]">{value}</span>
    </div>
  );
}

function AvatarStack({ count = 3, initials }: { count?: number; initials?: string }) {
  return (
    <div className="flex items-center">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={`-ml-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[color:var(--surface)] text-[10px] font-semibold text-white ${avatarPalette[index % avatarPalette.length]}`}
        >
          {initials ?? String.fromCharCode(65 + index)}
        </div>
      ))}
    </div>
  );
}

function ProjectModal({ onClose, onCreate }: { onClose: () => void; onCreate: (project: ProjectItem) => void; }) {
  const [form, setForm] = useState({ name: "", priority: "Medium" as ProjectItem["priority"], lead: "", dueDate: "" });

  function formatDueDate(value: string) {
    if (!value) return "--";
    const date = new Date(`${value}T00:00:00`);
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg" onClick={(event) => event.stopPropagation()}>
        <Card className="p-5">
        <h3 className="text-lg font-semibold">Create project</h3>
        <div className="mt-4 grid gap-3">
          <Input placeholder="Project name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <Input placeholder="Lead initials" value={form.lead} onChange={(event) => setForm({ ...form, lead: event.target.value })} />
          <select className="h-11 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as ProjectItem["priority"] })}>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
          <Input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button disabled={!form.name.trim()} onClick={() => onCreate({ id: `proj-${Date.now()}`, name: form.name, priority: form.priority, lead: form.lead || "ME", dueDate: formatDueDate(form.dueDate), state: "Backlog", members: [form.lead || "M"], labels: ["Planning"] })}>Create</Button>
          </div>
        </div>
        </Card>
      </div>
    </div>
  );
}
