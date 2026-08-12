"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Circle,
  CircleCheck,
  CircleDashed,
  ChevronUp,
  Copy,
  Columns3,
  Filter,
  LayoutGrid,
  List,
  LogOut,
  Menu,
  MoonStar,
  MoreHorizontal,
  PanelLeft,
  Palette,
  Lock,
  Eye,
  Paperclip,
  Plus,
  Search,
  Send,
  Share2,
  Settings2,
  Smile,
  SunMedium,
  Tag,
  UserCircle2,
} from "lucide-react";
import { createTask, deleteTask, guestLogin, getCurrentUser, listTasks, updateTask } from "@/lib/api";
import type { Task, TaskPriority, TaskStatus, User } from "@/lib/types";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { TaskFormModal } from "./task-form-modal";
import { useTheme } from "next-themes";

type View = "login" | "tasks" | "task-detail" | "projects" | "profile";
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
  ON_HOLD: "On Hold",
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
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>("TODO");
  const [projects, setProjects] = useState<ProjectItem[]>(seedProjects);
  const [projectQuery, setProjectQuery] = useState("");
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(seedProjects[0]?.id ?? null);
  const [accent, setAccent] = useState<Accent>("blue");
  const [profile, setProfile] = useState(profileDefaults);
  const [openMenu, setOpenMenu] = useState<"workspace" | "user" | null>(null);
  const [openSubMenu, setOpenSubMenu] = useState<"theme" | "color" | null>(null);
  const [settingsTab, setSettingsTab] = useState<"profile" | "theme" | "color">("profile");
  const [sidebarVisible, setSidebarVisible] = useState(true);

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
      <div className="min-h-screen bg-white px-4 text-[#181818]">
        <main className="mx-auto flex min-h-screen w-full max-w-[384px] flex-col items-center justify-center">
          <div className="mb-6 flex items-center gap-2 text-[15px] font-semibold tracking-[-0.02em]">
            <PyramidMark />
            Pyramid
          </div>

          <Card className="w-full rounded-[25px] border-[#e2e2e2] bg-white px-6 py-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="text-center">
              <h1 className="text-[21px] font-semibold leading-7 tracking-[-0.03em]">Let&apos;s get back on track</h1>
              <p className="mt-1 text-sm leading-5 text-[#777]">Enter your email below to login to your account.</p>
            </div>

            <div className="mt-6 grid gap-3">
              <Button className="h-9 w-full rounded-full bg-[#181818] text-sm font-medium text-white hover:bg-[#181818]/90" onClick={handleGuestLogin} disabled={loadingAuth}>
                {loadingAuth ? "Creating guest session..." : "Continue as Guest"}
              </Button>
              <Button variant="secondary" className="h-9 w-full rounded-full border border-[#e1e1e1] bg-white text-sm font-medium text-[#181818] hover:bg-[#fafafa]" onClick={() => undefined}>
                <span className="text-base font-bold leading-none">G</span>
                Login with Google
              </Button>
            </div>
          </Card>

          <p className="mt-6 max-w-[230px] text-center text-xs leading-4 text-[#777]">
            By clicking continue, you agree to our <span className="underline">Terms of Service</span> and <span className="underline">Privacy Policy</span>
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#181818]">
      <div className="flex min-h-screen overflow-hidden">
        <aside className={`${sidebarVisible ? "lg:flex" : "lg:hidden"} hidden w-[264px] shrink-0 border-r border-[#ececec] bg-[#fafafa] px-3 py-3 lg:flex-col`}>
          <div className="relative">
            <button className="flex w-full items-center justify-between rounded-2xl px-2 py-2 text-left hover:bg-[color:var(--surface-2)]" onClick={() => setOpenMenu(openMenu === "user" ? null : "user")}>
              <div className="flex items-center gap-2">
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
                <SidebarButton active={view === "tasks"} icon={TasksNavIcon} label="Tasks" onClick={() => setView("tasks")} />
                <SidebarButton active={view === "projects"} icon={ProjectsNavIcon} label="Projects" onClick={() => setView("projects")} />
              </div>
            ) : (
              <div className="mt-1 grid gap-1 pl-2">
                <SidebarButton active={view === "tasks"} icon={TasksNavIcon} label="Tasks" onClick={() => setView("tasks")} />
                <SidebarButton active={view === "projects"} icon={ProjectsNavIcon} label="Projects" onClick={() => setView("projects")} />
              </div>
            )}
          </div>

          <div className="mt-auto hidden rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3">
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

        <main className="min-w-0 flex-1 overflow-auto bg-white">
          <div>
            <header className="flex h-[42px] items-center justify-between gap-3 border-b border-[#eeeeee] px-3">
              <div className="flex items-center gap-3">
                <button className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--border)] lg:hidden" onClick={() => setOpenMenu(openMenu === "workspace" ? null : "workspace") }>
                  <Menu size={18} />
                </button>
              <div>
                {view === "tasks" || view === "task-detail" ? (
                  <>
                  <button className="flex h-7 w-7 items-center justify-center text-[#181818] hover:bg-[#f5f5f5]" onClick={() => setSidebarVisible((current) => !current)} aria-label={sidebarVisible ? "Hide sidebar" : "Show sidebar"}>
                    <PanelLeft size={13} strokeWidth={1.8} />
                  </button>
                  <span className="h-3 w-px bg-[#d9d9d9]" aria-hidden="true" />
                  </>
                ) : (
                  <>
                    <div className="text-xs uppercase tracking-[0.22em] text-[color:var(--text-muted)]">{view}</div>
                    <h1 className="text-xl font-semibold sm:text-2xl">{view === "projects" ? "Projects" : "Profile"}</h1>
                  </>
                )}
              </div>
              </div>

            </header>

            <div className="px-4 py-5">
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
                  onCreate={(status) => { setEditingTask(null); setNewTaskStatus(status ?? "TODO"); setTaskDialogOpen(true); }}
                   onEdit={(task) => { setEditingTask(task); setTaskDialogOpen(true); }}
                  onDelete={handleDeleteTask}
                  onOpenDetail={(task) => { setSelectedTaskId(task.id); setView("task-detail"); }}
                />
              ) : null}

              {view === "task-detail" && activeTask ? <TaskDetailScreen task={activeTask} onBack={() => setView("tasks")} onEdit={() => { setEditingTask(activeTask); setTaskDialogOpen(true); }} /> : null}

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
        initialStatus={newTaskStatus}
        title={editingTask ? "Edit task" : "Create task"}
      />

      {projectDialogOpen ? <ProjectModal onClose={() => setProjectDialogOpen(false)} onCreate={(project) => { setProjects((current) => [project, ...current]); setSelectedProjectId(project.id); setProjectDialogOpen(false); }} /> : null}
    </div>
  );
}

