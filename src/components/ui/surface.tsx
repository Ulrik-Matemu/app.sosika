import { forwardRef, ElementType, HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

/**
 * The app's card/panel primitive.
 *
 * Every surface in the customer flow used to be hand-rolled from literals
 * (`bg-white/[0.035] border border-white/[0.08] rounded-[18px]`), which is why
 * the documented three-step scale had drifted to fifteen opacity values and
 * why nothing could be themed. Reach for this instead of spelling colours.
 *
 * `glass` adds the blur token, so the Settings glass/solid switch reaches every
 * card at once. Sticky chrome and modal scrims are deliberately NOT built on
 * this — they must stay translucent in both styles to stay legible over
 * scrolling content.
 */
export const surfaceVariants = cva("", {
  variants: {
    level: {
      1: "bg-surface-1",
      2: "bg-surface-2",
      3: "bg-surface-3",
      none: "",
    },
    edge: {
      1: "border border-edge-1",
      2: "border border-edge-2",
      3: "border border-edge-3",
      none: "",
    },
    radius: {
      thumb: "rounded-[14px]",
      input: "rounded-2xl",
      card: "rounded-[18px]",
      pill: "rounded-full",
      none: "",
    },
    glass: {
      true: "glass",
      false: "",
    },
  },
  defaultVariants: {
    level: 1,
    edge: 2,
    radius: "card",
    glass: false,
  },
});

export interface SurfaceProps
  extends Omit<HTMLAttributes<HTMLElement>, "color">,
    VariantProps<typeof surfaceVariants> {
  /** Render as a different element, e.g. "section" or "li". */
  as?: "div" | "section" | "article" | "li" | "aside";
}

const Surface = forwardRef<HTMLElement, SurfaceProps>(
  ({ className, level, edge, radius, glass, as = "div", ...props }, ref) => {
    const Tag = as as ElementType;
    return (
      <Tag
        ref={ref}
        className={cn(surfaceVariants({ level, edge, radius, glass }), className)}
        {...props}
      />
    );
  }
);
Surface.displayName = "Surface";

export default Surface;
