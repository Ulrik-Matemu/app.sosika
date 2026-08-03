import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, ChevronRight, Utensils, Filter } from "lucide-react";
import { Recipe } from "../../types/recipe";
import { getPublishedRecipes } from "../../services/recipeService";

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

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white font-sans antialiased pb-24">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#0a0a0b]/90 backdrop-blur-xl border-b border-white/[0.08] px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/recipes/${encodeURIComponent(decodedCountry)}`)}
              className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 hover:text-white border border-white/[0.08] transition-all cursor-pointer"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Link to="/recipes" className="hover:text-[#00bfff]">Recipes</Link>
                <span>/</span>
                <Link to={`/recipes/${encodeURIComponent(decodedCountry)}`} className="hover:text-[#00bfff]">
                  {decodedCountry}
                </Link>
                <span>/</span>
                <span className="text-white font-semibold">{decodedSubcategory}</span>
              </div>
              <h1 className="text-xl font-black text-white">{decodedSubcategory} Recipes</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 space-y-8">
        {/* Controls / Filter Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-zinc-900/60 border border-white/[0.08] p-4 rounded-2xl">
          <div>
            <h2 className="text-lg font-extrabold text-white">
              {decodedCountry} — {decodedSubcategory}
            </h2>
            <p className="text-xs text-zinc-400">
              Showing {filteredRecipes.length} of {recipes.length} recipes
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 flex items-center gap-1">
              <Filter size={12} /> Difficulty:
            </span>
            {["all", "easy", "medium", "hard"].map((diff) => (
              <button
                key={diff}
                onClick={() => setDifficultyFilter(diff)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer ${
                  difficultyFilter === diff
                    ? "bg-[#00bfff] text-black shadow-sm shadow-[#00bfff]/20"
                    : "bg-white/[0.04] text-zinc-400 hover:text-white border border-white/[0.05]"
                }`}
              >
                {diff}
              </button>
            ))}
          </div>
        </div>

        {/* Recipe Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-80 rounded-3xl bg-zinc-900/60 border border-white/[0.05] animate-pulse" />
            ))}
          </div>
        ) : filteredRecipes.length === 0 ? (
          <div className="rounded-3xl bg-zinc-900/50 border border-white/[0.08] p-12 text-center space-y-3">
            <Utensils size={32} className="mx-auto text-zinc-500" />
            <h4 className="text-base font-bold text-white">No recipes found</h4>
            <p className="text-xs text-zinc-400">
              No recipes match the selected difficulty filter in {decodedSubcategory}.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecipes.map((recipe) => (
              <motion.div
                key={recipe.id || recipe.slug}
                whileHover={{ y: -4 }}
                className="group rounded-3xl bg-zinc-900/90 border border-white/[0.08] hover:border-[#00bfff]/40 transition-all overflow-hidden flex flex-col justify-between"
              >
                <div className="relative h-48 bg-zinc-800 overflow-hidden">
                  <img
                    src={recipe.imageUrl}
                    alt={recipe.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-black/30" />
                  
                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[#00bfff] text-[10px] font-bold border border-[#00bfff]/30">
                      {recipe.subcategory}
                    </span>
                  </div>
                  <div className="absolute top-3 right-3">
                    <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-zinc-300 text-[10px] font-semibold capitalize border border-white/[0.1]">
                      {recipe.difficulty}
                    </span>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                      <Clock size={12} className="text-[#00bfff]" />
                      <span>{recipe.prepTimeMinutes + recipe.cookTimeMinutes} mins total</span>
                      <span>•</span>
                      <span>Serves {recipe.servings}</span>
                    </div>

                    <h4 className="text-base font-bold text-white group-hover:text-[#00bfff] transition-colors line-clamp-2">
                      {recipe.title}
                    </h4>
                  </div>

                  <Link
                    to={`/recipes/${encodeURIComponent(decodedCountry)}/${encodeURIComponent(decodedSubcategory)}/${recipe.slug}`}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/[0.05] hover:bg-[#00bfff] hover:text-black text-white font-bold text-xs border border-white/[0.08] transition-all"
                  >
                    <span>View Recipe</span>
                    <ChevronRight size={14} />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