function PyramidMark() {
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px] bg-[#181818] text-white" aria-hidden="true">
      <svg viewBox="36 28 90 100" className="h-5 w-5" fill="none">
        <path d="M81 39 49 93l17 25 46-11-31-68Z" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="m81 39-15 79 46-11" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function TasksNavIcon({ size = 15, className }: { size?: number; className?: string }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}><rect x="2" y="2" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.5" /><rect x="9.5" y="2" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.5" /><rect x="2" y="9.5" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.5" /><rect x="9.5" y="9.5" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.5" /></svg>;
}

function ProjectsNavIcon({ size = 15, className }: { size?: number; className?: string }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}><path d="M2.25 5.5h11.5v7.25a1 1 0 0 1-1 1H3.25a1 1 0 0 1-1-1V5.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="M5 2.25h6v3.25H5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="M2.25 8.25h11.5" stroke="currentColor" strokeWidth="1.5" /></svg>;
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
  onOpenDetail,
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
  onCreate: (status?: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onOpenDetail: (task: Task) => void;
}) {
  const [fieldsOpen, setFieldsOpen] = useState(false);
  const fieldsMenuRef = useRef<HTMLDivElement>(null);
  const [columnView, setColumnView] = useState<TaskMode>(mode);
  const [searchOpen, setSearchOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [cardMenuId, setCardMenuId] = useState<string | null>(null);
  const [visibleFields, setVisibleFields] = useState({ priority: false, members: true, dueDate: true, labels: true, status: false, reporter: false });
  const [collapsedSections, setCollapsedSections] = useState<Partial<Record<TaskStatus, boolean>>>({});
  const [columnOrder, setColumnOrder] = useState<TaskStatus[]>(["TODO", "IN_PROGRESS", "DONE", "ON_HOLD"]);
  const [draggedColumn, setDraggedColumn] = useState<TaskStatus | null>(null);
  const grouped = useMemo(() => ({
    TODO: tasks.filter((task) => task.status === "TODO"),
    IN_PROGRESS: tasks.filter((task) => task.status === "IN_PROGRESS"),
    DONE: tasks.filter((task) => task.status === "DONE"),
    ON_HOLD: tasks.filter((task) => task.status === "ON_HOLD"),
  }), [tasks]);

  useEffect(() => {
    setColumnView(mode);
  }, [mode]);

  useEffect(() => {
    if (!fieldsOpen) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (event.target instanceof Node && !fieldsMenuRef.current?.contains(event.target)) {
        setFieldsOpen(false);
      }
    };

    window.addEventListener("mousedown", closeOnOutsideClick);
    return () => window.removeEventListener("mousedown", closeOnOutsideClick);
  }, [fieldsOpen]);

  useEffect(() => {
    if (!cardMenuId) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (event.target instanceof Element && !event.target.closest("[data-task-menu]")) {
        setCardMenuId(null);
      }
    };

    window.addEventListener("mousedown", closeOnOutsideClick);
    return () => window.removeEventListener("mousedown", closeOnOutsideClick);
  }, [cardMenuId]);

  return (
    <div className="w-full space-y-3">
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xs font-semibold tracking-tight">Tasks</h2>
          <div className="flex items-center gap-2">
            <button className="flex h-7 w-7 items-center justify-center rounded border border-[#e8e8e8] bg-white text-[#222]" onClick={() => setSearchOpen((current) => !current)} aria-label="Search tasks">
              <Search size={12} />
            </button>
            {searchOpen ? <div className="relative"><Search size={12} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[#555]" /><Input className="h-7 w-[260px] rounded border-[#e8e8e8] py-0 pl-7 pr-2 text-xs" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks" autoFocus /></div> : null}
            <div ref={fieldsMenuRef} className="relative">
              <button className="flex h-7 items-center gap-1.5 rounded border border-[#e8e8e8] bg-white px-2 text-[10px]" onClick={() => setFieldsOpen((current) => !current)}>
                <Columns3 size={11} /> Fields
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
                     {([
                       ["Priority", "priority"], ["Members", "members"], ["Due Date", "dueDate"],
                       ["Labels", "labels"], ["Status", "status"], ["Reporter", "reporter"],
                     ] as const).map(([label, field]) => (
                       <label key={field} className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 hover:bg-[color:var(--surface-2)]">
                         <span>{label}</span>
                         <input type="checkbox" className="h-4 w-4 accent-[#181818]" checked={visibleFields[field]} onChange={() => setVisibleFields((current) => ({ ...current, [field]: !current[field] }))} />
                       </label>
                     ))}
                   </div>
                </Card>
              ) : null}
            </div>
            <button className="flex h-7 w-7 items-center justify-center rounded border border-[#e8e8e8] bg-white text-[#222]" onClick={() => setFilterOpen((current) => !current)} aria-label="Filter tasks">
              <Filter size={12} />
            </button>
            <Button className="h-7 rounded bg-[#181818] px-2 text-[10px] text-white hover:opacity-95" onClick={() => onCreate()}><Plus size={11} /> Add Task</Button>
          </div>
        </div>

        {filterOpen ? (
          <div className="flex gap-2">
            <select className="h-8 rounded border border-[#e8e8e8] px-2 text-xs" value={status} onChange={(event) => setStatus(event.target.value as TaskStatus | "")}><option value="">All statuses</option><option value="TODO">To Do</option><option value="IN_PROGRESS">Doing</option><option value="DONE">Completed</option><option value="ON_HOLD">On Hold</option></select>
            <select className="h-8 rounded border border-[#e8e8e8] px-2 text-xs" value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority | "")}><option value="">All priorities</option><option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option></select>
          </div>
        ) : null}

        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        {mode === "board" ? (
          <div className="overflow-x-auto pb-2">
            <div className="flex min-w-max gap-3">
            {columnOrder.map((key) => {
              const label = taskStatusLabels[key];
              return <Card key={key} className={`w-[289px] self-start rounded-[18px] border bg-[#f5f5f5] p-2 shadow-none ${draggedColumn === key ? "border-[#181818] opacity-60" : "border-[#e8e8e8]"}`} onDragOver={(event) => event.preventDefault()} onDrop={() => {
                if (!draggedColumn || draggedColumn === key) return;
                setColumnOrder((current) => {
                  const next = current.filter((item) => item !== draggedColumn);
                  next.splice(next.indexOf(key), 0, draggedColumn);
                  return next;
                });
                setDraggedColumn(null);
              }}>
                <div className="mb-2 flex items-center justify-between px-1 py-1 text-sm font-medium">
                  <span className="flex items-center gap-2">
                    <button draggable className="cursor-grab text-[10px] text-[color:var(--text-muted)] active:cursor-grabbing" onDragStart={() => setDraggedColumn(key)} onDragEnd={() => setDraggedColumn(null)} aria-label={`Drag ${label} column`}>⠿</button>
                    {label}
                  </span>
                  <div data-task-menu className="flex items-center gap-2 text-[color:var(--text-muted)]">
                    <button onClick={() => onCreate(key as TaskStatus)} aria-label={`Add task to ${label}`}><Plus size={14} /></button>
                    <button onClick={() => setCardMenuId(cardMenuId === `column-${key}` ? null : `column-${key}`)} aria-label={`${label} options`}><MoreHorizontal size={14} /></button>
                  </div>
                </div>
                <div className="space-y-2.5">
                  {grouped[key as keyof typeof grouped].map((task) => (
                    <TaskBoardCard key={task.id} task={task} fields={visibleFields} menuOpen={cardMenuId === task.id} onClick={() => onOpenDetail(task)} onMenu={() => setCardMenuId(cardMenuId === task.id ? null : task.id)} onEdit={() => onEdit(task)} onDelete={() => onDelete(task.id)} />
                  ))}
                  <button className="flex h-7 w-full items-center px-2 text-[10px] font-medium text-[#444] hover:text-[#181818]" onClick={() => onCreate(key as TaskStatus)}>+ Add Task</button>
                </div>
              </Card>;
            })}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {([
              ["TODO", "To Do"],
              ["IN_PROGRESS", "Doing"],
              ["DONE", "Completed"],
            ] as const).map(([key, label]) => (
              <section key={key} className="border-0">
                <div className="flex items-center justify-between px-0 py-1.5 text-xs font-medium">
                  <button className="flex items-center gap-1.5" onClick={() => setCollapsedSections((current) => ({ ...current, [key]: !current[key] }))}><ChevronDown size={12} className={collapsedSections[key] ? "-rotate-90" : ""} />{label}</button>
                </div>
                {!collapsedSections[key] ? <div className="overflow-hidden rounded-lg border border-[#e8e8e8]">
                  <table className="min-w-full text-xs">
                    <thead className="bg-[#f5f5f5] text-left text-xs text-[#181818]">
                      <tr>
                        <th className="px-3 py-2.5 font-medium">Task</th>
                        <th className="px-3 py-2.5 font-medium">Priority</th>
                        <th className="px-3 py-2.5 font-medium">Members</th>
                        <th className="px-3 py-2.5 font-medium">Due Date</th>
                        <th className="px-3 py-2.5 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(grouped[key as keyof typeof grouped] ?? []).map((task) => (
                        <tr key={task.id} className="border-t border-[#e8e8e8] hover:bg-[#fafafa]">
                          <td className="px-3 py-2.5"><button className="text-left font-medium" onClick={() => onOpenDetail(task)}>{task.title}</button></td>
                          <td className="px-3 py-2.5"><span className={`inline-flex items-center gap-1 ${task.priority === "HIGH" ? "text-red-500" : task.priority === "MEDIUM" ? "text-orange-500" : "text-zinc-400"}`}><PrioritySignal priority={task.priority} />{taskPriorityLabel[task.priority]}</span></td>
                          <td className="px-3 py-2.5"><AvatarStack count={task.priority === "HIGH" ? 3 : 2} /></td>
                          <td className="px-3 py-2.5 text-[#555]">{task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "--"}</td>
                          <td className="px-3 py-2.5 text-right"><button className="text-[color:var(--text-muted)] hover:text-[color:var(--text)]" onClick={() => setCardMenuId(cardMenuId === task.id ? null : task.id)} aria-label={`Actions for ${task.title}`}><MoreHorizontal size={14} /></button>{cardMenuId === task.id ? <div className="absolute right-4 z-20 mt-1 grid w-20 rounded border border-[#e8e8e8] bg-white p-1 text-left text-xs shadow-lg"><button className="rounded px-2 py-1 hover:bg-[#f5f5f5]" onClick={() => onEdit(task)}>Edit</button><button className="rounded px-2 py-1 text-red-600 hover:bg-[#fef2f2]" onClick={() => onDelete(task.id)}>Delete</button></div> : null}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button className="w-full border-t border-[#e8e8e8] px-3 py-2 text-left text-xs text-[#181818] hover:bg-[#fafafa]" onClick={() => onCreate(key)}>+ Add Task</button>
                </div> : null}
              </section>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function TaskBoardCard({ task, fields, menuOpen, onClick, onMenu, onEdit, onDelete }: { task: Task; fields: { priority: boolean; members: boolean; dueDate: boolean; labels: boolean; status: boolean; reporter: boolean }; menuOpen: boolean; onClick: () => void; onMenu: () => void; onEdit: () => void; onDelete: () => void }) {
  const details = {
    "Feature Testing Passed": { name: "QA Team", initials: "QA", labels: ["Testing", "Passed"], date: "30 Jul" },
    "UI Design Updated": { name: "Designer", initials: "D", labels: ["Design", "Updated"], date: "31 Jul" },
    "Security Audit Scheduled": { name: "Security", initials: "S", labels: ["Audit", "Scheduled"], date: "01 Aug" },
    "UI Review": { name: "Designer", initials: "D", labels: ["Review"], date: "02 Aug" },
    "Backend Integration": { name: "Dev Team", initials: "DT", labels: ["Development"], date: "03 Aug" },
    "User Feedback": { name: "Product", initials: "P", labels: ["Research"], date: "04 Aug" },
    "Performance Review": { name: "Engineer", initials: "E", labels: ["Optimization"], date: "05 Aug" },
  }[task.title] ?? { name: "Admin", initials: "A", labels: ["Deployment", "Deployment"], date: "29 Jul" };

  return (
    <div data-task-menu className="relative w-full cursor-pointer rounded-md border border-[#e8e8e8] bg-white p-2 text-left shadow-none hover:border-[#cfcfcf]" onClick={onClick} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onClick(); }}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-medium leading-4">{task.title}</p>
                        </div>
                        <button onClick={(event) => { event.stopPropagation(); onMenu(); }} aria-label={`Options for ${task.title}`}><MoreHorizontal size={11} className="text-[#777]" /></button>
                      </div>
                      {(fields.members || fields.dueDate || fields.priority) ? <div className="mt-2 flex items-center justify-between gap-2">
                        {fields.members ? <span className="inline-flex items-center gap-1 text-[11px] text-[#333]">
                          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-cyan-500 text-[7px] text-white">{details.initials}</div> {details.name}
                        </span> : <span />}
                        <span className="flex items-center gap-1">{fields.priority ? <Badge className="rounded-full bg-[#f5f5f5] px-1.5 py-0.5 text-[10px] text-[#333]">{task.priority}</Badge> : null}{fields.dueDate ? <Badge className="rounded-full bg-[#ffeded] px-1.5 py-0.5 text-[10px] text-[#f04444]">{details.date}</Badge> : null}</span>
                      </div> : null}
                      {fields.labels ? <div className="mt-1.5 flex flex-wrap gap-1">
                        {details.labels.map((label, index) => <Badge key={`${label}-${index}`} className="inline-flex items-center gap-1 rounded-full bg-[#f5f5f5] px-1.5 py-0.5 text-[10px] text-[#333]"><Tag size={10} strokeWidth={1.8} /> {label}</Badge>)}
                      </div> : null}
      {menuOpen ? <div className="absolute right-2 top-7 z-20 grid w-20 rounded border border-[#e8e8e8] bg-white p-1 text-[10px] shadow-lg"><button className="rounded px-2 py-1 text-left hover:bg-[#f5f5f5]" onClick={(event) => { event.stopPropagation(); onEdit(); }}>Edit</button><button className="rounded px-2 py-1 text-left text-red-600 hover:bg-[#fef2f2]" onClick={(event) => { event.stopPropagation(); onDelete(); }}>Delete</button></div> : null}
    </div>
  );
}

function PrioritySignal({ priority }: { priority: TaskPriority }) {
  const activeBars = priority === "HIGH" ? 3 : priority === "MEDIUM" ? 2 : 1;

  return (
    <span className="inline-flex h-3 items-end gap-[2px]" aria-hidden="true">
      {[1, 2, 3].map((bar) => <span key={bar} className={`${bar === 1 ? "h-[3px] w-[3px]" : bar === 2 ? "h-[7px] w-[3px]" : "h-[11px] w-[3px]"} rounded-full ${bar <= activeBars ? "bg-current" : "bg-current/20"}`} />)}
    </span>
  );
}

function TaskDetailScreen({ task, onBack, onEdit }: { task: Task; onBack: () => void; onEdit: () => void }) {
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<string[]>([]);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [labels, setLabels] = useState(["Research", "Design", "Deployment", "Testing"]);
  const [resource, setResource] = useState("");
  const dueDate = task.dueDate ? new Date(`${task.dueDate}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "No due date";

  return (
    <div className="relative w-full text-[#181818]">
      <button className="sr-only" onClick={onBack}>Back to tasks</button>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section>
          <div className="flex items-start justify-between gap-4 pr-2">
            <div><h1 className="text-xl font-semibold tracking-tight">{task.title}</h1><p className="mt-1 max-w-xl text-xs leading-4 text-[#777]">{task.description || "Create clear and detailed documentation to guide developers effectively."}</p></div>
            <div className="absolute right-0 top-0 flex items-center gap-1 pb-4">
              <button className="flex h-7 w-7 items-center justify-center rounded border border-[#e8e8e8] hover:bg-[#f5f5f5]" onClick={() => navigator.clipboard.writeText(window.location.href)} aria-label="Lock task"><Lock size={14} strokeWidth={2} /></button>
              <button className="flex h-7 items-center gap-1 rounded border border-[#e8e8e8] px-2 text-[#5968ff] hover:bg-[#f5f5f5]" onClick={() => navigator.clipboard.writeText(task.title)} aria-label="Watch task"><Eye size={14} strokeWidth={2} /> <span className="text-xs">1</span></button>
              <button className="flex h-7 w-7 items-center justify-center rounded border border-[#e8e8e8] hover:bg-[#f5f5f5]" onClick={() => navigator.share?.({ title: task.title })} aria-label="Share task"><Share2 size={14} strokeWidth={2} /></button>
              <button className="flex h-7 w-7 items-center justify-center rounded border border-[#e8e8e8] hover:bg-[#f5f5f5]" onClick={onEdit} aria-label="More task options"><MoreHorizontal size={15} strokeWidth={2.5} /></button>
              <button className="flex h-7 w-7 items-center justify-center rounded bg-[#f1f1f1] text-[#777] hover:bg-[#e8e8e8]" onClick={onBack} aria-label="Close task details"><PanelLeft size={14} strokeWidth={2} /></button>
            </div>
          </div>
          <div className="mt-5 grid gap-3 text-xs">
            <DetailRow label="Properties" value={<span className="inline-flex items-center gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-500 text-[9px] text-white">A</span> Admin <Badge className="bg-[#ffeded] text-[#f04444]"><CalendarDays size={10} /> 31 Jul</Badge></span>} />
            <DetailRow label="Labels" value={<span className="flex flex-wrap gap-1">{labels.map((label) => <Badge key={label} className="cursor-pointer bg-[#f5f5f5] text-[#333]" onClick={() => setLabels((current) => current.filter((item) => item !== label))}><Tag size={11} /> {label}</Badge>)}<button className="text-[#777]" onClick={() => setLabels((current) => [...current, "New label"])}>+</button></span>} />
            <DetailRow label="Resources" value={resource ? <a href={resource} className="text-blue-600 underline" target="_blank">{resource}</a> : <button className="text-[#777] hover:text-[#181818]" onClick={() => setResource("https://example.com")}>Add document or link...</button>} />
          </div>
          <h2 className="mt-6 text-xs font-semibold">Subtasks</h2>
          <div className="mt-2 max-w-[720px] overflow-hidden rounded-md border border-[#e8e8e8]">
            <table className="min-w-full text-xs"><thead className="bg-[#f5f5f5]"><tr><th className="px-3 py-2 text-left font-medium">Task</th><th className="px-3 py-2 text-left font-medium">Priority</th><th className="px-3 py-2 text-left font-medium">Members</th><th className="px-3 py-2 text-left font-medium">Due Date</th><th className="px-3 py-2 text-right font-medium">Actions</th></tr></thead><tbody>{["Subtask 1", "Subtask 2", "Subtask 3"].map((item, index) => <tr key={item} className="border-t border-[#e8e8e8]"><td className="px-3 py-2">{item}</td><td className={`px-3 py-2 ${index === 0 ? "text-red-500" : index === 1 ? "text-zinc-400" : "text-orange-500"}`}><PrioritySignal priority={index === 0 ? "HIGH" : index === 1 ? "LOW" : "MEDIUM"} /> {index === 0 ? "High" : index === 1 ? "Low" : "Medium"}</td><td className="px-3 py-2">Admin</td><td className="px-3 py-2">{dueDate}</td><td className="px-3 py-2 text-right"><MoreHorizontal size={14} /></td></tr>)}</tbody></table><button className="w-full border-t border-[#e8e8e8] px-3 py-2 text-left text-xs">+ Add Subtask</button>
          </div>
          <h2 className="mt-6 text-xs font-semibold">Subtasks</h2>
          <div className="mt-2 max-w-[720px] overflow-hidden rounded-md border border-[#e8e8e8] text-xs">
            <div className="flex items-start justify-between px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-500 text-[9px] text-white">A</span>
                <div className="flex items-center gap-2">
                  <div className="text-[11px] font-medium">Ankit Dutta</div>
                  <div className="text-[10px] text-[#777]">just now</div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[#181818]">
                <button aria-label="Add reaction" className="rounded p-1 hover:bg-[#f5f5f5]"><Smile size={14} strokeWidth={2} /></button>
                <button aria-label="More comment actions" className="rounded p-1 hover:bg-[#f5f5f5]"><MoreHorizontal size={14} /></button>
              </div>
            </div>
            <div className="px-3 pb-3 text-[15px] leading-5 text-[#181818]">dsds</div>
            <div className="border-t border-[#e8e8e8] px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-500 text-[9px] text-white">A</span>
                <div className="min-w-0 flex-1 text-[#777]">Leave a reply...</div>
                <button aria-label="Attach file" className="rounded p-1 text-[#181818] hover:bg-[#f5f5f5]"><Paperclip size={14} /></button>
                <button aria-label="Send reply" className="rounded p-1 text-[#181818] hover:bg-[#f5f5f5]"><Send size={14} /></button>
              </div>
            </div>
          </div>
          <div className="mt-3 max-w-[720px] rounded-md border border-[#e8e8e8] px-3 py-3 text-xs text-[#777]">
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">Add a comment...</div>
              <button aria-label="Attach file" className="rounded p-1 text-[#181818] hover:bg-[#f5f5f5]"><Paperclip size={14} /></button>
              <button aria-label="Send comment" className="rounded p-1 text-[#181818] hover:bg-[#f5f5f5]"><Send size={14} /></button>
            </div>
          </div>
        </section>
        <div className="flex w-full flex-col gap-3">
          <aside className="mt-20 w-full rounded-md border border-[#e8e8e8] p-4 text-xs">
            <div className="flex items-center justify-between border-b border-[#e8e8e8] pb-2 font-medium">Details <Settings2 size={12} /></div>
            <div className="grid gap-2.5 pt-3">
              <DetailRow label="Status" value={taskStatusLabels[task.status]} />
              <DetailRow label="Priority" value={<div className="relative"><button className="inline-flex items-center gap-1 text-red-500" onClick={() => setPriorityOpen((current) => !current)}><PrioritySignal priority={task.priority} /> {taskPriorityLabel[task.priority]} <ChevronUp size={11} /></button>{priorityOpen ? <div className="absolute left-0 top-6 z-10 w-40 rounded-md border border-[#e8e8e8] bg-white p-2 shadow-lg"><div className="px-2 pb-2 text-[11px] text-[#777]">Priority</div>{(["HIGH", "MEDIUM", "LOW"] as TaskPriority[]).map((priority, index) => <button key={priority} className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left hover:bg-[#f5f5f5]" onClick={() => { setPriorityOpen(false); }}><span className={`inline-flex items-center gap-1 ${priority === "HIGH" ? "text-red-500" : priority === "MEDIUM" ? "text-orange-500" : priority === "LOW" ? "text-zinc-400" : "text-zinc-400"}`}><PrioritySignal priority={priority} /> {priority === "HIGH" ? "Urgent" : taskPriorityLabel[priority]}</span>{index === 0 ? <span className="text-[#181818]">✓</span> : null}</button>)}</div> : null}</div>} />
              <DetailRow label="Members" value="Admin" />
              <DetailRow label="Dates" value={dueDate} />
              <DetailRow label="Labels" value="Deployment" />
              <DetailRow label="Teams" value="Development" />
              <DetailRow label="Reporter" value="Admin" />
            </div>
          </aside>
          <div className="w-full rounded-md border border-[#e8e8e8] px-3 py-2.5 text-xs">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#181818]"><ChevronDown size={12} /> <span>Updates</span></div>
            <div className="mt-2 flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#fff1f1] text-[9px] text-[#ff5a5a]"><span className="inline-block h-2 w-2 rounded-full bg-[#ff5a5a]" /></span>
              <div className="min-w-0">
                <div className="text-[11px] font-medium leading-4">You</div>
                <div className="truncate text-[11px] leading-4 text-[#777]">changed priority from No priority to Ur...</div>
              </div>
            </div>
            <div className="mt-3 flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500 text-[9px] text-white">A</span>
              <div className="min-w-0">
                <div className="text-[11px] font-medium leading-4">You</div>
                <div className="text-[11px] leading-4 text-[#777]">posted an update · Aug 2026</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex items-center gap-2.5 leading-4"><span className="w-[58px] shrink-0 text-[11px] text-[#777]">{label}</span><span className="min-w-0 text-[11px] text-[#181818]">{value}</span></div>;
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
