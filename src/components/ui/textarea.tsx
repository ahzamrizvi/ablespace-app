import { cn } from "@/lib/utils";

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--text)] placeholder:text-[color:var(--text-muted)] shadow-sm outline-none transition focus:border-[color:var(--ring)] focus:ring-2 focus:ring-[color:var(--ring-soft)]",
        className,
      )}
      {...props}
    />
  );
}
