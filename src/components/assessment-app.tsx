"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Camera,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
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
  Settings,
  Settings2,
  Smile,
  SunMedium,
  Tag,
  UserCircle2,
  UserPlus,
  Upload,
} from "lucide-react";
import { createTask, deleteTask, guestLogin, getCurrentUser, listTasks, logout, updateTask } from "@/lib/api";
import type { Task, TaskPriority, TaskStatus, User } from "@/lib/types";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { TaskFormModal } from "./task-form-modal";
import { SubtaskFormModal, type SubtaskFormValue } from "./subtask-form-modal";
import { DatePickerField } from "./date-picker-field";
import { useTheme } from "next-themes";
import { buildProfileFromUser, guestProfileDefaults, getProfileStorageKey, getWorkspaceStateStorageKey } from "@/lib/profile-storage";
import { fallbackDueDate } from "@/lib/utils";

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

type ProfileState = {
  name: string;
  email: string;
  title: string;
  username: string;
  photo: string | null;
};

type WorkspaceState = {
  view: View;
  selectedTaskId: string | null;
  selectedProjectId: string | null;
};

const accentKey = "able-space.accent";
const validWorkspaceViews = new Set<View>(["tasks", "task-detail", "projects", "profile"]);

function readWorkspaceState(currentUser: User | null): WorkspaceState | null {
  if (typeof window === "undefined") return null;

  const rawState = window.localStorage.getItem(getWorkspaceStateStorageKey(currentUser));
  if (!rawState) return null;

  try {
    const parsed = JSON.parse(rawState) as Partial<WorkspaceState>;
    return {
      view: validWorkspaceViews.has(parsed.view as View) ? (parsed.view as View) : "tasks",
      selectedTaskId: typeof parsed.selectedTaskId === "string" ? parsed.selectedTaskId : null,
      selectedProjectId: typeof parsed.selectedProjectId === "string" ? parsed.selectedProjectId : null,
    };
  } catch {
    return null;
  }
}

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

function projectPriorityToTaskPriority(priority: ProjectItem["priority"]): TaskPriority {
  if (priority === "High") return "HIGH";
  if (priority === "Medium") return "MEDIUM";
  return "LOW";
}

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

export function AssessmentApp() {
  const { setTheme } = useTheme();
  const [ready, setReady] = useState(false);
  const [booting, setBooting] = useState(true);
  const [view, setView] = useState<View>("login");
  const [loadingAuth, setLoadingAuth] = useState(false);
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
  const [editingProject, setEditingProject] = useState<ProjectItem | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(seedProjects[0]?.id ?? null);
  const [accent, setAccent] = useState<Accent>("black");
  const [profile, setProfile] = useState<ProfileState>(guestProfileDefaults);
  const [openMenu, setOpenMenu] = useState<"workspace" | "user" | null>(null);
  const [openSubMenu, setOpenSubMenu] = useState<"theme" | "color" | null>(null);
  const [settingsTab, setSettingsTab] = useState<"profile" | "theme" | "color">("profile");
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const storedAccent = window.localStorage.getItem(accentKey) as Accent | null;

    if (storedAccent) {
      setAccent(storedAccent);
    }

    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;

    let active = true;

    getCurrentUser()
      .then(async (currentUser) => {
        if (!active) return;

        if (!currentUser) {
          if (window.localStorage.getItem("able-space.guest-session") === "true") {
            const response = await guestLogin();
            if (!active) return;
            setUser(response.user);
            {
              const storageKey = getProfileStorageKey(response.user);
              const storedProfile = window.localStorage.getItem(storageKey);
              if (storedProfile) {
                try {
                  setProfile({ ...buildProfileFromUser(response.user), ...JSON.parse(storedProfile) });
                } catch {
                  setProfile(buildProfileFromUser(response.user));
                }
              } else {
                setProfile(buildProfileFromUser(response.user));
              }
            }
            const workspaceState = readWorkspaceState(response.user);
            setView(workspaceState?.view ?? "tasks");
            setSelectedTaskId(workspaceState?.selectedTaskId ?? null);
            setSelectedProjectId(workspaceState?.selectedProjectId ?? seedProjects[0]?.id ?? null);
            await loadTasks();
            return;
          }

          clearSession();
          return;
        }

        if (currentUser.isGuest) {
          setUser(currentUser);
          {
            const storageKey = getProfileStorageKey(currentUser);
            const storedProfile = window.localStorage.getItem(storageKey);
            if (storedProfile) {
              try {
                setProfile({ ...buildProfileFromUser(currentUser), ...JSON.parse(storedProfile) });
              } catch {
                setProfile(buildProfileFromUser(currentUser));
              }
            } else {
              setProfile(buildProfileFromUser(currentUser));
            }
          }
          const workspaceState = readWorkspaceState(currentUser);
          setView(workspaceState?.view ?? "tasks");
          setSelectedTaskId(workspaceState?.selectedTaskId ?? null);
          setSelectedProjectId(workspaceState?.selectedProjectId ?? seedProjects[0]?.id ?? null);
          await loadTasks();
          return;
        }

        setUser(currentUser);
        {
          const storageKey = getProfileStorageKey(currentUser);
          const storedProfile = window.localStorage.getItem(storageKey);
          const baseProfile = buildProfileFromUser(currentUser);
          if (storedProfile) {
            try {
              setProfile({ ...baseProfile, ...JSON.parse(storedProfile) });
            } catch {
              setProfile(baseProfile);
            }
          } else {
            setProfile(baseProfile);
          }
        }
        const workspaceState = readWorkspaceState(currentUser);
        setView(workspaceState?.view ?? "tasks");
        setSelectedTaskId(workspaceState?.selectedTaskId ?? null);
        setSelectedProjectId(workspaceState?.selectedProjectId ?? seedProjects[0]?.id ?? null);
        void loadTasks();
      })
      .catch(() => {
        if (active) clearSession();
      })
      .finally(() => {
        if (active) setBooting(false);
      });

    return () => {
      active = false;
    };
  }, [ready]);

  useEffect(() => {
    document.documentElement.dataset.accent = accent;
    window.localStorage.setItem(accentKey, accent);
  }, [accent]);

  useEffect(() => {
    if (!ready || !user) return;

    window.localStorage.setItem(getProfileStorageKey(user), JSON.stringify(profile));
  }, [profile, ready, user]);

  useEffect(() => {
    if (!ready || !user) return;

    const workspaceState: WorkspaceState = {
      view,
      selectedTaskId,
      selectedProjectId,
    };

    window.localStorage.setItem(getWorkspaceStateStorageKey(user), JSON.stringify(workspaceState));
  }, [ready, selectedProjectId, selectedTaskId, user, view]);

  useEffect(() => {
    if (view !== "tasks") return;
    const handler = window.setTimeout(() => {
      void loadTasks();
    }, 120);

    return () => window.clearTimeout(handler);
  }, [taskQuery, taskStatus, taskPriority, view]);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [view]);

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

  const displayProfile = profile;

  async function loadTasks() {
    try {
      const response = await listTasks({
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
    if (user) {
      window.localStorage.removeItem(getWorkspaceStateStorageKey(user));
      window.localStorage.removeItem(getProfileStorageKey(user));
    }
    setUser(null);
    setTasks([]);
    setView("login");
    setSelectedTaskId(null);
    setSelectedProjectId(seedProjects[0]?.id ?? null);
    setTaskError(null);
    setOpenMenu(null);
    setOpenSubMenu(null);
    setMobileSidebarOpen(false);
    window.localStorage.removeItem("able-space.guest-session");
  }

  async function handleGuestLogin() {
    setLoadingAuth(true);
    try {
      const response = await guestLogin();
      setUser(response.user);
      setProfile(guestProfileDefaults);
      window.localStorage.setItem("able-space.guest-session", "true");
      setView("tasks");
      await loadTasks();
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
    if (editingTask) {
      await updateTask(editingTask.id, payload);
    } else {
      await createTask(payload);
    }

    setEditingTask(null);
    setTaskDialogOpen(false);
    await loadTasks();
  }

  async function handleDeleteTask(id: string) {
    await deleteTask(id);
    await loadTasks();
  }

  async function handleToggleTheme(nextTheme: "light" | "dark") {
    setTheme(nextTheme);
  }

  async function handleLogout() {
    try {
      await logout();
    } finally {
      clearSession();
    }
  }

  function handleToggleUserMenu() {
    setOpenMenu((current) => (current === "user" ? null : "user"));
    setOpenSubMenu(null);
  }

  function handleToggleWorkspaceMenu() {
    setOpenMenu((current) => (current === "workspace" ? null : "workspace"));
    setOpenSubMenu(null);
  }

  if (!ready || booting) {
    return (
      <div className="min-h-screen bg-[color:var(--background)] px-4 text-[color:var(--text)]">
        <main className="mx-auto flex min-h-screen w-full max-w-[384px] items-center justify-center text-sm text-[color:var(--text-muted)]">
          Loading...
        </main>
      </div>
    );
  }

  if (view === "login") {
    return (
      <div className="min-h-screen bg-[color:var(--background)] px-4 text-[color:var(--text)]">
        <main className="mx-auto flex min-h-screen w-full max-w-[384px] flex-col items-center justify-center">
          <div className="mb-6 flex items-center gap-2 text-[15px] font-semibold tracking-[-0.02em]">
            <PyramidMark />
            Pyramid workspace
          </div>

          <Card className="w-full rounded-[25px] border-[color:var(--border)] bg-[color:var(--surface)] px-6 py-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="text-center">
              <h1 className="text-[21px] font-semibold leading-7 tracking-[-0.03em]">Let&apos;s get back on track</h1>
              <p className="mt-1 text-sm leading-5 text-[color:var(--text-muted)]">Enter your email below to login to your account.</p>
            </div>

            <div className="mt-6 grid gap-3">
              <Button className="h-9 w-full rounded-full text-sm font-medium" onClick={handleGuestLogin} disabled={loadingAuth}>
                {loadingAuth ? "Creating guest session..." : "Continue as Guest"}
              </Button>
              <Button variant="secondary" className="h-9 w-full rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] text-sm font-medium text-[color:var(--text)] hover:bg-[color:var(--surface-2)]" onClick={() => undefined}>
                <span className="text-base font-bold leading-none">G</span>
                Login with Google
              </Button>
            </div>
          </Card>

          <p className="mt-6 max-w-[230px] text-center text-xs leading-4 text-[color:var(--text-muted)]">
            By clicking continue, you agree to our <span className="underline">Terms of Service</span> and <span className="underline">Privacy Policy</span>
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[color:var(--background)] text-[color:var(--text)]">
      <div className="flex min-h-screen overflow-hidden">
        {view !== "profile" && mobileSidebarOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            aria-label="Close sidebar"
            onClick={() => setMobileSidebarOpen(false)}
          />
        ) : null}

        <aside className={`${view === "profile" ? "hidden" : mobileSidebarOpen ? "flex" : "hidden"} ${view === "profile" ? "hidden" : sidebarVisible ? "lg:flex" : "lg:hidden"} fixed inset-y-0 left-0 z-50 w-[min(264px,calc(100vw-3rem))] shrink-0 flex-col overflow-y-auto border-r border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-3 shadow-2xl lg:static lg:z-auto lg:w-[264px] lg:overflow-visible lg:shadow-none`}>
          <div className="relative">
            <button
              type="button"
              className="flex w-full cursor-pointer items-center justify-between rounded-2xl px-2 py-2 text-left hover:bg-[color:var(--surface-2)]"
              aria-expanded={openMenu === "user"}
              onMouseDown={(event) => {
                if (event.button !== 0) return;
                event.preventDefault();
                event.stopPropagation();
                handleToggleUserMenu();
              }}
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleToggleUserMenu();
                }
              }}
            >
              <div className="flex items-center gap-2">
                {displayProfile.photo ? (
                  <img src={displayProfile.photo} alt="Profile" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--primary)] text-xs font-semibold text-white">{displayProfile.name.slice(0, 1)}</div>
                )}
                <div>
                  <p className="text-sm font-medium">{displayProfile.name}</p>
                  <p className="text-xs text-[color:var(--text-muted)]">{displayProfile.email}</p>
                </div>
              </div>
              <ChevronDown size={14} className="text-[color:var(--text-muted)]" />
            </button>
            {openMenu === "user" ? <UserMenu profile={displayProfile} accent={accent} onAccentChange={setAccent} onThemeChange={handleToggleTheme} onNavigateProfile={() => setView("profile")} onLogout={handleLogout} onClose={() => setOpenMenu(null)} /> : null}
          </div>

          <div className="mt-4 rounded-2xl px-2 py-2">
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-xl px-2 py-2 text-sm text-[color:var(--text-muted)] hover:bg-[color:var(--surface-2)] hover:text-[color:var(--text)]"
              aria-expanded={openMenu === "workspace"}
              onClick={handleToggleWorkspaceMenu}
            >
              <span>Workspace</span>
              <ChevronDown size={14} className={`transition-transform ${openMenu === "workspace" ? "rotate-180" : ""}`} />
            </button>
            {openMenu === "workspace" ? (
              <div className="mt-1 grid gap-1 pl-2">
                <SidebarButton active={view === "tasks"} icon={TasksNavIcon} label="Tasks" onClick={() => { setView("tasks"); setMobileSidebarOpen(false); }} />
                <SidebarButton active={view === "projects"} icon={ProjectsNavIcon} label="Projects" onClick={() => { setView("projects"); setMobileSidebarOpen(false); }} />
              </div>
            ) : null}
          </div>

          <div className="mt-auto hidden rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3">
              <button className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left hover:bg-[color:var(--surface)]" onClick={() => { setView("profile"); setMobileSidebarOpen(false); }}>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--primary)] text-white">{displayProfile.name.slice(0, 1)}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{displayProfile.name}</p>
                <p className="truncate text-xs text-[color:var(--text-muted)]">{displayProfile.email}</p>
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

        <main className="min-w-0 flex-1 overflow-auto bg-[color:var(--background)]">
          <div>
            {view !== "profile" ? (
              <header className="flex min-h-[42px] flex-wrap items-center justify-between gap-3 border-b border-[color:var(--border)] px-3 py-2">
                <div className="flex items-center gap-3">
                  <button className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--border)] lg:hidden" aria-expanded={mobileSidebarOpen} onClick={() => setMobileSidebarOpen((current) => !current)}>
                    <Menu size={18} />
                  </button>
                  <div>
                  {view === "tasks" || view === "task-detail" ? (
                    <>
                      <button className="hidden h-7 w-7 items-center justify-center text-[color:var(--text)] hover:bg-[color:var(--surface-2)] lg:flex" onClick={() => setSidebarVisible((current) => !current)} aria-label={sidebarVisible ? "Hide sidebar" : "Show sidebar"}>
                        <PanelLeft size={13} strokeWidth={1.8} />
                      </button>
                    </>
                  ) : view === "projects" ? (
                    <>
                      <button className="hidden h-7 w-7 items-center justify-center text-[color:var(--text)] hover:bg-[color:var(--surface-2)] lg:flex" onClick={() => setSidebarVisible((current) => !current)} aria-label={sidebarVisible ? "Hide sidebar" : "Show sidebar"}>
                        <PanelLeft size={13} strokeWidth={1.8} />
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="text-xs uppercase tracking-[0.22em] text-[color:var(--text-muted)]">{view}</div>
                      <h1 className="text-xl font-semibold sm:text-2xl">Profile</h1>
                    </>
                  )}
                  </div>
                </div>
              </header>
            ) : null}

            <div className={view === "profile" ? "px-0 py-0" : "px-3 py-4 sm:px-4 sm:py-5"}>
              {view === "tasks" ? (
                <TasksScreen
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
                  onOpenAdd={() => {
                    setEditingProject(null);
                    setProjectDialogOpen(true);
                  }}
                  onEditProject={(project) => {
                    setEditingProject(project);
                    setProjectDialogOpen(true);
                  }}
                  onDeleteProject={(projectId) => {
                    setProjects((current) => current.filter((project) => project.id !== projectId));
                    setSelectedProjectId((current) => (current === projectId ? null : current));
                  }}
                />
              ) : null}

              {view === "profile" ? (
                <ProfileScreen
                  profile={profile}
                  setProfile={setProfile}
                  accent={accent}
                  setAccent={setAccent}
                  onThemeChange={handleToggleTheme}
                  onLogout={handleLogout}
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

      {projectDialogOpen ? (
        <ProjectModal
          initialProject={editingProject}
          onClose={() => {
            setProjectDialogOpen(false);
            setEditingProject(null);
          }}
          onSubmit={(project) => {
            setProjects((current) =>
              editingProject ? current.map((item) => (item.id === project.id ? project : item)) : [project, ...current],
            );
            setSelectedProjectId(project.id);
            setProjectDialogOpen(false);
            setEditingProject(null);
          }}
        />
      ) : null}
    </div>
  );
}

