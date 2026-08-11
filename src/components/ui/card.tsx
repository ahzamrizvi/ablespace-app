import { cn } from "@/lib/utils";

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) {
  return (
    <div className={cn("rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[0_1px_2px_rgba(15,23,42,0.04)]", className)} {...props}>
      {children}
    </div>
  );
}
