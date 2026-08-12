import type { AuthResponse, Task, TaskPriority, TaskStatus, User } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";

async function request<T>(path: string, options: RequestInit = {}, token?: string) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

export function getCurrentUser(token: string) {
  return request<User | null>("/auth/me", { method: "GET" }, token);
}

export function listTasks(token: string, query?: { q?: string; status?: TaskStatus | ""; priority?: TaskPriority | "" }) {
  const params = new URLSearchParams();

  if (query?.q) params.set("q", query.q);
  if (query?.status) params.set("status", query.status);
  if (query?.priority) params.set("priority", query.priority);

  return request<Task[]>(`/tasks${params.toString() ? `?${params.toString()}` : ""}`, { method: "GET" }, token);
}

export function createTask(
  token: string,
  payload: {
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueDate?: string;
  },
) {
  return request<Task>("/tasks", { method: "POST", body: JSON.stringify(payload) }, token);
}

export function updateTask(
  token: string,
  id: string,
  payload: {
    title?: string;
    description?: string | null;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueDate?: string | null;
  },
) {
  return request<Task>(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(payload) }, token);
}

export function deleteTask(token: string, id: string) {
  return request<void>(`/tasks/${id}`, { method: "DELETE" }, token);
}
