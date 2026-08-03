import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search,
  Plus,
  Globe,
  Clock,
  ChevronRight,
  Sparkles,
  Utensils,
  BookOpen,
  Filter,
  ChefHat,
  ArrowLeft,
} from "lucide-react";
import { Recipe } from "../../types/recipe";
import { getPublishedRecipes, getCountrySubcategoryMap } from "../../services/recipeService";

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

  // Default countries to showcase if map has limited entries
  const countryList = Object.keys(countryMap).length > 0
    ? Object.keys(countryMap)
    : ["Tanzania"];

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white font-sans antialiased pb-24">
      {/* Header Bar */}
      <header className="sticky top-0 z-40 bg-[#0a0a0b]/90 backdrop-blur-xl border-b border-white/[0.08] px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 hover:text-white border border-white/[0.08] transition-all cursor-pointer"
              title="Back to Sosika Home"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-[#00bfff]/10 border border-[#00bfff]/20 text-[#00bfff] flex items-center justify-center font-bold">
                <BookOpen size={22} />
              </div>
              <div>
                <h1 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                  Sosika Recipes
                  <span className="text-[10px] font-mono font-bold bg-[#00bfff]/20 text-[#00bfff] px-2 py-0.5 rounded-full border border-[#00bfff]/30 uppercase">
                    Library
                  </span>
                </h1>
                <p className="text-xs text-zinc-400">Authentic regional culinary guide & dish discovery</p>
              </div>
            </div>
          </div>

          <Link
            to="/recipes/submit"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00bfff] hover:bg-[#0099cc] text-black font-bold text-xs sm:text-sm shadow-lg shadow-[#00bfff]/20 transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Submit Recipe</span>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 space-y-12">
        {/* Hero Section & Search Bar */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-[#0a0a0b] border border-white/[0.08] p-6 sm:p-10 shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#00bfff]/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          
          <div className="relative z-10 max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00bfff]/10 border border-[#00bfff]/20 text-[#00bfff] text-xs font-semibold">
              <Sparkles size={14} />
              <span>Explore Traditional & Modern East African Flavors</span>
            </div>
            
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Taste the Culture, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00bfff] via-cyan-300 to-teal-200">
                Master the Recipe.
              </span>
            </h2>
            
            <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
              Explore authentic regional cuisines, community-submitted recipes, and AI-curated culinary classics. Order ingredients directly or skip the cooking with local Sosika vendors!
            </p>

            {/* Search Input */}
            <div className="relative max-w-2xl">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500">
                <Search size={20} />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search recipes, ingredients, or regions (e.g. Biryani, Zanzibari, Coconut)..."
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white/[0.05] border border-white/[0.1] text-white placeholder-zinc-500 focus:outline-none focus:border-[#00bfff] focus:ring-1 focus:ring-[#00bfff] transition-all text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-xs text-zinc-400 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Tag Filters */}
            <div className="flex items-center gap-2 overflow-x-auto pt-2 scrollbar-none">
              <span className="text-xs text-zinc-500 flex items-center gap-1 shrink-0 mr-1">
                <Filter size={12} /> Tags:
              </span>
              {POPULAR_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                    selectedTag === tag
                      ? "bg-[#00bfff] text-black shadow-md shadow-[#00bfff]/20"
                      : "bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08] border border-white/[0.05]"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Section 1: Browse by Country */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
                <Globe className="text-[#00bfff]" size={24} />
                Explore Cuisines by Country
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400">
                Browse traditional recipes grouped by country & regional heritage
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {countryList.map((countryName) => {
              const countryData = countryMap[countryName] || {
                total: recipes.filter((r) => r.country.toLowerCase() === countryName.toLowerCase()).length,
                subcategories: {},
              };
              const subcatKeys = Object.keys(countryData.subcategories);

              return (
                <motion.div
                  key={countryName}
                  whileHover={{ y: -4 }}
                  className="group relative rounded-3xl bg-zinc-900/80 border border-white/[0.08] p-6 hover:border-[#00bfff]/40 transition-all shadow-xl overflow-hidden flex flex-col justify-between"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#00bfff]/5 rounded-full blur-2xl group-hover:bg-[#00bfff]/15 transition-all" />

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-[#00bfff]/10 border border-[#00bfff]/20 text-[#00bfff] flex items-center justify-center font-black text-xl">
                        🇹🇿
                      </div>
                      <span className="px-3 py-1 rounded-full bg-white/[0.06] text-zinc-300 border border-white/[0.08] text-xs font-semibold">
                        {countryData.total} {countryData.total === 1 ? "recipe" : "recipes"}
                      </span>
                    </div>

                    <h4 className="text-xl font-extrabold text-white mb-2 group-hover:text-[#00bfff] transition-colors">
                      {countryName}
                    </h4>

                    <p className="text-xs text-zinc-400 mb-4">
                      From coastal Zanzibari spices to inland Chaga plantain stews and Swahili classics.
                    </p>

                    {subcatKeys.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-6">
                        {subcatKeys.slice(0, 4).map((sub) => (
                          <span
                            key={sub}
                            className="text-[11px] px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] text-zinc-400"
                          >
                            {sub} ({countryData.subcategories[sub]})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <Link
                    to={`/recipes/${encodeURIComponent(countryName)}`}
                    className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/[0.05] hover:bg-[#00bfff] hover:text-black text-white font-bold text-xs border border-white/[0.08] transition-all group-hover:border-[#00bfff]/30"
                  >
                    <span>Browse {countryName} Cuisines</span>
                    <ChevronRight size={16} />
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Section 2: Recipe Grid (Featured / Filtered Results) */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
                <ChefHat className="text-[#00bfff]" size={24} />
                {searchQuery || selectedTag !== "All" ? "Search Results" : "Featured & Recent Recipes"}
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400">
                {recipes.length} {recipes.length === 1 ? "recipe" : "recipes"} available
              </p>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((idx) => (
                <div key={idx} className="h-80 rounded-3xl bg-zinc-900/60 border border-white/[0.05] animate-pulse p-4" />
              ))}
            </div>
          ) : recipes.length === 0 ? (
            <div className="rounded-3xl bg-zinc-900/50 border border-white/[0.08] p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-white/[0.05] text-zinc-500 mx-auto flex items-center justify-center">
                <Utensils size={32} />
              </div>
              <h4 className="text-lg font-bold text-white">No recipes found</h4>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                No recipes matching your search or filters were found. Be the first to share a recipe with the community!
              </p>
              <Link
                to="/recipes/submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00bfff] text-black font-bold text-xs"
              >
                <Plus size={16} /> Submit a Recipe
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {recipes.map((recipe) => (
                <motion.div
                  key={recipe.id || recipe.slug}
                  whileHover={{ y: -4 }}
                  className="group relative rounded-3xl bg-zinc-900/90 border border-white/[0.08] hover:border-[#00bfff]/40 transition-all shadow-xl overflow-hidden flex flex-col justify-between"
                >
                  {/* Image Header */}
                  <div className="relative h-48 overflow-hidden bg-zinc-800">
                    <img
                      src={recipe.imageUrl}
                      alt={recipe.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-black/30" />
                    
                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[#00bfff] border border-[#00bfff]/30 text-[10px] font-bold">
                        {recipe.subcategory}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3">
                      <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-zinc-300 border border-white/[0.1] text-[10px] font-semibold capitalize">
                        {recipe.difficulty}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                        <span>{recipe.country}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} className="text-[#00bfff]" />
                          {recipe.prepTimeMinutes + recipe.cookTimeMinutes} mins total
                        </span>
                      </div>

                      <h4 className="text-lg font-bold text-white group-hover:text-[#00bfff] transition-colors line-clamp-2">
                        {recipe.title}
                      </h4>
                    </div>

                    {/* Tags */}
                    {recipe.tags && recipe.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {recipe.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.04] text-zinc-400 border border-white/[0.05]"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Action Link */}
                    <Link
                      to={`/recipes/${encodeURIComponent(recipe.country)}/${encodeURIComponent(recipe.subcategory)}/${recipe.slug}`}
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
        </section>
      </main>
    </div>
  );
}
