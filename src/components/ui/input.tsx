import { cn } from "@/lib/utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 text-sm text-[color:var(--text)] placeholder:text-[color:var(--text-muted)] shadow-sm outline-none transition focus:border-[color:var(--ring)] focus:ring-2 focus:ring-[color:var(--ring-soft)]",
        className,
      )}
      {...props}
    />
  );
}
