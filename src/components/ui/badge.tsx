import { cn } from "@/lib/utils";

type BadgeProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  className?: string;
  children: React.ReactNode;
};

export function Badge({ className, children, type = "button", ...props }: BadgeProps) {
  const Component = props.onClick ? "button" : "span";
  return (
    <Component
      {...props}
      type={Component === "button" ? type : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        "bg-[color:var(--surface-2)] text-[color:var(--text-muted)]",
        className,
      )}
    >
      {children}
    </Component>
  );
}
