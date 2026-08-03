import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Globe, ChevronRight, UtensilsCrossed, BookOpen } from "lucide-react";
import { Recipe } from "../../types/recipe";
import { getPublishedRecipes } from "../../services/recipeService";

export default function RecipeCountryPage() {
  const { country } = useParams<{ country: string }>();
  const navigate = useNavigate();
  const [, setRecipes] = useState<Recipe[]>([]);
  const [subcategories, setSubcategories] = useState<Record<string, Recipe[]>>({});
  const [loading, setLoading] = useState(true);

  const decodedCountry = decodeURIComponent(country || "Tanzania");

  useEffect(() => {
    async function loadCountryData() {
      setLoading(true);
      const allPublished = await getPublishedRecipes({ country: decodedCountry });
      setRecipes(allPublished);

      const grouped: Record<string, Recipe[]> = {};
      allPublished.forEach((r) => {
        if (!grouped[r.subcategory]) {
          grouped[r.subcategory] = [];
        }
        grouped[r.subcategory].push(r);
      });

      setSubcategories(grouped);
      setLoading(false);
    }

    loadCountryData();
  }, [decodedCountry]);

  const subcategoryList = Object.keys(subcategories);

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white font-sans antialiased pb-24">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-[#0a0a0b]/90 backdrop-blur-xl border-b border-white/[0.08] px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/recipes")}
              className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 hover:text-white border border-white/[0.08] transition-all cursor-pointer"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Link to="/recipes" className="hover:text-[#00bfff]">Recipes</Link>
                <span>/</span>
                <span className="text-white font-semibold">{decodedCountry}</span>
              </div>
              <h1 className="text-xl font-black text-white">{decodedCountry} Cuisines & Regions</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 space-y-10">
        {/* Banner */}
        <section className="relative rounded-3xl bg-gradient-to-r from-zinc-900 to-[#0a0a0b] border border-white/[0.08] p-6 sm:p-10 shadow-xl overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#00bfff]/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00bfff]/10 border border-[#00bfff]/20 text-[#00bfff] text-xs font-semibold">
              <Globe size={14} />
              <span>Country Selection</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              {decodedCountry} Recipe Library
            </h2>
            <p className="text-sm text-zinc-400">
              Select a subcategory or culinary style below to discover authentic recipes from {decodedCountry}.
            </p>
          </div>
        </section>

        {/* Subcategories Grid */}
        <section className="space-y-6">
          <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
            <BookOpen className="text-[#00bfff]" size={22} />
            Subcategories & Regional Styles
          </h3>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-44 rounded-3xl bg-zinc-900/60 border border-white/[0.05] animate-pulse" />
              ))}
            </div>
          ) : subcategoryList.length === 0 ? (
            <div className="rounded-3xl bg-zinc-900/50 border border-white/[0.08] p-12 text-center space-y-3">
              <UtensilsCrossed size={32} className="mx-auto text-zinc-500" />
              <h4 className="text-base font-bold text-white">No subcategories found</h4>
              <p className="text-xs text-zinc-400">No published recipes available yet for {decodedCountry}.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {subcategoryList.map((subcatName) => {
                const subcatRecipes = subcategories[subcatName];
                const sampleImage = subcatRecipes[0]?.imageUrl || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1000&auto=format&fit=crop";

                return (
                  <motion.div
                    key={subcatName}
                    whileHover={{ y: -4 }}
                    className="group rounded-3xl bg-zinc-900/90 border border-white/[0.08] hover:border-[#00bfff]/40 transition-all overflow-hidden flex flex-col justify-between"
                  >
                    <div className="h-36 relative overflow-hidden bg-zinc-800">
                      <img
                        src={sampleImage}
                        alt={subcatName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
                      <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
                        <h4 className="text-lg font-bold text-white group-hover:text-[#00bfff] transition-colors">
                          {subcatName}
                        </h4>
                        <span className="px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[#00bfff] text-[10px] font-bold border border-[#00bfff]/30">
                          {subcatRecipes.length} {subcatRecipes.length === 1 ? "recipe" : "recipes"}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 space-y-3">
                      <div className="text-xs text-zinc-400 line-clamp-2">
                        Includes: {subcatRecipes.map((r) => r.title).join(", ")}
                      </div>

                      <Link
                        to={`/recipes/${encodeURIComponent(decodedCountry)}/${encodeURIComponent(subcatName)}`}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/[0.05] hover:bg-[#00bfff] hover:text-black text-white font-bold text-xs border border-white/[0.08] transition-all"
                      >
                        <span>Explore {subcatName} Recipes</span>
                        <ChevronRight size={14} />
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
