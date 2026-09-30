import { cn } from "@/lib/utils";

export function Logo({ className, showWordmark = true }: { className?: string; showWordmark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-soft">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M6 20c0-6 12-4 12-10a4 4 0 0 0-8 0c0 6 12 4 12 10" strokeLinecap="round" />
          <circle cx="6" cy="20" r="1.6" fill="currentColor" stroke="none" />
          <circle cx="22" cy="20" r="1.6" fill="currentColor" stroke="none" />
        </svg>
      </span>
      {showWordmark ? (
        <span className="font-display text-lg font-semibold tracking-tight">Route Agent</span>
      ) : null}
    </span>
  );
}
