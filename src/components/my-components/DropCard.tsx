import { ReactNode } from "react";
import { DropCountdown } from "../../hooks/useDropCountdown";

interface DropCardProps {
  /**
   * "drop" is the amber, time-boxed treatment. "neutral" is the same shape for
   * a standing destination — amber carries urgency in this design language, so
   * two amber cards on one screen would spend that signal on nothing.
   */
  tone?: "drop" | "neutral";
  eyebrow?: string;
  title: string;
  meta?: ReactNode;
  countdown?: DropCountdown;
  onClick?: () => void;
  className?: string;
}

/** Amber-framed "drop" banner from the design canvas — used on Home, Search, and the drop screen itself. */
export default function DropCard({
  tone = "drop",
  eyebrow = "Drop",
  title,
  meta,
  countdown,
  onClick,
  className,
}: DropCardProps) {
  const Wrapper = onClick ? "button" : "div";
  const isDrop = tone === "drop";
  const frame = isDrop
    ? "border-sosika-amber/30 bg-sosika-amber/[0.06]"
    : "border-edge-2 bg-surface-1";
  const accent = isDrop ? "text-amber-ink" : "text-content-muted";

  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`w-full text-left rounded-[18px] border ${frame} px-4 py-3.5 flex items-center justify-between gap-3 ${
        onClick ? "cursor-pointer active:opacity-85 transition-opacity" : ""
      } ${className ?? ""}`}
    >
      <div>
        <div className={`font-mono text-[10px] font-bold uppercase tracking-[0.14em] ${accent}`}>
          {eyebrow}
        </div>
        <div className="text-sm font-bold mt-1 tracking-[-0.01em]">{title}</div>
        {meta && <div className="text-xs text-content-secondary mt-[3px]">{meta}</div>}
      </div>

      {countdown ? (
        countdown.isLive ? (
          <span className="font-mono text-xs font-bold text-amber-ink whitespace-nowrap">
            Live now
          </span>
        ) : (
          <span className="font-mono text-[13px] font-bold text-amber-ink whitespace-nowrap">
            {countdown.days}d {countdown.hours}h
          </span>
        )
      ) : (
        onClick && <span className={`text-[15px] ${isDrop ? "text-amber-ink" : "text-content-muted"}`}>→</span>
      )}
    </Wrapper>
  );
}
