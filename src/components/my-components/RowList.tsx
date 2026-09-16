import { ReactNode } from "react";
import clsx from "clsx";

interface RowListItem {
  id: string | number;
  thumbnail?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
}

interface RowListProps {
  items: RowListItem[];
  className?: string;
}

/**
 * Shared "row list" pattern from the design canvas — thumbnail (optional),
 * title/subtitle/meta stack, trailing value or action, bottom hairline
 * between rows. Used by results, vendor menus, order history, the wallet
 * ledger, and the recipes hub.
 */
export default function RowList({ items, className }: RowListProps) {
  return (
    <div className={clsx("flex flex-col", className)}>
      {items.map((item, i) => {
        const Wrapper = item.onClick ? "button" : "div";
        return (
          <Wrapper
            key={item.id}
            type={item.onClick ? "button" : undefined}
            onClick={item.onClick}
            className={clsx(
              "flex gap-3.5 items-center py-3.5 text-left w-full",
              i !== items.length - 1 && "border-b border-edge-1",
              item.onClick && "cursor-pointer active:opacity-80 transition-opacity"
            )}
          >
            {item.thumbnail !== undefined && (
              <div className="flex-none w-[52px] h-[52px] rounded-[14px] overflow-hidden bg-[repeating-linear-gradient(135deg,#17171A_0_7px,#131316_7px_14px)]">
                {item.thumbnail}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold tracking-tight truncate">
                {item.title}
              </div>
              {item.subtitle && (
                <div className="text-xs text-content-muted mt-1 truncate">
                  {item.subtitle}
                </div>
              )}
              {item.meta && (
                <div className="font-mono text-[11px] text-content-faint mt-1">
                  {item.meta}
                </div>
              )}
            </div>
            {item.trailing !== undefined && (
              <div className="flex-none flex items-center gap-3">
                {item.trailing}
              </div>
            )}
          </Wrapper>
        );
      })}
    </div>
  );
}

export type { RowListItem };
