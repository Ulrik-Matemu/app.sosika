import { DishGroup } from "./ranking";
import ResultRow from "./ResultRow";
import ResultsSection from "./ResultsSection";

interface FallbackStateProps {
  mood: string;
  /** Best-scoring things nearby, standing in for a match we don't have. */
  neighbours: DishGroup[];
  /** Whether a semantic signal actually backs the "closest in spirit" claim. */
  neighboursAreSemantic: boolean;
  moodSuggestions: string[];
  onPickMood: (mood: string) => void;
  onBrowseAll: () => void;
}

/**
 * Board C6 — nothing matched the mood. The old screen handled this with a
 * small amber banner over an unordered dump of every nearby item; this names
 * the miss and offers the three ways out.
 */
export default function FallbackState({
  mood,
  neighbours,
  neighboursAreSemantic,
  moodSuggestions,
  onPickMood,
  onBrowseAll,
}: FallbackStateProps) {
  return (
    <div className="flex flex-col gap-7">
      <div>
        <h2 className="text-[19px] font-extrabold text-content leading-tight">
          Nothing matches “{mood}” nearby
        </h2>
        <p className="text-[13.5px] text-content-tertiary mt-2 leading-relaxed">
          No kitchen close to you is serving it right now.{" "}
          {neighboursAreSemantic
            ? "Here’s what’s closest in spirit."
            : "Here’s what people nearby are ordering instead."}
        </p>
      </div>

      {neighbours.length > 0 && (
        <ResultsSection
          title={neighboursAreSemantic ? `Closest to “${mood}”` : "Popular nearby instead"}
        >
          {neighbours.map((group) => (
            <ResultRow key={group.primary.item.id} ranked={group.primary} source="fallback" />
          ))}
        </ResultsSection>
      )}

      {moodSuggestions.length > 0 && (
        <div>
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-content-faint mb-2.5">
            Try a different mood
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {moodSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => onPickMood(suggestion.toLowerCase())}
                className="px-3.5 py-2 rounded-full text-xs font-bold bg-surface-2 text-content-secondary border border-edge-2"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onBrowseAll}
        className="w-full h-12 rounded-2xl bg-sosika-cyan text-on-accent text-sm font-bold active:opacity-90"
      >
        Browse everything nearby
      </button>
    </div>
  );
}
