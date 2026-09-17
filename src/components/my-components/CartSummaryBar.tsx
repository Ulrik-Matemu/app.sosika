interface CartSummaryBarProps {
  label: string;
  total: number;
  onClick: () => void;
}

/**
 * Floating "N items · Vendor  Total →" bar from the design canvas — pinned
 * above the bottom nav on the results and vendor-menu screens so users get a
 * persistent nudge toward checkout while still browsing.
 */
export default function CartSummaryBar({ label, total, onClick }: CartSummaryBarProps) {
  return (
    <div className="fixed left-0 right-0 bottom-[92px] z-40 px-4 sm:px-5 pointer-events-none">
      <div className="max-w-md mx-auto pointer-events-auto">
        <button
          type="button"
          onClick={onClick}
          className="w-full flex items-center justify-between bg-sosika-cyan rounded-[18px] px-8 py-3.5 text-on-accent shadow-lg shadow-sosika-cyan/20 active:scale-[0.99] transition-transform"
        >
          <span className="text-[13px] font-bold">{label}</span>
          <span className="font-mono text-[15px] font-bold flex items-center gap-1.5">
            {total.toLocaleString()}
            <span aria-hidden>→</span>
          </span>
        </button>
      </div>
    </div>
  );
}