function PyramidMark() {
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px] bg-[color:var(--primary)] text-white" aria-hidden="true">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
        <path d="M6 18.5 12 5l6 13.5H6Z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
        <path d="M12 5 9 18.5M12 5l3 13.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function PencilIcon({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M11.5 1.8 14.2 4.5l-8.7 8.7-3.4.7.7-3.4 8.7-8.7Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="m9.9 3.4 2.7 2.7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
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
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[15px] font-medium transition ${active ? "bg-[color:var(--primary-soft)] text-[color:var(--primary)]" : "text-[color:var(--text-muted)] hover:bg-[color:var(--surface-2)] hover:text-[color:var(--text)]"}`}
      onClick={onClick}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

function UserMenu({ profile, accent, onAccentChange, onThemeChange, onNavigateProfile, onLogout, onClose }: { profile: ProfileState; accent: Accent; onAccentChange: (accent: Accent) => void; onThemeChange: (theme: "light" | "dark") => void; onNavigateProfile: () => void; onLogout: () => void; onClose: () => void; }) {
  const { resolvedTheme } = useTheme();
  const [submenu, setSubmenu] = useState<"theme" | "color" | null>(null);
  const currentTheme = resolvedTheme ?? "light";

  useEffect(() => {
    const handle = (event: MouseEvent) => {
      if (!(event.target instanceof HTMLElement)) return;
      if (!event.target.closest("[data-user-menu]")) onClose();
    };
    window.addEventListener("click", handle);
    return () => window.removeEventListener("click", handle);
  }, [onClose]);

  return (
    <div data-user-menu className="absolute left-0 top-[calc(100%+10px)] z-50 flex items-start gap-4">
      <div className="w-[246px] rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-2 shadow-2xl">
          <div className="border-b border-[color:var(--border)] px-3 py-4 text-center">
          {profile.photo ? (
            <img src={profile.photo} alt="Profile" className="mx-auto h-14 w-14 rounded-full object-cover" />
          ) : (
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[color:var(--primary)] text-lg font-semibold text-white">{profile.name.slice(0, 1)}</div>
          )}
          <div className="mt-3 font-semibold leading-5 text-[color:var(--text)]">{profile.name}</div>
          <div className="text-sm text-[color:var(--text-muted)]">{profile.email}</div>
        </div>

        <div className="w-full p-2">
          <div className="relative">
            <MenuItem icon={SunMedium} label="Change Theme" onClick={() => setSubmenu(submenu === "theme" ? null : "theme")} />
            {submenu === "theme" ? (
              <div className="mt-1 w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-2 shadow-sm sm:absolute sm:left-[calc(100%+24px)] sm:top-0 sm:mt-0 sm:w-[210px] sm:shadow-2xl">
                <div className="px-3 py-2 text-sm text-[color:var(--text-muted)]">Theme</div>
                <SubMenuItem icon={SunMedium} label="Light" selected={currentTheme === "light"} onClick={() => onThemeChange("light")} />
                <SubMenuItem icon={MoonStar} label="Dark" selected={currentTheme === "dark"} onClick={() => onThemeChange("dark")} />
              </div>
            ) : null}
          </div>
          <div className="relative mt-1">
            <MenuItem icon={Palette} label="Color Mode" onClick={() => setSubmenu(submenu === "color" ? null : "color")} />
            {submenu === "color" ? (
              <div className="mt-1 w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-2 shadow-sm sm:absolute sm:left-[calc(100%+24px)] sm:top-0 sm:mt-0 sm:w-[210px] sm:shadow-2xl">
                <div className="px-3 py-2 text-sm text-[color:var(--text-muted)]">Color Mode</div>
                {accentOptions.map((option) => (
                  <SubMenuItem key={option.value} label={option.label} swatch={option.value} selected={accent === option.value} onClick={() => onAccentChange(option.value)} />
                ))}
              </div>
            ) : null}
          </div>
          <MenuItem icon={Settings2} label="Settings" onClick={onNavigateProfile} showArrow={false} />
        </div>
      </div>
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger, showArrow = true }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; onClick: () => void; danger?: boolean; showArrow?: boolean; }) {
  return (
    <button className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-[color:var(--surface-2)] ${danger ? "text-red-600" : "text-[color:var(--text)]"}`} onClick={onClick}>
      <Icon size={14} />
      {label}
      {showArrow ? (
        <svg className="ml-auto" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M5 3.5L8.5 7L5 10.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
    </button>
  );
}

