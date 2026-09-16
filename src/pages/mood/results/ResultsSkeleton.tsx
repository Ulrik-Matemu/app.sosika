const Bar = ({ w, h, r = 4 }: { w: string | number; h: number; r?: number }) => (
  <div
    style={{ width: w, height: h, borderRadius: r }}
    className="skeleton-shimmer bg-surface-2"
  />
);

const SectionSkeleton = ({ titleWidth, rows }: { titleWidth: number; rows: number }) => (
  <div>
    <div className="mb-2.5">
      <Bar w={titleWidth} h={9} r={3} />
    </div>
    <div className="rounded-[18px] border border-edge-1 bg-surface-1 px-3.5 divide-y divide-edge-1">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-3.5">
          <Bar w={52} h={52} r={14} />
          <div className="flex-1 flex flex-col gap-1.5">
            <Bar w={`${55 + i * 5}%`} h={14} />
            <Bar w={`${34 + i * 4}%`} h={11} />
          </div>
          <Bar w={44} h={14} />
        </div>
      ))}
    </div>
  </div>
);

/** Board C5 — a skeleton shaped like the sectioned layout it precedes. */
export default function ResultsSkeleton() {
  return (
    <div className="min-h-screen bg-ground pb-28 text-content-secondary">
      <div className="sticky top-0 z-30 bg-chrome backdrop-blur-xl border-b border-edge-1">
        <div className="max-w-md mx-auto px-5 pt-3.5 pb-3 flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <Bar w={40} h={40} r={999} />
            <div className="flex-1 flex flex-col gap-1.5">
              <Bar w={150} h={15} r={5} />
              <Bar w={110} h={11} />
            </div>
            <Bar w={84} h={40} r={999} />
          </div>
          <Bar w="100%" h={44} r={16} />
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 pt-[18px] flex flex-col gap-7">
        <div>
          <div className="mb-2.5">
            <Bar w={64} h={9} r={3} />
          </div>
          <div className="rounded-[18px] border border-edge-2 bg-surface-2 overflow-hidden">
            <Bar w="100%" h={188} r={0} />
            <div className="p-4 flex flex-col gap-2.5">
              <Bar w={120} h={18} r={999} />
              <Bar w="70%" h={17} r={5} />
              <Bar w="45%" h={12} />
              <div className="flex items-center justify-between mt-1">
                <Bar w={70} h={19} r={5} />
                <Bar w={86} h={42} r={999} />
              </div>
            </div>
          </div>
        </div>

        <SectionSkeleton titleWidth={110} rows={2} />
        <SectionSkeleton titleWidth={90} rows={2} />
        <SectionSkeleton titleWidth={130} rows={1} />
      </div>
    </div>
  );
}
