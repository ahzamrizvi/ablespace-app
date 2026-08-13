import type { AuthResponse, Task, TaskPriority, TaskStatus, User } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

async function request<T>(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Request failed");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function guestLogin() {
  return request<AuthResponse>("/auth/guest", { method: "POST", body: JSON.stringify({}) });
}

export function getCurrentUser() {
  return request<User | null>("/auth/me", { method: "GET" });
}

export function listTasks(query?: { q?: string; status?: TaskStatus | ""; priority?: TaskPriority | "" }) {
  const params = new URLSearchParams();

  if (query?.q) params.set("q", query.q);
  if (query?.status) params.set("status", query.status);
  if (query?.priority) params.set("priority", query.priority);

  return request<Task[]>(`/tasks${params.toString() ? `?${params.toString()}` : ""}`, { method: "GET" });
}

export function createTask(
  payload: {
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueDate?: string;
  },
) {
  return request<Task>("/tasks", { method: "POST", body: JSON.stringify(payload) });
}

export function updateTask(
  id: string,
  payload: {
    title?: string;
    description?: string | null;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueDate?: string | null;
  },
) {
  return request<Task>(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function deleteTask(id: string) {
  return request<void>(`/tasks/${id}`, { method: "DELETE" });
}

export function logout() {
  return request<{ ok: boolean }>("/auth/logout", { method: "POST" });
}