function SubMenuItem({ icon: Icon, label, onClick, swatch, selected }: { icon?: React.ComponentType<{ size?: number; className?: string }>; label: string; onClick: () => void; swatch?: Accent; selected?: boolean; }) {
  return (
    <button className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-[color:var(--surface-2)] ${selected ? "bg-[color:var(--surface-2)]" : ""}`} onClick={onClick}>
      {swatch ? <span className={`h-3.5 w-3.5 rounded-sm ${accentSwatches[swatch]}`} /> : Icon ? <Icon size={13} /> : null}
      <span className="flex-1 text-left">{label}</span>
      {selected ? <Check size={14} className="text-[color:var(--text)]" /> : null}
    </button>
  );
}

function TasksScreen({
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
  const [columnDropTarget, setColumnDropTarget] = useState<{ key: TaskStatus; position: "before" | "after" } | null>(null);
  const grouped = useMemo(() => ({
    TODO: tasks.filter((task) => task.status === "TODO"),
    IN_PROGRESS: tasks.filter((task) => task.status === "IN_PROGRESS"),
    DONE: tasks.filter((task) => task.status === "DONE"),
    ON_HOLD: tasks.filter((task) => task.status === "ON_HOLD"),
  }), [tasks]);

  function handleColumnDragStart(event: React.DragEvent<HTMLElement>, key: TaskStatus, label: string) {
    setDraggedColumn(key);

    const column = event.currentTarget.closest("[data-board-column]");
    const ghost = column ? column.cloneNode(true) as HTMLElement : document.createElement("div");

    if (!column) {
      ghost.style.width = "220px";
      ghost.style.padding = "12px 14px";
      ghost.style.borderRadius = "16px";
      ghost.style.border = "1px solid var(--border)";
      ghost.style.background = "rgba(255,255,255,0.95)";
      ghost.style.boxShadow = "0 14px 40px rgba(15,23,42,0.18)";
      ghost.style.fontSize = "14px";
      ghost.style.fontWeight = "600";
      ghost.style.color = "var(--text)";
      ghost.textContent = label;
    }

    ghost.style.position = "fixed";
    ghost.style.top = "-1000px";
    ghost.style.left = "-1000px";
    ghost.style.pointerEvents = "none";
    ghost.style.opacity = "0.98";
    ghost.style.transform = "scale(0.98)";

    document.body.appendChild(ghost);
    event.dataTransfer.setDragImage(ghost, 140, 24);
    event.dataTransfer.effectAllowed = "move";
    window.setTimeout(() => ghost.remove(), 0);
  }

  function handleColumnDragOver(event: React.DragEvent<HTMLElement>, key: TaskStatus) {
    event.preventDefault();

    if (!draggedColumn || draggedColumn === key) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const position = event.clientX < rect.left + rect.width / 2 ? "before" : "after";
    setColumnDropTarget({ key, position });
  }

  function handleColumnDrop(key: TaskStatus) {
    if (!draggedColumn || draggedColumn === key) return;

    setColumnOrder((current) => {
      const next = current.filter((item) => item !== draggedColumn);
      const targetIndex = next.indexOf(key);
      const insertIndex = targetIndex + (columnDropTarget?.key === key && columnDropTarget.position === "after" ? 1 : 0);
      next.splice(insertIndex, 0, draggedColumn);
      return next;
    });

    setDraggedColumn(null);
    setColumnDropTarget(null);
  }

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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <h2 className="text-xs font-semibold tracking-tight">Tasks</h2>
          <div className="flex flex-wrap items-center gap-2">
            <button className="flex h-7 w-7 items-center justify-center rounded border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text)]" onClick={() => setSearchOpen((current) => !current)} aria-label="Search tasks">
              <Search size={12} />
            </button>
            {searchOpen ? <div className="relative w-full sm:w-auto"><Search size={12} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]" /><Input className="h-7 w-full rounded border-[color:var(--border)] py-0 pl-7 pr-2 text-xs sm:w-[260px]" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks" autoFocus /></div> : null}
            <div ref={fieldsMenuRef} className="relative">
              <button className="flex h-7 items-center gap-1.5 rounded border border-[color:var(--border)] bg-[color:var(--surface)] px-2 text-[10px]" onClick={() => setFieldsOpen((current) => !current)}>
                <Columns3 size={11} /> Fields
              </button>
              {fieldsOpen ? (
                <Card className="absolute left-0 top-[calc(100%+8px)] z-30 w-[min(270px,calc(100vw-2rem))] p-2 shadow-[0_16px_50px_rgba(15,23,42,0.14)] sm:left-auto sm:right-0 sm:w-[270px]">
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
                          <input type="checkbox" className="h-4 w-4 accent-[color:var(--primary)]" checked={visibleFields[field]} onChange={() => setVisibleFields((current) => ({ ...current, [field]: !current[field] }))} />
                       </label>
                     ))}
                   </div>
                </Card>
              ) : null}
            </div>
            <button className="flex h-7 w-7 items-center justify-center rounded border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text)]" onClick={() => setFilterOpen((current) => !current)} aria-label="Filter tasks">
              <Filter size={12} />
            </button>
            <Button className="h-7 rounded px-2 text-[10px] text-white" onClick={() => onCreate()}><Plus size={11} /> Add Task</Button>
          </div>
        </div>

        {filterOpen ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <select className="h-8 rounded border border-[color:var(--border)] bg-[color:var(--surface)] px-2 text-xs" value={status} onChange={(event) => setStatus(event.target.value as TaskStatus | "")}><option value="">All statuses</option><option value="TODO">To Do</option><option value="IN_PROGRESS">Doing</option><option value="DONE">Completed</option><option value="ON_HOLD">On Hold</option></select>
            <select className="h-8 rounded border border-[color:var(--border)] bg-[color:var(--surface)] px-2 text-xs" value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority | "")}><option value="">All priorities</option><option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option></select>
          </div>
        ) : null}

        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        {mode === "board" ? (
          <div className="space-y-3 pb-2">
            <div className="grid gap-3 lg:hidden">
              {columnOrder.map((key) => {
                const label = taskStatusLabels[key];
                return <Card key={key} data-board-column className={`w-full self-start rounded-[18px] border bg-[color:var(--surface-2)] p-2 shadow-none ${draggedColumn === key ? "border-[color:var(--text)] opacity-60 ring-2 ring-[color:var(--text)]/10" : columnDropTarget?.key === key ? columnDropTarget.position === "before" ? "border-l-4 border-l-[color:var(--text)] border-[color:var(--border)]" : "border-r-4 border-r-[color:var(--text)] border-[color:var(--border)]" : "border-[color:var(--border)]"}`} onDragOver={(event) => handleColumnDragOver(event, key)} onDragLeave={() => setColumnDropTarget((current) => current?.key === key ? null : current)} onDrop={() => handleColumnDrop(key)}>
                  <div className="mb-2 flex items-center justify-between px-1 py-1 text-sm font-medium">
                    <span className="flex items-center gap-2">
                      <button
                        draggable
                        className="cursor-grab text-[10px] text-[color:var(--text-muted)] active:cursor-grabbing"
                        onDragStart={(event) => handleColumnDragStart(event, key, label)}
                        onDragEnd={() => {
                          setDraggedColumn(null);
                          setColumnDropTarget(null);
                        }}
                        aria-label={`Drag ${label} column`}
                      >
                        ⠿
                      </button>
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
                    <button className="flex h-7 w-full items-center px-2 text-[10px] font-medium text-[color:var(--text-muted)] hover:text-[color:var(--text)]" onClick={() => onCreate(key as TaskStatus)}>+ Add Task</button>
                  </div>
                </Card>;
              })}
            </div>

            <div className="hidden lg:block">
              <div className="overflow-x-auto pb-2">
                <div className="flex min-w-max gap-3">
                  {columnOrder.map((key) => {
                    const label = taskStatusLabels[key];
                    return <Card key={key} data-board-column className={`w-[289px] self-start rounded-[18px] border bg-[color:var(--surface-2)] p-2 shadow-none ${draggedColumn === key ? "border-[color:var(--text)] opacity-60 ring-2 ring-[color:var(--text)]/10" : columnDropTarget?.key === key ? columnDropTarget.position === "before" ? "border-l-4 border-l-[color:var(--text)] border-[color:var(--border)]" : "border-r-4 border-r-[color:var(--text)] border-[color:var(--border)]" : "border-[color:var(--border)]"}`} onDragOver={(event) => handleColumnDragOver(event, key)} onDragLeave={() => setColumnDropTarget((current) => current?.key === key ? null : current)} onDrop={() => handleColumnDrop(key)}>
                      <div className="mb-2 flex items-center justify-between px-1 py-1 text-sm font-medium">
                        <span className="flex items-center gap-2">
                          <button
                            draggable
                            className="cursor-grab text-[10px] text-[color:var(--text-muted)] active:cursor-grabbing"
                            onDragStart={(event) => handleColumnDragStart(event, key, label)}
                            onDragEnd={() => {
                              setDraggedColumn(null);
                              setColumnDropTarget(null);
                            }}
                            aria-label={`Drag ${label} column`}
                          >
                            ⠿
                          </button>
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
                        <button className="flex h-7 w-full items-center px-2 text-[10px] font-medium text-[color:var(--text-muted)] hover:text-[color:var(--text)]" onClick={() => onCreate(key as TaskStatus)}>+ Add Task</button>
                      </div>
                    </Card>;
                  })}
                </div>
              </div>
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
                {!collapsedSections[key] ? <div className="overflow-hidden rounded-lg border border-[color:var(--border)]">
                  <div className="grid gap-3 p-3 lg:hidden">
                    {(grouped[key as keyof typeof grouped] ?? []).map((task) => (
                      <Card key={task.id} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <button className="text-left font-medium" onClick={() => onOpenDetail(task)}>{task.title}</button>
                            <p className="mt-1 text-xs text-[color:var(--text-muted)]">{task.description || "No description"}</p>
                          </div>
                          <button className="text-[color:var(--text-muted)]" onClick={() => setCardMenuId(cardMenuId === task.id ? null : task.id)} aria-label={`Actions for ${task.title}`}>
                            <MoreHorizontal size={14} />
                          </button>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          <Badge className={task.status === "TODO" ? "bg-amber-500/10 text-amber-700 dark:text-amber-300" : task.status === "IN_PROGRESS" ? "bg-sky-500/10 text-sky-700 dark:text-sky-300" : task.status === "DONE" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300"}>{taskStatusLabels[task.status]}</Badge>
                          <Badge className={task.priority === "HIGH" ? "bg-rose-500/10 text-rose-700 dark:text-rose-300" : task.priority === "MEDIUM" ? "bg-violet-500/10 text-violet-700 dark:text-violet-300" : "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300"}>{taskPriorityLabel[task.priority]}</Badge>
                          <span className="text-[color:var(--text-muted)]">{task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : fallbackDueDate(`${task.id}-${task.title}`)}</span>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button variant="secondary" size="sm" onClick={() => onEdit(task)}>Edit</Button>
                          <Button variant="secondary" size="sm" onClick={() => onDelete(task.id)}>Delete</Button>
                        </div>
                      </Card>
                    ))}
                  </div>

                  <div className="hidden lg:block">
                  <table className="min-w-full text-xs">
                    <thead className="bg-[color:var(--surface-2)] text-left text-xs text-[color:var(--text)]">
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
                        <tr key={task.id} className="border-t border-[color:var(--border)] hover:bg-[color:var(--surface-2)]">
                          <td className="px-3 py-2.5"><button className="text-left font-medium" onClick={() => onOpenDetail(task)}>{task.title}</button></td>
                          <td className="px-3 py-2.5"><span className={`inline-flex items-center gap-1 ${task.priority === "HIGH" ? "text-red-500" : task.priority === "MEDIUM" ? "text-orange-500" : "text-zinc-400"}`}><PrioritySignal priority={task.priority} />{taskPriorityLabel[task.priority]}</span></td>
                          <td className="px-3 py-2.5"><AvatarStack count={task.priority === "HIGH" ? 3 : 2} /></td>
                          <td className="px-3 py-2.5 text-[color:var(--text-muted)]">{task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : fallbackDueDate(`${task.id}-${task.title}`)}</td>
                          <td data-task-menu className="relative px-3 py-2.5 text-right"><button className="text-[color:var(--text-muted)] hover:text-[color:var(--text)]" onClick={() => setCardMenuId(cardMenuId === task.id ? null : task.id)} aria-label={`Actions for ${task.title}`}><MoreHorizontal size={14} /></button>{cardMenuId === task.id ? <div className="absolute right-4 z-20 mt-1 grid w-20 rounded border border-[color:var(--border)] bg-[color:var(--surface)] p-1 text-left text-xs shadow-lg"><button className="rounded px-2 py-1 hover:bg-[color:var(--surface-2)]" onClick={() => onEdit(task)}>Edit</button><button className="rounded px-2 py-1 text-red-600 hover:bg-[#fef2f2]" onClick={() => onDelete(task.id)}>Delete</button></div> : null}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button className="w-full border-t border-[color:var(--border)] px-3 py-2 text-left text-xs text-[color:var(--text)] hover:bg-[color:var(--surface-2)]" onClick={() => onCreate(key)}>+ Add Task</button>
                  </div>
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
    <div data-task-menu className="relative w-full cursor-pointer rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] p-2 text-left shadow-none hover:border-[color:var(--text-muted)]" onClick={onClick} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onClick(); }}>
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
                        <span className="flex items-center gap-1">{fields.priority ? <Badge className="rounded-full bg-[color:var(--surface-2)] px-1.5 py-0.5 text-[10px] text-[color:var(--text)]">{task.priority}</Badge> : null}{fields.dueDate ? <Badge className="rounded-full bg-[color:var(--surface-2)] px-1.5 py-0.5 text-[10px] text-[color:var(--text-muted)]">{details.date}</Badge> : null}</span>
                      </div> : null}
                      {fields.labels ? <div className="mt-1.5 flex flex-wrap gap-1">
                        {details.labels.map((label, index) => <Badge key={`${label}-${index}`} className="inline-flex items-center gap-1 rounded-full bg-[#f5f5f5] px-1.5 py-0.5 text-[10px] text-[#333]"><Tag size={10} strokeWidth={1.8} /> {label}</Badge>)}
                      </div> : null}
      {menuOpen ? <div className="absolute right-2 top-7 z-20 grid w-20 rounded border border-[color:var(--border)] bg-[color:var(--surface)] p-1 text-[10px] shadow-lg"><button className="rounded px-2 py-1 text-left hover:bg-[color:var(--surface-2)]" onClick={(event) => { event.stopPropagation(); onEdit(); }}>Edit</button><button className="rounded px-2 py-1 text-left text-red-600 hover:bg-[#fef2f2]" onClick={(event) => { event.stopPropagation(); onDelete(); }}>Delete</button></div> : null}
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
  const [replyText, setReplyText] = useState("");
  const [replies, setReplies] = useState<string[]>([]);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const priorityMenuRef = useRef<HTMLDivElement | null>(null);
  const [subtasksOpen, setSubtasksOpen] = useState(true);
  const [updatesOpen, setUpdatesOpen] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [labels, setLabels] = useState(["Research", "Design", "Development", "Testing", "Deployment"]);
  const [resource, setResource] = useState("");
  const dueDate = task.dueDate ? new Date(`${task.dueDate}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : fallbackDueDate(`${task.id}-${task.title}`);
  const [subtaskMenuOpen, setSubtaskMenuOpen] = useState<string | null>(null);
  const [subtaskDialogOpen, setSubtaskDialogOpen] = useState(false);
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [detailsMenuOpen, setDetailsMenuOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailDraft, setDetailDraft] = useState("");
  const [detailEntries, setDetailEntries] = useState(["Status", "Priority", "Members", "Dates", "Labels", "Teams", "Reporter"]);
  const [membersOpen, setMembersOpen] = useState(false);
  const [datesOpen, setDatesOpen] = useState(false);
  const [dateTarget, setDateTarget] = useState<"start" | "end">("start");
  const [startDate, setStartDate] = useState(() => new Date());
  const [endDate, setEndDate] = useState(() => new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 7));
  const [dateMonth, setDateMonth] = useState(new Date().getMonth());
  const [dateYear, setDateYear] = useState(new Date().getFullYear());
  const [memberList, setMemberList] = useState(["Admin"]);
  const [subtasks, setSubtasks] = useState([
    { id: "subtask-1", title: "Subtask 1", priority: "HIGH" as const, member: "A", dueDate },
    { id: "subtask-2", title: "Subtask 2", priority: "LOW" as const, member: "CN", dueDate },
    { id: "subtask-3", title: "Subtask 3", priority: "MEDIUM" as const, member: "+", dueDate },
  ]);

  function openAddSubtask() {
    setEditingSubtaskId(null);
    setSubtaskDialogOpen(true);
  }

  function openEditSubtask(id: string) {
    setEditingSubtaskId(id);
    setSubtaskDialogOpen(true);
  }

  function duplicateSubtask(id: string) {
    const currentSubtask = subtasks.find((item) => item.id === id);
    if (!currentSubtask) return;

    setSubtasks((current) => [
      ...current,
      {
        ...currentSubtask,
        id: `subtask-${crypto.randomUUID()}`,
        title: `${currentSubtask.title} Copy`,
      },
    ]);
  }

  function deleteSubtask(id: string) {
    setSubtasks((current) => current.filter((item) => item.id !== id));
    setSubtaskMenuOpen(null);
  }

  const [updateMenuOpen, setUpdateMenuOpen] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [updateText, setUpdateText] = useState("dsds");
  const [updateDraft, setUpdateDraft] = useState("dsds");
  const [editingUpdate, setEditingUpdate] = useState(false);
  const [reactionEmoji, setReactionEmoji] = useState("🙂");
  const [attachmentTarget, setAttachmentTarget] = useState<"resource" | "reply" | "comment" | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const [resourceName, setResourceName] = useState("");
  const [replyAttachmentName, setReplyAttachmentName] = useState("");
  const [commentAttachmentName, setCommentAttachmentName] = useState("");
  const [locked, setLocked] = useState(false);
  const [watchCount, setWatchCount] = useState(1);

  function handleSubtaskSubmit(value: SubtaskFormValue) {
    if (editingSubtaskId) {
      setSubtasks((current) => current.map((item) => (item.id === editingSubtaskId ? { ...item, ...value } : item)));
    } else {
      setSubtasks((current) => [
        ...current,
        {
          id: `subtask-${crypto.randomUUID()}`,
          title: value.title,
          priority: value.priority,
          member: value.member || "+",
          dueDate: value.dueDate || dueDate,
        },
      ]);
    }

    setSubtaskDialogOpen(false);
    setEditingSubtaskId(null);
  }

  const editingSubtask = editingSubtaskId ? subtasks.find((item) => item.id === editingSubtaskId) ?? null : null;

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!priorityOpen) return;
      if (!(event.target instanceof Node)) return;
      if (!priorityMenuRef.current?.contains(event.target)) setPriorityOpen(false);
    };

    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [priorityOpen]);

  useEffect(() => {
    if (!subtaskMenuOpen) return;

    const handleClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      if (!event.target.closest("[data-subtask-menu]")) setSubtaskMenuOpen(null);
    };

    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [subtaskMenuOpen]);

  useEffect(() => {
    if (!detailsMenuOpen) return;

    const handleClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      if (!event.target.closest("[data-details-actions]")) setDetailsMenuOpen(false);
    };

    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [detailsMenuOpen]);

  useEffect(() => {
    if (!datesOpen) return;

    const handleClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      if (event.target.closest("[data-date-picker]") || event.target.closest("[data-date-toggle]")) return;
      setDatesOpen(false);
    };

    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [datesOpen]);

  function openAttachmentPicker(target: "resource" | "reply" | "comment") {
    setAttachmentTarget(target);
    attachmentInputRef.current?.click();
  }

  function handleAttachmentChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (attachmentTarget === "resource") setResourceName(file.name);
    if (attachmentTarget === "reply") setReplyAttachmentName(file.name);
    if (attachmentTarget === "comment") setCommentAttachmentName(file.name);

    event.target.value = "";
    setAttachmentTarget(null);
  }

  function sendReply() {
    const text = replyText.trim();
    if (!text) return;
    setReplies((current) => [text, ...current]);
    setReplyText("");
  }

  function sendComment() {
    const text = comment.trim();
    if (!text) return;
    setComments((current) => [text, ...current]);
    setComment("");
  }

  async function shareTask() {
    const shareData = { title: task.title, text: task.description ?? task.title, url: window.location.href };

    if (navigator.share) {
      await navigator.share(shareData);
      return;
    }

    await navigator.clipboard.writeText(shareData.url);
  }

  function toggleLock() {
    setLocked((current) => !current);
  }

  function toggleWatch() {
    setWatchCount((current) => (current === 1 ? 2 : 1));
  }

  function previousMonth() {
    setDateMonth((current) => {
      const next = current === 0 ? 11 : current - 1;
      if (current === 0) setDateYear((year) => year - 1);
      return next;
    });
  }

  function nextMonth() {
    setDateMonth((current) => {
      const next = current === 11 ? 0 : current + 1;
      if (current === 11) setDateYear((year) => year + 1);
      return next;
    });
  }

  function addMember() {
    const name = window.prompt("Member name", "New member");
    if (!name) return;
    setMemberList((current) => [...current, name.trim()]);
  }

  useEffect(() => {
    if (!updateMenuOpen && !emojiPickerOpen) return;

    const handleClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      if (!event.target.closest("[data-update-actions]") && !event.target.closest("[data-emoji-picker]")) {
        setUpdateMenuOpen(false);
        setEmojiPickerOpen(false);
      }
    };

    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [emojiPickerOpen, updateMenuOpen]);

  return (
    <div className="relative w-full text-[color:var(--text)]">
      <button className="sr-only" onClick={onBack}>Back to tasks</button>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="lg:col-span-2">
          <div className="relative flex w-full flex-col gap-4 pr-2 sm:min-h-11 sm:flex-row sm:items-start">
            <div className="min-w-0 flex-1"><h1 className="text-xl font-semibold tracking-tight">{task.title}</h1><p className="mt-1 max-w-xl text-xs leading-4 text-[color:var(--text-muted)]">{task.description || "Create clear and detailed API documentation to guide developers in using the inventory and sales metrics features effectively."}</p></div>
            <div className="flex flex-nowrap items-center justify-end gap-1 whitespace-nowrap sm:ml-auto sm:gap-2">
              <button className={`shrink-0 flex h-7 w-7 items-center justify-center rounded border hover:bg-[color:var(--surface-2)] ${locked ? "border-[color:var(--primary)] bg-[color:var(--primary)] text-white" : "border-[color:var(--border)]"}`} onClick={toggleLock} aria-label="Lock task"><Lock size={14} strokeWidth={2} /></button>
              <button className="shrink-0 flex h-7 items-center gap-1 rounded border border-[color:var(--border)] px-2 text-[color:var(--info)] hover:bg-[color:var(--surface-2)]" onClick={toggleWatch} aria-label="Watch task"><Eye size={14} strokeWidth={2} /> <span className="text-xs">{watchCount}</span></button>
              <button className="shrink-0 flex h-7 w-7 items-center justify-center rounded border border-[color:var(--border)] hover:bg-[color:var(--surface-2)]" onClick={() => { void shareTask(); }} aria-label="Share task"><Share2 size={14} strokeWidth={2} /></button>
              <button className="shrink-0 flex h-7 w-7 items-center justify-center rounded border border-[color:var(--border)] hover:bg-[color:var(--surface-2)]" onClick={onEdit} aria-label="More task options"><MoreHorizontal size={15} strokeWidth={2.5} /></button>
              <button className="shrink-0 flex h-7 w-7 items-center justify-center rounded bg-[color:var(--surface-2)] text-[color:var(--text-muted)] hover:bg-[color:var(--border)]" onClick={onBack} aria-label="Close task details"><PanelLeft size={14} strokeWidth={2} /></button>
            </div>
          </div>
        </div>
        <section className="w-full">
          <div className="mt-5 grid gap-3 text-xs">
            <DetailRow label="Properties" value={<span className="inline-flex items-center gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-[color:var(--surface-2)] text-[9px] text-[color:var(--text)]">A</span><span>Designer</span><Badge className="bg-[color:var(--surface-2)] text-[color:var(--text-muted)]"><CalendarDays size={10} /> 31 Jul</Badge></span>} />
            <DetailRow label="Labels" value={<span className="flex flex-wrap gap-1">{labels.map((label) => <Badge key={label} className="cursor-pointer bg-[color:var(--surface-2)] text-[color:var(--text-muted)]" onClick={() => setLabels((current) => current.filter((item) => item !== label))}><Tag size={11} /> {label}</Badge>)}</span>} />
            <DetailRow label="Resources" value={resourceName ? <span className="inline-flex items-center gap-1.5 text-[color:var(--text)]"><Paperclip size={11} strokeWidth={2} /> <span>{resourceName}</span></span> : <button className="inline-flex items-center gap-1.5 text-[color:var(--text-muted)] hover:text-[color:var(--text)]" onClick={() => openAttachmentPicker("resource") }><Paperclip size={11} strokeWidth={2} /> <span>Add document or link...</span></button>} />
          </div>
          <button className="mt-6 inline-flex items-center gap-1 text-xs font-semibold" onClick={() => setSubtasksOpen((current) => !current)} aria-expanded={subtasksOpen}>
            <span className={subtasksOpen ? "transition-transform" : "-rotate-90 transition-transform"}><FilledCaretDown /></span>
            Subtasks
          </button>
          {subtasksOpen ? <div className="mt-2 w-full overflow-visible rounded-md border border-[color:var(--border)]">
            <table className="min-w-full text-xs"><thead className="bg-[#f5f5f5]"><tr><th className="px-3 py-2 text-left font-medium">Task</th><th className="px-3 py-2 text-left font-medium">Priority</th><th className="px-3 py-2 text-left font-medium">Members</th><th className="px-3 py-2 text-left font-medium">Due Date</th><th className="px-3 py-2 text-right font-medium">Actions</th></tr></thead><tbody>{subtasks.map((item, index) => <tr key={item.id} className="border-t border-[#e8e8e8]"><td className="px-3 py-2">{item.title}</td><td className={`px-3 py-2 ${index === 0 ? "text-red-500" : index === 1 ? "text-zinc-400" : "text-orange-500"}`}><PrioritySignal priority={item.priority} /> {index === 0 ? "High" : index === 1 ? "Low" : "Medium"}</td><td className="px-3 py-2">{index === 0 ? <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-violet-500 text-[9px] text-white"><UserCircle2 size={12} strokeWidth={2} /></span> : <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[#e8e8e8] bg-white text-[11px] font-medium text-[#181818]">{item.member}</span>}</td><td className="px-3 py-2">{item.dueDate}</td><td className="relative px-3 py-2 text-right"><div data-subtask-menu className="relative inline-flex overflow-visible"><button className="inline-flex h-5 w-5 items-center justify-center rounded p-0 leading-none hover:bg-[#f5f5f5]" aria-label={`Actions for ${item.title}`} onClick={() => setSubtaskMenuOpen((current) => current === item.id ? null : item.id)}><MoreHorizontal size={14} className="translate-y-[0.5px]" /></button>{subtaskMenuOpen === item.id ? <div className="absolute right-0 top-6 z-50 grid w-24 rounded border border-[#e8e8e8] bg-white p-1 text-left text-[10px] shadow-lg"><button className="rounded px-2 py-1 hover:bg-[#f5f5f5]" onClick={() => duplicateSubtask(item.id)}>Duplicate</button><button className="rounded px-2 py-1 text-left hover:bg-[#f5f5f5]" onClick={() => openEditSubtask(item.id)}>Edit</button><button className="rounded px-2 py-1 text-left text-red-600 hover:bg-[#fef2f2]" onClick={() => deleteSubtask(item.id)}>Delete</button></div> : null}</div></td></tr>)}</tbody></table><button className="w-full border-t border-[#e8e8e8] px-3 py-2 text-left text-xs" onClick={openAddSubtask}>+ Add Subtask</button>
          </div> : null}
          <button className="mt-6 inline-flex items-center gap-1 text-xs font-semibold" onClick={() => setUpdatesOpen((current) => !current)} aria-expanded={updatesOpen}>
            <span className={updatesOpen ? "transition-transform" : "-rotate-90 transition-transform"}><FilledCaretDown /></span>
            Updates
          </button>
          {updatesOpen ? <div className="mt-2 w-full overflow-visible rounded-md border border-[color:var(--border)] text-xs">
            <div className="relative flex items-start justify-between px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--primary)] text-[9px] text-white">A</span>
                <div className="flex items-center gap-2">
                  <div className="text-[11px] font-medium">Ankit Dutta</div>
                  <div className="text-[10px] text-[color:var(--text-muted)]">just now</div>
                </div>
              </div>
              <div data-update-actions className="flex items-center gap-2 text-[color:var(--text)]">
                <div className="relative inline-flex" data-emoji-picker-anchor>
                  <button aria-label="Add reaction" className="rounded p-1 hover:bg-[color:var(--surface-2)]" onClick={() => setEmojiPickerOpen((current) => !current)}><Smile size={14} strokeWidth={2} /></button>
                  {emojiPickerOpen ? <div data-emoji-picker className="absolute right-0 top-full z-50 mt-2 grid w-[10.5rem] grid-cols-4 gap-1 rounded border border-[color:var(--border)] bg-[color:var(--surface)] p-2 text-lg shadow-lg">{["😀", "😄", "😍", "😎", "🤔", "👍", "🎉", "🔥", "🚀", "✅", "💬", "👏"].map((emoji) => <button key={emoji} className="rounded p-1 hover:bg-[color:var(--surface-2)]" onClick={() => { setReactionEmoji(emoji); setEmojiPickerOpen(false); }}>{emoji}</button>)}</div> : null}
                </div>
                <button aria-label="More comment actions" className="inline-flex h-7 w-7 items-center justify-center rounded p-0 hover:bg-[color:var(--surface-2)]" onClick={() => setUpdateMenuOpen((current) => !current)}><MoreHorizontal size={14} className="translate-y-[0.5px]" /></button>
                {updateMenuOpen ? <div className="absolute right-2 top-8 z-50 grid w-28 rounded border border-[color:var(--border)] bg-[color:var(--surface)] p-1 text-[10px] shadow-lg"><button className="rounded px-2 py-1 text-left hover:bg-[color:var(--surface-2)]" onClick={() => { setEditingUpdate(true); setUpdateDraft(updateText); setUpdateMenuOpen(false); }}>Edit</button><button className="rounded px-2 py-1 text-left text-[color:var(--danger)] hover:bg-[color:var(--danger-soft)]" onClick={() => { setUpdateText(""); setUpdateDraft(""); setUpdateMenuOpen(false); }}>Delete</button></div> : null}
              </div>
            </div>
            {editingUpdate ? <div className="px-3 pb-3"><textarea className="min-h-20 w-full rounded-md border border-[color:var(--border)] px-3 py-2 text-[15px] leading-5 outline-none" value={updateDraft} onChange={(event) => setUpdateDraft(event.target.value)} /><div className="mt-2 flex justify-end gap-2"><button className="rounded-md border border-[color:var(--border)] px-3 py-1.5 text-xs" onClick={() => { setEditingUpdate(false); setUpdateDraft(updateText); }}>Cancel</button><button className="rounded-md bg-[color:var(--primary)] px-3 py-1.5 text-xs text-white" onClick={() => { setUpdateText(updateDraft); setEditingUpdate(false); }}>Save</button></div></div> : <div className="px-3 pb-3 text-[15px] leading-5 text-[color:var(--text)]">{updateText || "No update text"}</div>}
            <div className="border-t border-[color:var(--border)] px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--primary)] text-[9px] text-white">A</span>
                <input className="min-w-0 flex-1 bg-transparent text-[color:var(--text)] outline-none placeholder:text-[color:var(--text-muted)]" value={replyText} onChange={(event) => setReplyText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") sendReply(); }} placeholder="Leave a reply..." />
                <button aria-label="Attach file" className="rounded p-1 text-[color:var(--text)] hover:bg-[color:var(--surface-2)]" onClick={() => openAttachmentPicker("reply")}><Paperclip size={14} /></button>
                <button aria-label="Send reply" className="rounded p-1 text-[color:var(--text)] hover:bg-[color:var(--surface-2)]" onClick={sendReply}><Send size={14} /></button>
              </div>
            </div>
            {replies.length > 0 ? <div className="w-full space-y-2 border-t border-[color:var(--border)] px-3 py-2.5">{replies.map((item, index) => <div key={`${item}-${index}`} className="rounded-md bg-[color:var(--surface-2)] px-2 py-1.5 text-[11px] text-[color:var(--text)]">{item}</div>)}</div> : null}
          </div> : null}
          <div className="mt-3 w-full rounded-md border border-[color:var(--border)] px-3 py-3 text-xs text-[color:var(--text-muted)]">
            <div className="flex items-center gap-2">
                <input className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[color:var(--text-muted)]" value={comment} onChange={(event) => setComment(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") sendComment(); }} placeholder={commentAttachmentName || "Add a comment..."} />
                <button aria-label="Attach file" className="rounded p-1 text-[color:var(--text)] hover:bg-[color:var(--surface-2)]" onClick={() => openAttachmentPicker("comment")}><Paperclip size={14} /></button>
              <button aria-label="Send comment" className="rounded p-1 text-[color:var(--text)] hover:bg-[color:var(--surface-2)]" onClick={sendComment}><Send size={14} /></button>
            </div>
          </div>
          {comments.length > 0 ? <div className="mt-2 w-full space-y-2 text-xs text-[color:var(--text)]">{comments.map((item, index) => <div key={`${item}-${index}`} className="rounded-md border border-[color:var(--border)] px-3 py-2">{item}</div>)}</div> : null}
        </section>
          <div className="flex w-full flex-col gap-3 lg:pt-20">
          <aside className="mt-0 w-full rounded-md border border-[color:var(--border)] p-4 text-xs">
            <div className="flex items-center justify-between border-b border-[color:var(--border)] pb-2 font-medium">
              <button className="inline-flex items-center gap-1.5" onClick={() => setDetailsOpen((current) => !current)} aria-expanded={detailsOpen}>
                <span className={detailsOpen ? "transition-transform" : "-rotate-90 transition-transform"}><FilledCaretDown /></span> Details
              </button>
              <div data-details-actions className="relative flex items-center gap-1 text-[color:var(--text)]" onClick={(event) => event.stopPropagation()}>
                <button className="flex h-5 w-5 items-center justify-center rounded hover:bg-[color:var(--surface-2)]" aria-label="Add detail" onClick={() => { setDetailDraft(""); setDetailDialogOpen(true); setDetailsMenuOpen(false); }}><Plus size={12} strokeWidth={2} /></button>
                <button className="flex h-5 w-5 items-center justify-center rounded hover:bg-[color:var(--surface-2)]" aria-label="Details settings" onClick={() => setDetailsMenuOpen((current) => !current)}><Settings size={12} strokeWidth={2} /></button>
                {detailsMenuOpen ? <div className="absolute right-2 top-8 z-50 grid w-[min(14rem,calc(100vw-2rem))] rounded border border-[color:var(--border)] bg-[color:var(--surface)] p-1 text-[10px] shadow-lg sm:w-28"><button className="rounded px-2 py-1 text-left hover:bg-[color:var(--surface-2)]" onClick={() => { setDetailDraft("Status"); setDetailDialogOpen(true); setDetailsMenuOpen(false); }}>Add status row</button><button className="rounded px-2 py-1 text-left hover:bg-[color:var(--surface-2)]" onClick={() => { setDetailDraft("Custom detail"); setDetailDialogOpen(true); setDetailsMenuOpen(false); }}>Custom field</button></div> : null}
              </div>
            </div>
            {detailsOpen ? <div className="grid gap-2.5 pt-3">
              <DetailRow label="Status" value={<span className="inline-flex items-center gap-1.5 text-[#f59e0b]"><span className="h-2 w-2 rounded-full bg-[#f59e0b]" /> Backlog</span>} />
              <DetailRow label="Priority" value={<div ref={priorityMenuRef} className="relative"><button className="inline-flex items-center gap-1 text-red-500" onClick={() => setPriorityOpen((current) => !current)}><PrioritySignal priority={task.priority} /> {taskPriorityLabel[task.priority]} <ChevronUp size={11} /></button>{priorityOpen ? <div className="absolute left-0 top-6 z-10 w-40 rounded-md border border-[#e8e8e8] bg-white p-2 shadow-lg"><div className="px-2 pb-2 text-[11px] text-[#777]">Priority</div><button className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left hover:bg-[#f5f5f5]" onClick={() => { setPriorityOpen(false); }}><span className="inline-flex items-center gap-1.5 text-zinc-500"><span className="inline-block h-[2px] w-[2px] rounded-full bg-zinc-500" /> <span>No Priority</span></span></button><button className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left hover:bg-[#f5f5f5]" onClick={() => { setPriorityOpen(false); }}><span className="inline-flex items-center gap-1.5 text-red-500"><PrioritySignal priority="HIGH" /> <span>Ultra</span></span></button><button className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left hover:bg-[#f5f5f5]" onClick={() => { setPriorityOpen(false); }}><span className="inline-flex items-center gap-1.5 text-red-500"><PrioritySignal priority="HIGH" /> <span>High</span></span></button><button className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left hover:bg-[#f5f5f5]" onClick={() => { setPriorityOpen(false); }}><span className="inline-flex items-center gap-1.5 text-orange-500"><PrioritySignal priority="MEDIUM" /> <span>Medium</span></span></button><button className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left hover:bg-[#f5f5f5]" onClick={() => { setPriorityOpen(false); }}><span className="inline-flex items-center gap-1.5 text-zinc-400"><PrioritySignal priority="LOW" /> <span>Low</span></span></button></div> : null}</div>} />
              <div className="grid grid-cols-[58px_minmax(0,1fr)] items-center gap-2.5 text-sm">
                <span className="text-[color:var(--text-muted)]">Members</span>
                <div className="relative justify-self-start">
                  <button className="inline-flex items-center gap-1 rounded-full border border-transparent px-2 py-1 font-medium text-[color:var(--text)] hover:bg-[color:var(--surface-2)]" onClick={() => setMembersOpen((current) => !current)} aria-expanded={membersOpen}>
                    <UserPlus size={13} />
                    <span>Add members</span>
                  </button>
                {membersOpen ? <div className="absolute right-0 top-8 z-50 w-[min(14rem,calc(100vw-2rem))] rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-2 shadow-2xl sm:w-56"><div className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">Members</div>{memberList.map((member) => <div key={member} className="flex items-center gap-2 rounded-xl px-2 py-2 text-sm hover:bg-[color:var(--surface-2)]"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--primary)] text-[9px] text-white">{member.slice(0, 1).toUpperCase()}</span><span className="flex-1">{member}</span></div>)}<button className="mt-1 flex w-full items-center gap-2 rounded-xl px-2 py-2 text-sm hover:bg-[color:var(--surface-2)]" onClick={addMember}><UserPlus size={13} /><span>Add member</span></button></div> : null}
                </div>
              </div>
              <div className="grid grid-cols-[58px_minmax(0,1fr)] items-center gap-2.5 text-sm">
                <span className="text-[color:var(--text-muted)]">Dates</span>
                <div className="relative justify-self-start">
                  <button data-date-toggle className="inline-flex items-center gap-1 rounded-full border border-transparent px-2 py-1 font-medium text-[color:var(--text)] hover:bg-[color:var(--surface-2)]" onClick={() => setDatesOpen((current) => !current)} aria-expanded={datesOpen}>
                    <CalendarDays size={14} />
                    <span className="rounded-full border border-[color:var(--border)] px-2 py-0.5 text-[11px] font-medium">{startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                    <span className="text-[color:var(--text-muted)]">→</span>
                    <span className="rounded-full border border-[color:var(--border)] px-2 py-0.5 text-[11px] font-medium text-[color:var(--text-muted)]">{endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                  </button>
                  {datesOpen ? <div data-date-picker className="absolute right-0 top-8 z-50 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-3 shadow-2xl sm:w-72"><div className="flex items-center justify-between pb-3"><button className="rounded-full p-1 hover:bg-[color:var(--surface-2)]" onClick={previousMonth} aria-label="Previous month"><ChevronLeft size={16} /></button><div className="text-sm font-semibold">{new Date(dateYear, dateMonth, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</div><button className="rounded-full p-1 hover:bg-[color:var(--surface-2)]" onClick={nextMonth} aria-label="Next month"><ChevronRight size={16} /></button></div><div className="grid grid-cols-7 gap-1 text-center text-[10px] text-[color:var(--text-muted)]">{["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => <span key={day} className="py-1">{day}</span>)}</div><div className="mt-2 grid grid-cols-7 gap-1 text-sm">{Array.from({ length: 35 }).map((_, index) => { const firstOfMonth = new Date(dateYear, dateMonth, 1); const startDay = firstOfMonth.getDay(); const dayNumber = index - startDay + 1; const daysInMonth = new Date(dateYear, dateMonth + 1, 0).getDate(); const isCurrentMonth = dayNumber >= 1 && dayNumber <= daysInMonth; const currentDate = new Date(dateYear, dateMonth, dayNumber); const isSelected = isCurrentMonth && ((dateTarget === "start" && currentDate.toDateString() === startDate.toDateString()) || (dateTarget === "end" && currentDate.toDateString() === endDate.toDateString())); return <button key={index} className={`h-8 rounded-full ${isSelected ? "bg-black text-white" : isCurrentMonth ? "hover:bg-[color:var(--surface-2)]" : "text-[color:var(--text-muted)]"}`} disabled={!isCurrentMonth} onClick={() => dateTarget === "start" ? setStartDate(currentDate) : setEndDate(currentDate)}>{isCurrentMonth ? dayNumber : ""}</button>; })}</div></div> : null}
                </div>
              </div>
              <DetailRow label="Labels" value={<span className="inline-flex items-center gap-1.5">Deployment</span>} />
              <DetailRow label="Teams" value={<span className="inline-flex items-center gap-1.5">Development</span>} />
              <DetailRow label="Reporter" value="Admin" />
            </div> : null}
          </aside>
          <div className="w-full rounded-md border border-[color:var(--border)] px-3 py-2.5 text-xs">
            <button className="flex w-full items-center gap-1.5 text-[11px] font-medium text-[color:var(--text)]" onClick={() => setUpdatesOpen((current) => !current)} aria-expanded={updatesOpen}>
              <span className={updatesOpen ? "transition-transform" : "-rotate-90 transition-transform"}><FilledCaretDown /></span>
              <span>Updates</span>
            </button>
            {updatesOpen ? <>
            <div className="mt-2 flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[color:var(--danger-soft)] text-[color:var(--danger)]"><span className="inline-flex items-end gap-[2px]" aria-hidden="true"><span className="h-[4px] w-[2px] rounded-full bg-[color:var(--danger)]" /><span className="h-[7px] w-[2px] rounded-full bg-[color:var(--danger)]" /><span className="h-[10px] w-[2px] rounded-full bg-[color:var(--danger)]" /></span></span>
              <div className="min-w-0">
                <div className="text-[11px] font-medium leading-4">You</div>
                <div className="truncate text-[11px] leading-4 text-[color:var(--text-muted)]">changed priority from No priority to Ur...</div>
              </div>
            </div>
            <div className="mt-3 flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[color:var(--primary)] text-[9px] text-white">A</span>
              <div className="min-w-0">
                <div className="text-[11px] font-medium leading-4">You</div>
                <div className="text-[11px] leading-4 text-[color:var(--text-muted)]">posted an update · Aug 2026</div>
              </div>
            </div>
            </> : null}
          </div>
        </div>
      </div>
      <input ref={attachmentInputRef} className="hidden" type="file" onChange={handleAttachmentChange} />
      <SubtaskFormModal
        open={subtaskDialogOpen}
        onClose={() => {
          setSubtaskDialogOpen(false);
          setEditingSubtaskId(null);
        }}
        onSubmit={handleSubtaskSubmit}
        initialValue={editingSubtask}
        title={editingSubtask ? "Edit subtask" : "Create subtask"}
      />
      {detailDialogOpen ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDetailDialogOpen(false)} role="presentation"><div className="w-full max-w-sm rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="detail-dialog-title" onClick={(event) => event.stopPropagation()}><div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--text-muted)]">Details</p><h2 id="detail-dialog-title" className="mt-1 text-xl font-semibold text-[color:var(--text)]">Add detail</h2></div><button className="rounded-full border border-[color:var(--border)] p-2" onClick={() => setDetailDialogOpen(false)} aria-label="Close dialog"><PanelLeft size={14} /></button></div><div className="grid gap-4"><div className="grid gap-2"><label className="text-sm font-medium text-[color:var(--text)]">Detail label</label><Input value={detailDraft} onChange={(event) => setDetailDraft(event.target.value)} placeholder="Add detail name" autoFocus /></div><div className="flex justify-end gap-2"><button className="rounded-xl border border-[color:var(--border)] px-4 py-2 text-sm" onClick={() => setDetailDialogOpen(false)}>Cancel</button><button className="rounded-xl bg-[color:var(--text)] px-4 py-2 text-sm text-white" onClick={() => { if (!detailDraft.trim()) return; setDetailEntries((current) => [...current, detailDraft.trim()]); setDetailDialogOpen(false); setDetailDraft(""); }}>Add</button></div></div></div></div> : null}
    </div>
  );
}

function FilledCaretDown() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
      <path d="M2.2 4.25 6 8.05l3.8-3.8Z" />
    </svg>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex items-center gap-2.5 leading-4"><span className="w-[58px] shrink-0 text-[11px] text-[#777]">{label}</span><div className="min-w-0 text-[11px] text-[#181818]">{value}</div></div>;
}

function ProjectsScreen({
  query,
  setQuery,
  projects,
  selectedProject,
  setSelectedProjectId,
  onOpenAdd,
  onEditProject,
  onDeleteProject,
}: {
  query: string;
  setQuery: (value: string) => void;
  projects: ProjectItem[];
  selectedProject: ProjectItem | null;
  setSelectedProjectId: (id: string | null) => void;
  onOpenAdd: () => void;
  onEditProject: (project: ProjectItem) => void;
  onDeleteProject: (projectId: string) => void;
}) {
  const [fieldsOpen, setFieldsOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [actionMenuProjectId, setActionMenuProjectId] = useState<string | null>(null);
  const [actionMenuPosition, setActionMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const fieldsMenuRef = useRef<HTMLDivElement | null>(null);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<ProjectItem["priority"] | "All">("All");
  const [visibleFields, setVisibleFields] = useState({
    priority: true,
    lead: true,
    dueDate: true,
    actions: true,
  });

  const visibleProjects = projects.filter((project) => priorityFilter === "All" || project.priority === priorityFilter);
  const handleOpenAdd = () => {
    setFieldsOpen(false);
    setFilterOpen(false);
    setActionMenuProjectId(null);
    onOpenAdd();
  };

  useEffect(() => {
    if (!fieldsOpen && !filterOpen) return;

    const handleClick = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) return;

      const target = event.target instanceof Element ? event.target : null;

      if (fieldsOpen && !target?.closest("[data-project-fields-menu]") && !fieldsMenuRef.current?.contains(event.target)) {
        setFieldsOpen(false);
      }

      if (filterOpen && !target?.closest("[data-project-filter-menu]") && !filterMenuRef.current?.contains(event.target)) {
        setFilterOpen(false);
      }
    };

    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, [fieldsOpen, filterOpen]);

  const handleEditProject = (project: ProjectItem) => {
    setFieldsOpen(false);
    setFilterOpen(false);
    setActionMenuProjectId(null);
    setActionMenuPosition(null);
    onEditProject(project);
  };

  const handleDeleteProject = (projectId: string) => {
    setActionMenuProjectId(null);
    setActionMenuPosition(null);
    onDeleteProject(projectId);
  };

  return (
    <div className="space-y-4 pt-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-[color:var(--text)]">Projects</h2>
        </div>
        <div className="relative flex flex-wrap items-center gap-2">
          <div ref={fieldsMenuRef} className="relative">
            <button type="button" className="flex h-9 items-center gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 text-sm shadow-[0_1px_2px_rgba(15,23,42,0.03)]" onClick={() => setFieldsOpen((current) => !current)}>
              <List size={14} /> Fields
            </button>
          </div>

          <div ref={filterMenuRef} className="relative">
            <button type="button" className={`flex h-9 items-center gap-2 rounded-xl border bg-[color:var(--surface)] px-3 text-sm shadow-[0_1px_2px_rgba(15,23,42,0.03)] ${priorityFilter === "All" ? "border-[color:var(--border)]" : "border-[color:var(--primary)] text-[color:var(--primary)]"}`} onClick={() => setFilterOpen((current) => !current)}>
              <Filter size={14} /> {priorityFilter === "All" ? "Filter" : `Filter: ${priorityFilter}`}
            </button>
          </div>

          <Button type="button" className="h-9 rounded-xl bg-[#181818] px-4 text-white hover:bg-[#111]" onClick={handleOpenAdd}><Plus size={14} /> Add Project</Button>

          {fieldsOpen ? (
            <Card data-project-fields-menu className="absolute left-0 top-11 z-20 w-[min(220px,calc(100vw-2rem))] p-2 shadow-2xl sm:left-auto sm:right-[118px] sm:w-[220px]">
              {[
                ["priority", "Priority"],
                ["lead", "Lead"],
                ["dueDate", "Due Date"],
                ["actions", "Actions"],
              ].map(([key, field]) => (
                <label key={key} className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-[color:var(--surface-2)]">
                  <span>{field}</span>
                  <input
                    checked={visibleFields[key as keyof typeof visibleFields]}
                    className="h-4 w-4 accent-[#181818]"
                    type="checkbox"
                    onChange={() => setVisibleFields((current) => ({ ...current, [key]: !current[key as keyof typeof visibleFields] }))}
                  />
                </label>
              ))}
            </Card>
          ) : null}

          {filterOpen ? (
            <Card data-project-filter-menu className="absolute left-0 top-11 z-20 w-[min(180px,calc(100vw-2rem))] p-2 shadow-2xl sm:left-auto sm:right-[218px] sm:w-[180px]">
              {(["All", "High", "Medium", "Low"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-[color:var(--surface-2)] ${priorityFilter === item ? "bg-[color:var(--surface-2)]" : ""}`}
                  onClick={() => {
                    setPriorityFilter(item);
                    setFilterOpen(false);
                  }}
                >
                  <span>{item === "All" ? "All priorities" : item}</span>
                  {priorityFilter === item ? <Check size={14} className="text-[color:var(--text)]" /> : null}
                </button>
              ))}
            </Card>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4">
        <div className="grid gap-3 lg:hidden">
          {visibleProjects.map((project) => (
            <Card key={project.id} className={`p-4 ${selectedProject?.id === project.id ? "border-[color:var(--primary)]" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <button type="button" className="text-left font-medium" onClick={() => setSelectedProjectId(project.id)}>{project.name}</button>
                  <div className="mt-1 text-xs text-[color:var(--text-muted)]">Lead {project.lead}</div>
                </div>
                <button
                  type="button"
                  className="rounded-md p-2 text-[color:var(--text-muted)] hover:bg-[color:var(--surface-2)]"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (actionMenuProjectId === project.id) {
                      setActionMenuProjectId(null);
                      setActionMenuPosition(null);
                      return;
                    }

                    const rect = event.currentTarget.getBoundingClientRect();
                    const menuWidth = 176;
                    const menuHeight = 88;
                    const top = rect.bottom + menuHeight > window.innerHeight ? Math.max(8, rect.top - menuHeight - 8) : rect.bottom + 8;
                    const left = Math.min(Math.max(8, rect.right - menuWidth), window.innerWidth - menuWidth - 8);

                    setActionMenuProjectId(project.id);
                    setActionMenuPosition({ top, left });
                  }}
                >
                  <MoreHorizontal size={14} />
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {visibleFields.priority ? <Badge className={project.priority === "High" ? "bg-rose-500/10 text-rose-600" : project.priority === "Medium" ? "bg-amber-500/10 text-amber-600" : "bg-zinc-500/10 text-zinc-600"}>{project.priority}</Badge> : null}
                {visibleFields.dueDate ? <Badge className="bg-[color:var(--surface-2)] text-[color:var(--text-muted)]">{project.dueDate}</Badge> : null}
              </div>
              <div className="mt-4 flex items-center justify-between gap-2">
                <Button variant="secondary" size="sm" onClick={() => handleEditProject(project)}>Edit</Button>
                <Button variant="secondary" size="sm" onClick={() => handleDeleteProject(project.id)}>Delete</Button>
              </div>
            </Card>
          ))}
        </div>

        <Card className="overflow-hidden rounded-3xl">
          <table className="hidden min-w-full text-sm lg:table">
                    <thead className="bg-[color:var(--surface-2)] text-left text-xs text-[color:var(--text-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Projects</th>
                {visibleFields.priority ? <th className="px-4 py-3 font-medium">Priority</th> : null}
                {visibleFields.lead ? <th className="px-4 py-3 font-medium">Lead</th> : null}
                {visibleFields.dueDate ? <th className="px-4 py-3 font-medium">Due Date</th> : null}
                {visibleFields.actions ? <th className="px-4 py-3 font-medium">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {visibleProjects.map((project) => (
                <tr key={project.id} className="border-t border-[color:var(--border)] last:border-b hover:bg-[#fafafa]">
                  <td className={`px-4 py-3 ${selectedProject?.id === project.id ? "bg-[color:var(--surface-2)]" : ""}`}><button type="button" className="text-left font-medium" onClick={() => setSelectedProjectId(project.id)}>{project.name}</button></td>
                  {visibleFields.priority ? (
                    <td className={`px-4 py-3 ${selectedProject?.id === project.id ? "bg-[color:var(--surface-2)]" : ""}`}>
                      <span className={`inline-flex items-center gap-1 ${project.priority === "High" ? "text-red-500" : project.priority === "Medium" ? "text-orange-500" : "text-zinc-400"}`}>
                        <PrioritySignal priority={projectPriorityToTaskPriority(project.priority)} />
                        {project.priority}
                      </span>
                    </td>
                  ) : null}
                  {visibleFields.lead ? <td className={`px-4 py-3 ${selectedProject?.id === project.id ? "bg-[color:var(--surface-2)]" : ""}`}><AvatarStack initials={project.lead} count={1} /></td> : null}
                  {visibleFields.dueDate ? <td className={`px-4 py-3 ${selectedProject?.id === project.id ? "bg-[color:var(--surface-2)]" : ""}`}>{project.dueDate}</td> : null}
                  {visibleFields.actions ? (
                    <td className={`relative px-4 py-3 text-[color:var(--text-muted)] ${selectedProject?.id === project.id ? "bg-[color:var(--surface-2)]" : ""}`}>
                      <button
                        type="button"
                        className="rounded-md p-2 hover:bg-[color:var(--surface-2)]"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (actionMenuProjectId === project.id) {
                            setActionMenuProjectId(null);
                            setActionMenuPosition(null);
                            return;
                          }

                          const rect = event.currentTarget.getBoundingClientRect();
                          const menuWidth = 176;
                          const menuHeight = 88;
                          const top = rect.bottom + menuHeight > window.innerHeight ? Math.max(8, rect.top - menuHeight - 8) : rect.bottom + 8;
                          const left = Math.min(Math.max(8, rect.right - menuWidth), window.innerWidth - menuWidth - 8);

                          setActionMenuProjectId(project.id);
                          setActionMenuPosition({ top, left });
                        }}
                      >
                        <MoreHorizontal size={14} />
                      </button>
                      {actionMenuProjectId === project.id && actionMenuPosition ? (
                        <>
                          <button
                            aria-label="Close actions menu"
                            className="fixed inset-0 z-20 cursor-default bg-transparent"
                            type="button"
                            onClick={() => {
                              setActionMenuProjectId(null);
                              setActionMenuPosition(null);
                            }}
                          />
                          <Card
                            className="fixed z-30 w-44 p-2 shadow-2xl"
                            style={{ top: actionMenuPosition.top, left: actionMenuPosition.left }}
                            onClick={(event) => event.stopPropagation()}
                          >
                            <button type="button" className="flex w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[color:var(--surface-2)]" onClick={() => handleEditProject(project)}>Edit</button>
                            <button type="button" className="flex w-full rounded-lg px-3 py-2 text-left text-sm text-red-500 hover:bg-[color:var(--surface-2)]" onClick={() => handleDeleteProject(project.id)}>Delete</button>
                          </Card>
                        </>
                      ) : null}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
          <Button type="button" variant="ghost" className="w-full justify-start rounded-none border-t border-[color:var(--border)] px-4 py-3 text-sm text-[color:var(--text-muted)] hover:bg-[#fafafa]" onClick={handleOpenAdd}>+ Add Project</Button>
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
  onLogout,
  onNavigate,
}: {
  profile: ProfileState;
  setProfile: React.Dispatch<React.SetStateAction<ProfileState>>;
  accent: Accent;
  setAccent: (accent: Accent) => void;
  onThemeChange: (theme: "light" | "dark") => void;
  onLogout: () => void;
  onNavigate: (view: View) => void;
}) {
  const { resolvedTheme } = useTheme();
  const [sidebarTab, setSidebarTab] = useState<"profile" | "theme" | "color">("profile");
  const [openFlyout, setOpenFlyout] = useState<"theme" | "color" | null>(null);
  const [emailEditing, setEmailEditing] = useState(false);
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const currentTheme = resolvedTheme ?? "light";

  useEffect(() => {
    if (!openFlyout) return;

    const handleClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      if (event.target.closest("[data-profile-sidebar]")) return;
      setOpenFlyout(null);
    };

    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [openFlyout]);

  useEffect(() => {
    if (emailEditing) emailInputRef.current?.focus();
  }, [emailEditing]);

  function handlePhotoPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const photo = reader.result;
      if (typeof photo !== "string") return;
      setProfile((current) => ({ ...current, photo }));
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  return (
    <div className="grid gap-0 lg:grid-cols-[264px_minmax(0,1fr)] lg:items-stretch lg:gap-4">
      <aside data-profile-sidebar className="relative rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-3 lg:min-h-screen lg:rounded-none lg:border-r lg:border-y-0 lg:border-l-0 lg:border-t-0 lg:border-b-0">
        <button className="mt-0 flex items-center gap-2 rounded-xl px-2 py-2 text-sm text-[color:var(--text-muted)]" onClick={() => onNavigate("tasks")}>
          <ArrowLeft size={14} /> Back to app
        </button>
        <div className="mt-3 grid grid-cols-3 gap-2 lg:grid-cols-1 lg:gap-1">
          <SidebarButton active={sidebarTab === "profile"} icon={UserCircle2} label="Profile" onClick={() => setSidebarTab("profile")} />
            <div className="relative">
              <SidebarButton active={sidebarTab === "theme"} icon={SunMedium} label="Theme" onClick={() => { setSidebarTab("theme"); setOpenFlyout((current) => current === "theme" ? null : "theme"); }} />
            {openFlyout === "theme" ? (
              <div data-profile-sidebar className="absolute left-0 top-full z-50 mt-1 w-[min(210px,calc(100vw-2rem))] rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-2 shadow-2xl sm:left-[calc(100%+24px)] sm:top-0 sm:mt-0 sm:w-[210px]">
                <div className="px-3 py-2 text-sm text-[color:var(--text-muted)]">Theme</div>
                <SubMenuItem icon={SunMedium} label="Light" selected={currentTheme === "light"} onClick={() => { onThemeChange("light"); setOpenFlyout(null); }} />
                <SubMenuItem icon={MoonStar} label="Dark" selected={currentTheme === "dark"} onClick={() => { onThemeChange("dark"); setOpenFlyout(null); }} />
              </div>
            ) : null}
          </div>
          <div className="relative">
            <SidebarButton active={sidebarTab === "color"} icon={Palette} label="Color" onClick={() => { setSidebarTab("color"); setOpenFlyout((current) => current === "color" ? null : "color"); }} />
            {openFlyout === "color" ? (
              <div data-profile-sidebar className="absolute left-0 top-full z-50 mt-1 w-[min(210px,calc(100vw-2rem))] rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-2 shadow-2xl sm:left-[calc(100%+24px)] sm:top-0 sm:mt-0 sm:w-[210px]">
                <div className="px-3 py-2 text-sm text-[color:var(--text-muted)]">Color Mode</div>
                {accentOptions.map((option) => (
                  <SubMenuItem key={option.value} label={option.label} swatch={option.value} selected={accent === option.value} onClick={() => { setAccent(option.value); setOpenFlyout(null); }} />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </aside>

      <div className="mx-auto w-full max-w-[760px] space-y-8 px-4 pt-0 lg:px-0 lg:pt-8">
        <h2 className="text-2xl font-semibold">Profile</h2>

        <Card className="p-6">
          <div className="grid gap-5">
            <ProfileRow
              label="Profile picture"
              value={
                <div className="flex items-center gap-3">
                  <button className="group relative overflow-hidden rounded-full" onClick={() => photoInputRef.current?.click()} aria-label="Change profile picture" type="button">
                    {profile.photo ? (
                      <img src={profile.photo} alt="Profile preview" className="h-11 w-11 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[color:var(--primary)] text-white">{profile.name.slice(0, 1)}</div>
                    )}
                    <span className="absolute inset-0 rounded-full bg-black/0 transition group-hover:bg-black/10" />
                  </button>
                  <button className="rounded-full bg-[color:var(--surface-2)] p-2 text-[color:var(--text)]" onClick={() => photoInputRef.current?.click()} type="button" aria-label="Upload profile picture">
                    <Camera size={13} />
                  </button>
                </div>
              }
            />
            <ProfileRow
              label="Email"
              value={
                emailEditing ? (
                  <div className="flex items-center gap-2">
                    <Input
                      ref={emailInputRef}
                      className="h-10 w-full bg-[color:var(--surface-2)] sm:w-[250px]"
                      value={profile.email}
                      onChange={(event) => setProfile({ ...profile, email: event.target.value })}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") setEmailEditing(false);
                        if (event.key === "Escape") setEmailEditing(false);
                      }}
                      onBlur={() => setEmailEditing(false)}
                    />
                    <button className="rounded-full bg-[color:var(--surface-2)] p-2 text-[color:var(--text)]" onClick={() => setEmailEditing(false)} aria-label="Save email">
                      <Check size={13} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span>{profile.email}</span>
                    <button className="rounded-full bg-[color:var(--surface-2)] p-2 text-[color:var(--text)]" onClick={() => setEmailEditing(true)} aria-label="Edit email">
                      <PencilIcon size={13} />
                    </button>
                  </div>
                )
              }
            />
            <ProfileRow label="Full name" value={<Input className="h-10 w-full max-w-none bg-[color:var(--surface-2)] sm:max-w-[200px]" value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} />} />
            <ProfileRow label="Title" sub="Your job title or role" value={<Input className="h-10 w-full max-w-none bg-[color:var(--surface-2)] sm:max-w-[200px]" value={profile.title} onChange={(event) => setProfile({ ...profile, title: event.target.value })} />} />
            <ProfileRow label="Username" sub="One word, like a nickname or first name" value={<Input className="h-10 w-full max-w-none bg-[color:var(--surface-2)] sm:max-w-[200px]" value={profile.username} onChange={(event) => setProfile({ ...profile, username: event.target.value })} />} />
          </div>
        </Card>

        <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoPick} />

        <div className="px-0 py-0">
          <h3 className="text-lg font-semibold">Workspace access</h3>
                <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-[color:var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm text-[color:var(--text-muted)]">Remove yourself from the workspace</span>
            <Button variant="danger" size="sm" className="rounded-full" onClick={onLogout}>Leave Workspace</Button>
                </div>
              </div>
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

function parseProjectDate(value: string) {
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  const parts = value.split(" ");
  if (parts.length !== 3) return "";

  const [day, month, year] = parts;
  const monthIndex = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].indexOf(month);
  if (monthIndex < 0) return "";

  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function ProjectModal({
  initialProject,
  onClose,
  onSubmit,
}: {
  initialProject: ProjectItem | null;
  onClose: () => void;
  onSubmit: (project: ProjectItem) => void;
}) {
  const [form, setForm] = useState({
    name: initialProject?.name ?? "",
    priority: initialProject?.priority ?? ("Medium" as ProjectItem["priority"]),
    lead: initialProject?.lead ?? "",
    dueDate: initialProject ? parseProjectDate(initialProject.dueDate) : "",
  });

  function formatDueDate(value: string) {
    if (!value) return "--";
    const date = new Date(`${value}T00:00:00`);
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg" onClick={(event) => event.stopPropagation()}>
        <Card className="p-5">
        <h3 className="text-lg font-semibold">{initialProject ? "Edit project" : "Create project"}</h3>
        <div className="mt-4 grid gap-3">
          <Input placeholder="Project name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <Input placeholder="Lead initials" value={form.lead} onChange={(event) => setForm({ ...form, lead: event.target.value })} />
          <select className="h-11 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as ProjectItem["priority"] })}>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
          <DatePickerField value={form.dueDate} onChange={(value) => setForm({ ...form, dueDate: value })} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button disabled={!form.name.trim()} onClick={() => onSubmit({ id: initialProject?.id ?? `proj-${Date.now()}`, name: form.name, priority: form.priority, lead: form.lead || "ME", dueDate: formatDueDate(form.dueDate), state: initialProject?.state ?? "Backlog", members: initialProject?.members ?? [form.lead || "M"], labels: initialProject?.labels ?? ["Planning"] })}>{initialProject ? "Save" : "Create"}</Button>
          </div>
        </div>
        </Card>
      </div>
    </div>
  );
}
