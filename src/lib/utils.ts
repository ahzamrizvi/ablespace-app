import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fallbackDueDate(seed: string): string {
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  const date = new Date("2026-08-01T00:00:00");
  date.setDate(date.getDate() + (hash % 28));

  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
