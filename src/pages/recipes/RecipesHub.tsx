import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, Search, Plus, Utensils } from "lucide-react";
import { Recipe } from "../../types/recipe";
import { getPublishedRecipes, getCountrySubcategoryMap } from "../../services/recipeService";
import Navbar from "../../components/my-components/navbar";

const POPULAR_TAGS = ["All", "Vegetarian", "Quick", "Spicy", "Dinner", "Seafood", "Traditional"];

export default function RecipesHub() {
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [countryMap, setCountryMap] = useState<Record<string, { subcategories: Record<string, number>; total: number }>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("All");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [fetchedRecipes, fetchedMap] = await Promise.all([
        getPublishedRecipes({
          tag: selectedTag === "All" ? undefined : selectedTag,
          searchQuery: searchQuery || undefined,
        }),
        getCountrySubcategoryMap(),
      ]);
      setRecipes(fetchedRecipes);
      setCountryMap(fetchedMap);
      setLoading(false);
    }

    loadData();
  }, [searchQuery, selectedTag]);

  const countryList = Object.keys(countryMap).length > 0
    ? Object.keys(countryMap)
    : ["Tanzania"];

  return (
    <div className="min-h-screen bg-ground text-content pb-40">
      <header className="sticky top-0 z-40 bg-chrome backdrop-blur-xl border-b border-edge-1 px-5 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate("/")}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface-3 border border-edge-2 text-content-secondary"
          aria-label="Back to Sosika home"
        >
          <ChevronLeft size={16} />
        </button>
        <h1 className="text-[15px] font-bold text-content tracking-tight">Sosika Recipes</h1>
      </header>

      <main className="max-w-md mx-auto px-5 pt-6 flex flex-col gap-6">
        {/* Editorial intro */}
        <div>
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-content-faint">
            Sosika recipes
          </div>
          <h2 className="text-[28px] font-bold text-content tracking-[-0.025em] leading-[1.15] mt-[10px]">
            Cook it yourself<br />tonight.
          </h2>
          <p className="text-sm text-content-muted mt-[10px] leading-[1.55]">
            Local recipes from the Sosika community — with the ingredients one tap from delivery.
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-content-faint pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search recipes, ingredients, regions…"
            className="w-full bg-surface-2 border border-edge-2 rounded-2xl pl-10 pr-4 py-3.5 text-sm text-content placeholder-content-faint outline-none focus:border-sosika-cyan/35 transition-colors"
          />
        </div>

        {/* Country + tag chips */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-5 px-5">
          {countryList.map((countryName) => (
            <Link
              key={countryName}
              to={`/recipes/${encodeURIComponent(countryName)}`}
              className="px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 bg-surface-2 text-content-secondary border border-edge-2"
            >
              {countryName}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-5 px-5 -mt-4">
          {POPULAR_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-colors ${
                selectedTag === tag
                  ? "bg-sosika-cyan text-on-accent"
                  : "bg-surface-2 text-content-tertiary border border-edge-2"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Recipe list */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-[14px] bg-surface-1 border border-edge-1 animate-pulse" />
            ))}
          </div>
        ) : recipes.length === 0 ? (
          <div className="rounded-[18px] bg-surface-1 border border-edge-2 p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-[18px] bg-surface-1 text-content-muted mx-auto flex items-center justify-center">
              <Utensils size={24} />
            </div>
            <h4 className="text-sm font-bold text-content">No recipes found</h4>
            <p className="text-xs text-content-muted max-w-xs mx-auto">
              Nothing matched your search or filters. Be the first to share a recipe with the community!
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {recipes.map((recipe) => (
              <button
                key={recipe.id || recipe.slug}
                onClick={() => navigate(`/recipes/${encodeURIComponent(recipe.country)}/${encodeURIComponent(recipe.subcategory)}/${recipe.slug}`)}
                className="flex items-center gap-3.5 text-left border border-edge-2 bg-surface-1 rounded-[18px] p-[13px]"
              >
                <div className="flex-none w-[66px] h-[66px] rounded-[14px] overflow-hidden bg-[repeating-linear-gradient(135deg,#17171A_0_7px,#131316_7px_14px)]">
                  <img src={recipe.imageUrl} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-[10px] tracking-[0.1em] text-content-muted">
                    {recipe.country.toUpperCase()} · {recipe.prepTimeMinutes + recipe.cookTimeMinutes} MIN
                  </div>
                  <div className="text-[16px] font-bold tracking-[-0.015em] text-content mt-[5px] truncate">
                    {recipe.title}
                  </div>
                  <div className="text-xs text-content-muted mt-1 truncate">
                    by {recipe.submittedByName || "Sosika Kitchen"}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Sticky submit CTA */}
      <div className="fixed left-0 right-0 bottom-[84px] z-40 px-5 pb-4 pt-4 bg-gradient-to-t from-ground via-ground to-transparent">
        <Link
          to="/recipes/submit"
          className="max-w-md mx-auto w-full flex items-center justify-center gap-2 bg-transparent border border-edge-3 text-content-secondary font-semibold py-4 rounded-2xl text-sm active:opacity-80 transition-opacity"
        >
          <Plus size={16} />
          <span>Submit your recipe</span>
        </Link>
      </div>

      <Navbar />
    </div>
  );
}
