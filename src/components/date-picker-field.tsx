"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

function formatDisplayDate(value: string) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function toLocalISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function DatePickerField({ value, onChange, placeholder = "dd / mm / yyyy" }: Props) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const initialDate = useMemo(() => (value ? new Date(`${value}T00:00:00`) : new Date()), [value]);
  const [month, setMonth] = useState(initialDate.getMonth());
  const [year, setYear] = useState(initialDate.getFullYear());

  useEffect(() => {
    if (!open) return;
    const current = value ? new Date(`${value}T00:00:00`) : new Date();
    setMonth(current.getMonth());
    setYear(current.getFullYear());
  }, [open, value]);

  useEffect(() => {
    if (!open) return;

    const handleClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      if (!event.target.closest("[data-date-picker-field]")) setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("click", handleClick);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("click", handleClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function previousMonth() {
    setMonth((current) => {
      if (current === 0) {
        setYear((currentYear) => currentYear - 1);
        return 11;
      }
      return current - 1;
    });
  }

  function nextMonth() {
    setMonth((current) => {
      if (current === 11) {
        setYear((currentYear) => currentYear + 1);
        return 0;
      }
      return current + 1;
    });
  }

  const selectedDate = value ? new Date(`${value}T00:00:00`) : null;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  return (
    <div ref={anchorRef} data-date-picker-field className="relative">
      <button
        type="button"
        className="flex h-11 w-full items-center justify-between rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 text-sm text-[color:var(--text)] outline-none transition focus:border-[color:var(--ring)] focus:ring-2 focus:ring-[color:var(--ring-soft)]"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <span className={value ? "text-[color:var(--text)]" : "text-[color:var(--text-muted)]"}>{value ? formatDisplayDate(value) : placeholder}</span>
        <CalendarDays size={14} className="text-[color:var(--text-muted)]" />
      </button>

      {open ? (
        <div className="absolute bottom-[calc(100%+8px)] left-0 z-50 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-3 text-[color:var(--text)] shadow-2xl sm:left-auto sm:right-0 sm:w-72">
          <div className="flex items-center justify-between pb-3">
            <button type="button" className="rounded-full p-1 hover:bg-[color:var(--surface-2)]" onClick={previousMonth} aria-label="Previous month">
              <ChevronLeft size={16} />
            </button>
            <div className="text-sm font-semibold">{new Date(year, month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</div>
            <button type="button" className="rounded-full p-1 hover:bg-[color:var(--surface-2)]" onClick={nextMonth} aria-label="Next month">
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-[color:var(--text-muted)]">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
              <span key={day} className="py-1">
                {day}
              </span>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-1 text-sm">
            {Array.from({ length: 35 }).map((_, index) => {
              const dayNumber = index - firstDay + 1;
              const isCurrentMonth = dayNumber >= 1 && dayNumber <= daysInMonth;
              const currentDate = new Date(year, month, dayNumber);
              const isSelected = !!selectedDate && isCurrentMonth && currentDate.toDateString() === selectedDate.toDateString();

              return (
                <button
                  key={index}
                  type="button"
                  className={`h-8 rounded-full ${isSelected ? "bg-[color:var(--primary)] text-white" : isCurrentMonth ? "hover:bg-[color:var(--surface-2)]" : "text-[color:var(--text-muted)]"}`}
                  disabled={!isCurrentMonth}
                  onClick={() => {
                    const next = new Date(year, month, dayNumber);
                    onChange(toLocalISODate(next));
                    setOpen(false);
                  }}
                >
                  {isCurrentMonth ? dayNumber : ""}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex justify-start">
            <button type="button" className="rounded-md border border-[color:var(--border)] px-3 py-1 text-sm hover:bg-[color:var(--surface-2)]" onClick={() => onChange("")}>Clear</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
