import clsx from "clsx";

type StatusVariant = "open" | "active" | "closed" | "neutral";

interface StatusPillProps {
  label: string;
  variant?: StatusVariant;
  className?: string;
}

const VARIANT_STYLES: Record<StatusVariant, string> = {
  open: "text-emerald-ink border-sosika-emerald/30 bg-sosika-emerald/10",
  active: "text-accent-ink border-sosika-cyan/30 bg-sosika-cyan/10",
  closed: "text-content-muted border-edge-3 bg-surface-2",
  neutral: "text-content-secondary border-edge-3 bg-surface-2",
};

/** Small status badge (OPEN / PREPARING / etc.) shared across vendor, results, and orders screens. */
export default function StatusPill({ label, variant = "neutral", className }: StatusPillProps) {
  return (
    <span
      className={clsx(
        "font-mono text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border",
        VARIANT_STYLES[variant],
        className
      )}
    >
      {label}
    </span>
  );
}
