interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/**
 * Shared segmented control from the design canvas — used for Active / History /
 * Account on the orders screen, and Available now / Custom order on the drop
 * screen. A row of plain-text options where the active one turns cyan.
 */
export default function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: SegmentedProps<T>) {
  return (
    <div className={`flex items-center gap-5 ${className ?? ""}`}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`text-sm font-semibold pb-[11px] border-b-2 transition-colors ${
            value === opt.value
              ? "text-accent-ink border-sosika-cyan"
              : "text-content-faint border-transparent"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
