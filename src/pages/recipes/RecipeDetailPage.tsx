import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Clock,
  Users,
  ChefHat,
  CheckCircle2,
  Share2,
  Store,
  ExternalLink,
  Eye,
  UtensilsCrossed,
  Sparkles,
  Info,
} from "lucide-react";
import { Recipe, VendorMinimal } from "../../types/recipe";
import { getRecipeBySlug, getLinkedVendors, incrementRecipeViews } from "../../services/recipeService";

export default function RecipeDetailPage() {
  const { country, subcategory, slug } = useParams<{
    country: string;
    subcategory: string;
    slug: string;
  }>();
  const navigate = useNavigate();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [linkedVendors, setLinkedVendors] = useState<VendorMinimal[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({});
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);

  const decodedCountry = decodeURIComponent(country || "");
  const decodedSubcategory = decodeURIComponent(subcategory || "");
  const recipeSlug = slug || "";

  useEffect(() => {
    async function loadRecipe() {
      setLoading(true);
      const data = await getRecipeBySlug(decodedCountry, decodedSubcategory, recipeSlug);
      setRecipe(data);

      if (data) {
        if (data.id) {
          incrementRecipeViews(data.id);
        }
        if (data.linkedVendorIds && data.linkedVendorIds.length > 0) {
          const vendors = await getLinkedVendors(data.linkedVendorIds);
          setLinkedVendors(vendors);
        }
      }

      setLoading(false);
    }

    loadRecipe();
  }, [decodedCountry, decodedSubcategory, recipeSlug]);

  const toggleIngredient = (id: string) => {
    setCheckedIngredients((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleStep = (id: string) => {
    setCompletedSteps((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: recipe?.title,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Construct JSON-LD Schema.org/Recipe structure
  const jsonLdData = recipe
    ? {
        "@context": "https://schema.org/",
        "@type": "Recipe",
        name: recipe.title,
        image: [recipe.imageUrl],
        author: {
          "@type": recipe.submittedByName ? "Person" : "Organization",
          name: recipe.submittedByName || "Sosika Culinary Engine",
        },
        datePublished: recipe.publishedAt || recipe.createdAt,
        description: `${recipe.title} recipe from ${recipe.subcategory}, ${recipe.country}.`,
        prepTime: `PT${recipe.prepTimeMinutes}M`,
        cookTime: `PT${recipe.cookTimeMinutes}M`,
        totalTime: `PT${recipe.prepTimeMinutes + recipe.cookTimeMinutes}M`,
        keywords: recipe.tags.join(", "),
        recipeYield: `${recipe.servings} servings`,
        recipeCategory: recipe.subcategory,
        recipeCuisine: recipe.country,
        recipeIngredient: recipe.ingredients.map((ing) => `${ing.amount} ${ing.name}`),
        recipeInstructions: recipe.steps.map((st, idx) => ({
          "@type": "HowToStep",
          name: st.title || `Step ${idx + 1}`,
          text: st.content,
          position: idx + 1,
        })),
      }
    : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center p-6 text-white">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 border-4 border-[#00bfff] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-zinc-400">Loading authentic recipe...</p>
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] text-white flex flex-col items-center justify-center p-6 space-y-4">
        <UtensilsCrossed size={48} className="text-zinc-600" />
        <h2 className="text-2xl font-bold">Recipe Not Found</h2>
        <p className="text-sm text-zinc-400 text-center max-w-md">
          The recipe you're looking for does not exist or may have been removed.
        </p>
        <button
          onClick={() => navigate("/recipes")}
          className="px-6 py-2.5 rounded-xl bg-[#00bfff] text-black font-bold text-xs"
        >
          Return to Recipe Hub
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white font-sans antialiased pb-24">
      {/* Helmet SEO Structured Data */}
      <Helmet>
        <title>{`${recipe.title} - ${recipe.country} (${recipe.subcategory}) | Sosika`}</title>
        <meta
          name="description"
          content={`Learn how to cook ${recipe.title} from ${recipe.subcategory}, ${recipe.country}. Prep time: ${recipe.prepTimeMinutes}m, Cook time: ${recipe.cookTimeMinutes}m.`}
        />
        {jsonLdData && (
          <script type="application/ld+json">{JSON.stringify(jsonLdData)}</script>
        )}
      </Helmet>

      {/* Header Sticky Navigation */}
      <header className="sticky top-0 z-40 bg-[#0a0a0b]/90 backdrop-blur-xl border-b border-white/[0.08] px-4 sm:px-8 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate(`/recipes/${encodeURIComponent(decodedCountry)}/${encodeURIComponent(decodedSubcategory)}`)}
              className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 hover:text-white border border-white/[0.08] transition-all cursor-pointer shrink-0"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-zinc-400 truncate">
                <Link to="/recipes" className="hover:text-[#00bfff]">Recipes</Link>
                <span>/</span>
                <Link to={`/recipes/${encodeURIComponent(decodedCountry)}`} className="hover:text-[#00bfff] truncate">
                  {decodedCountry}
                </Link>
                <span>/</span>
                <span className="text-white font-semibold truncate">{recipe.subcategory}</span>
              </div>
              <h1 className="text-sm sm:text-base font-bold text-white truncate">{recipe.title}</h1>
            </div>
          </div>

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 text-xs font-semibold border border-white/[0.08] transition-all cursor-pointer shrink-0"
          >
            <Share2 size={14} />
            <span>{copied ? "Link Copied!" : "Share"}</span>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-8 pt-6 space-y-10">
        {/* Recipe Banner & Title Section */}
        <section className="space-y-6">
          <div className="relative rounded-3xl overflow-hidden bg-zinc-900 border border-white/[0.08] h-64 sm:h-96 shadow-2xl">
            <img
              src={recipe.imageUrl}
              alt={recipe.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
            
            <div className="absolute top-4 left-4 flex flex-wrap gap-2">
              <span className="px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-[#00bfff] border border-[#00bfff]/30 text-xs font-bold">
                {recipe.country} • {recipe.subcategory}
              </span>
              <span className="px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-zinc-300 border border-white/[0.1] text-xs font-semibold capitalize">
                {recipe.difficulty}
              </span>
            </div>

            <div className="absolute bottom-6 left-6 right-6 space-y-2">
              <h2 className="text-2xl sm:text-4xl font-black text-white leading-tight">
                {recipe.title}
              </h2>
              {recipe.submittedByName && (
                <div className="text-xs text-zinc-300 flex items-center gap-1.5">
                  <ChefHat size={14} className="text-[#00bfff]" />
                  <span>Submitted by <strong className="text-white">{recipe.submittedByName}</strong></span>
                  {recipe.submittedBySocial && (
                    <span className="text-[#00bfff]">({recipe.submittedBySocial})</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-zinc-900/80 border border-white/[0.08] p-4 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#00bfff]/10 text-[#00bfff] flex items-center justify-center">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-[10px] text-zinc-400 uppercase font-mono">Prep Time</p>
                <p className="text-sm font-bold text-white">{recipe.prepTimeMinutes} mins</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#00bfff]/10 text-[#00bfff] flex items-center justify-center">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-[10px] text-zinc-400 uppercase font-mono">Cook Time</p>
                <p className="text-sm font-bold text-white">{recipe.cookTimeMinutes} mins</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#00bfff]/10 text-[#00bfff] flex items-center justify-center">
                <Users size={20} />
              </div>
              <div>
                <p className="text-[10px] text-zinc-400 uppercase font-mono">Servings</p>
                <p className="text-sm font-bold text-white">{recipe.servings} people</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#00bfff]/10 text-[#00bfff] flex items-center justify-center">
                <Eye size={20} />
              </div>
              <div>
                <p className="text-[10px] text-zinc-400 uppercase font-mono">Views</p>
                <p className="text-sm font-bold text-white">{recipe.views || 1}</p>
              </div>
            </div>
          </div>
        </section>

        {/* SOSIKA VENDOR DISH INTEGRATION CARD */}
        {linkedVendors.length > 0 ? (
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#00bfff]/20 via-cyan-950/40 to-zinc-900 border border-[#00bfff]/30 p-6 sm:p-8 shadow-2xl space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#00bfff] text-black flex items-center justify-center font-bold">
                  <Store size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Skip the Cooking!</h3>
                  <p className="text-xs text-zinc-300">
                    Order this exact dish prepared fresh by registered Sosika local vendors.
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-[#00bfff]/20 text-[#00bfff] border border-[#00bfff]/30 text-xs font-mono font-bold uppercase">
                Available Now
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {linkedVendors.map((vendor) => (
                <div
                  key={vendor.id}
                  className="flex items-center justify-between p-4 rounded-2xl bg-black/40 border border-white/[0.1] hover:border-[#00bfff]/50 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {vendor.image_url ? (
                      <img
                        src={vendor.image_url}
                        alt={vendor.name}
                        className="w-12 h-12 rounded-xl object-cover border border-white/[0.1]"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-zinc-800 text-[#00bfff] flex items-center justify-center font-bold">
                        {vendor.name.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-white truncate">{vendor.name}</h4>
                      {vendor.location && (
                        <p className="text-xs text-zinc-400 truncate">{vendor.location}</p>
                      )}
                    </div>
                  </div>

                  <Link
                    to={`/vendor/${vendor.id}/menu`}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#00bfff] text-black font-bold text-xs hover:bg-[#0099cc] transition-all shrink-0 ml-3"
                  >
                    <span>Order Menu</span>
                    <ExternalLink size={14} />
                  </Link>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section className="rounded-2xl bg-zinc-900/40 border border-white/[0.06] p-4 flex items-center justify-between text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <Info size={16} className="text-[#00bfff]" />
              <span>Are you a vendor serving {recipe.title}? Contact admin to link your menu to this recipe!</span>
            </div>
          </section>
        )}

        {/* Recipe Content: Ingredients & Steps Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Ingredients Column */}
          <section className="lg:col-span-1 space-y-4 bg-zinc-900/70 border border-white/[0.08] p-6 rounded-3xl h-fit">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <ChefHat className="text-[#00bfff]" size={20} />
                Ingredients
              </h3>
              <span className="text-xs text-zinc-400 font-mono">
                {recipe.ingredients.length} items
              </span>
            </div>

            <p className="text-[11px] text-zinc-400">Tap items as you gather ingredients:</p>

            <ul className="space-y-2.5">
              {recipe.ingredients.map((ing) => {
                const isChecked = checkedIngredients[ing.id];
                return (
                  <li
                    key={ing.id}
                    onClick={() => toggleIngredient(ing.id)}
                    className={`flex items-start gap-3 p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                      isChecked
                        ? "bg-white/[0.02] border-white/[0.05] text-zinc-500 line-through"
                        : "bg-white/[0.04] border-white/[0.08] text-zinc-200 hover:border-[#00bfff]/30"
                    }`}
                  >
                    <CheckCircle2
                      size={18}
                      className={`mt-0.5 shrink-0 transition-colors ${
                        isChecked ? "text-[#00bfff]" : "text-zinc-600"
                      }`}
                    />
                    <div className="text-xs flex-1 flex justify-between gap-2">
                      <span className="font-medium">{ing.name}</span>
                      <span className="font-mono text-[#00bfff] shrink-0">{ing.amount}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Cooking Steps Column */}
          <section className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Sparkles className="text-[#00bfff]" size={20} />
                Step-by-Step Instructions
              </h3>
              <span className="text-xs text-zinc-400 font-mono">
                {recipe.steps.length} steps
              </span>
            </div>

            <div className="space-y-4">
              {recipe.steps.map((step, idx) => {
                const isDone = completedSteps[step.id];
                return (
                  <motion.div
                    key={step.id}
                    onClick={() => toggleStep(step.id)}
                    whileHover={{ scale: 1.01 }}
                    className={`p-6 rounded-3xl border transition-all cursor-pointer select-none space-y-2 ${
                      isDone
                        ? "bg-zinc-950/60 border-white/[0.05] opacity-70"
                        : "bg-zinc-900/90 border-white/[0.08] hover:border-[#00bfff]/40 shadow-lg"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center ${
                            isDone
                              ? "bg-white/[0.05] text-zinc-500"
                              : "bg-[#00bfff]/10 border border-[#00bfff]/30 text-[#00bfff]"
                          }`}
                        >
                          {idx + 1}
                        </div>
                        <h4 className="text-base font-bold text-white">
                          {step.title || `Step ${idx + 1}`}
                        </h4>
                      </div>

                      <CheckCircle2
                        size={20}
                        className={isDone ? "text-[#00bfff]" : "text-zinc-700"}
                      />
                    </div>

                    <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed pl-11">
                      {step.content}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
