import { NextRequest, NextResponse } from "next/server";
import type { Task, TaskPriority, TaskStatus, User } from "@/lib/types";

const sessions = new Map<string, User>();
const tasks = new Map<string, Task[]>();

function defaultTasks(userId: string): Task[] {
  const now = new Date().toISOString();
  const seed = [
    ["Write API Documentation", "TODO"],
    ["Implement Search Function", "TODO"],
    ["Deploy to Production", "TODO"],
    ["Code Review Completed", "IN_PROGRESS"],
    ["Design Mockups Finalized", "IN_PROGRESS"],
    ["Feature Testing Passed", "DONE"],
    ["UI Design Updated", "DONE"],
    ["Security Audit Scheduled", "DONE"],
    ["UI Review", "ON_HOLD"],
    ["Backend Integration", "ON_HOLD"],
    ["User Feedback", "ON_HOLD"],
    ["Performance Review", "ON_HOLD"],
  ] as const;

  return seed.map(([title, status]) => ({
    id: crypto.randomUUID(), userId, title, description: "Deployment", status,
    priority: "MEDIUM", dueDate: "2026-07-29", createdAt: now, updatedAt: now,
  }));
}

function userFor(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return undefined;
  const existing = sessions.get(token);
  if (existing) return existing;
  const user: User = { id: `guest-${token}`, name: "Guest User", email: null, isGuest: true };
  sessions.set(token, user);
  tasks.set(user.id, defaultTasks(user.id));
  return user;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ route: string[] }> }) {
  const { route } = await params;
  if (route.join("/") === "auth/guest") {
    const token = crypto.randomUUID();
    const user: User = { id: crypto.randomUUID(), name: "Guest User", email: null, isGuest: true };
    sessions.set(token, user);
    tasks.set(user.id, defaultTasks(user.id));
    return NextResponse.json({ token, user });
  }
  const user = userFor(request);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (route.join("/") === "tasks") {
    const body = await request.json();
    const now = new Date().toISOString();
    const task: Task = {
      id: crypto.randomUUID(), userId: user.id, title: body.title, description: body.description ?? null,
      status: (body.status ?? "TODO") as TaskStatus, priority: (body.priority ?? "MEDIUM") as TaskPriority,
      dueDate: body.dueDate ?? null, createdAt: now, updatedAt: now,
    };
    const userTasks = tasks.get(user.id) ?? [];
    userTasks.unshift(task);
    tasks.set(user.id, userTasks);
    return NextResponse.json(task, { status: 201 });
  }
  return NextResponse.json({ message: "Not found" }, { status: 404 });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ route: string[] }> }) {
  const { route } = await params;
  const user = userFor(request);
  if (route.join("/") === "auth/me") return NextResponse.json(user ?? null);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (route.join("/") === "tasks") {
    const userTasks = tasks.get(user.id);
    if (userTasks?.length) {
      const query = request.nextUrl.searchParams;
      const search = query.get("q")?.trim().toLowerCase();
      const status = query.get("status");
      const priority = query.get("priority");
      return NextResponse.json(userTasks.filter((task) =>
        (!search || `${task.title} ${task.description ?? ""}`.toLowerCase().includes(search))
        && (!status || task.status === status)
        && (!priority || task.priority === priority),
      ));
    }
    const defaults = defaultTasks(user.id);
    tasks.set(user.id, defaults);
    return NextResponse.json(defaults);
  }
  return NextResponse.json({ message: "Not found" }, { status: 404 });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ route: string[] }> }) {
  const { route } = await params;
  const user = userFor(request);
  const id = route[0] === "tasks" ? route[1] : undefined;
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  // A dev-server restart recreates local seed IDs while the browser still holds the old IDs.
  const task = (tasks.get(user.id) ?? []).find((item) => item.id === id) ?? (body.title ? (tasks.get(user.id) ?? []).find((item) => item.title === body.title) : undefined);
  if (!task) return NextResponse.json({ message: "Not found" }, { status: 404 });
  Object.assign(task, body, { updatedAt: new Date().toISOString() });
  return NextResponse.json(task);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ route: string[] }> }) {
  const { route } = await params;
  const user = userFor(request);
  const id = route[0] === "tasks" ? route[1] : undefined;
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const userTasks = tasks.get(user.id) ?? [];
  const index = userTasks.findIndex((task) => task.id === id);
  if (index < 0) return NextResponse.json({ message: "Not found" }, { status: 404 });
  userTasks.splice(index, 1);
  return new NextResponse(null, { status: 204 });
}
