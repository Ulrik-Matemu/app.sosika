import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ChevronLeft, Utensils } from "lucide-react";
import { Recipe } from "../../types/recipe";
import { getPublishedRecipes } from "../../services/recipeService";
import RowList, { RowListItem } from "../../components/my-components/RowList";
import Navbar from "../../components/my-components/navbar";

export default function RecipeSubcategoryPage() {
  const { country, subcategory } = useParams<{ country: string; subcategory: string }>();
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");

  const decodedCountry = decodeURIComponent(country || "");
  const decodedSubcategory = decodeURIComponent(subcategory || "");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const data = await getPublishedRecipes({
        country: decodedCountry,
        subcategory: decodedSubcategory,
      });
      setRecipes(data);
      setLoading(false);
    }
    loadData();
  }, [decodedCountry, decodedSubcategory]);

  const filteredRecipes = recipes.filter((r) =>
    difficultyFilter === "all" ? true : r.difficulty === difficultyFilter
  );

  const recipeItems: RowListItem[] = filteredRecipes.map((recipe) => ({
    id: recipe.id || recipe.slug,
    thumbnail: <img src={recipe.imageUrl} alt="" className="w-full h-full object-cover" />,
    title: recipe.title,
    subtitle: `${recipe.prepTimeMinutes + recipe.cookTimeMinutes} min · serves ${recipe.servings}`,
    meta: recipe.difficulty.toUpperCase(),
    onClick: () => navigate(`/recipes/${encodeURIComponent(decodedCountry)}/${encodeURIComponent(decodedSubcategory)}/${recipe.slug}`),
  }));

  return (
    <div className="min-h-screen bg-ground text-content pb-28">
      <header className="sticky top-0 z-40 bg-chrome backdrop-blur-xl border-b border-edge-1 px-5 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate(`/recipes/${encodeURIComponent(decodedCountry)}`)}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface-3 border border-edge-2 text-content-secondary"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="min-w-0 flex items-center gap-1.5 text-xs text-content-muted truncate">
          <Link to="/recipes" className="hover:text-accent-ink">Recipes</Link>
          <span>/</span>
          <Link to={`/recipes/${encodeURIComponent(decodedCountry)}`} className="hover:text-accent-ink">
            {decodedCountry}
          </Link>
          <span>/</span>
          <span className="text-content-secondary font-semibold truncate">{decodedSubcategory}</span>
        </div>
      </header>

      <main className="max-w-md mx-auto px-5 pt-6 flex flex-col gap-5">
        <div>
          <h1 className="text-[22px] font-bold text-content tracking-tight">
            {decodedCountry} — {decodedSubcategory}
          </h1>
          <p className="text-sm text-content-muted mt-1">
            Showing {filteredRecipes.length} of {recipes.length} recipes
          </p>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-5 px-5">
          {["all", "easy", "medium", "hard"].map((diff) => (
            <button
              key={diff}
              onClick={() => setDifficultyFilter(diff)}
              className={`px-3.5 py-2 rounded-full text-xs font-semibold capitalize whitespace-nowrap flex-shrink-0 transition-colors ${
                difficultyFilter === diff
                  ? "bg-sosika-cyan text-on-accent"
                  : "bg-surface-2 text-content-tertiary border border-edge-2"
              }`}
            >
              {diff}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-[14px] bg-surface-1 border border-edge-1 animate-pulse" />
            ))}
          </div>
        ) : filteredRecipes.length === 0 ? (
          <div className="rounded-[18px] bg-surface-1 border border-edge-2 p-8 text-center space-y-3">
            <Utensils size={28} className="mx-auto text-content-faint" />
            <h4 className="text-sm font-bold text-content">No recipes found</h4>
            <p className="text-xs text-content-muted">
              No recipes match the selected difficulty filter in {decodedSubcategory}.
            </p>
          </div>
        ) : (
          <RowList items={recipeItems} />
        )}
      </main>

      <Navbar />
    </div>
  );
}
