import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  CheckCircle2,
  Share2,
  ExternalLink,
  UtensilsCrossed,
} from "lucide-react";
import { Recipe, VendorMinimal } from "../../types/recipe";
import { getRecipeBySlug, getLinkedVendors, incrementRecipeViews } from "../../services/recipeService";
import Navbar from "../../components/my-components/navbar";

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
      <div className="min-h-screen bg-ground flex items-center justify-center p-6 text-content">
        <div className="space-y-4 text-center">
          <div className="w-10 h-10 border-2 border-sosika-cyan border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-content-muted">Loading authentic recipe…</p>
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="min-h-screen bg-ground text-content flex flex-col items-center justify-center p-6 space-y-4">
        <UtensilsCrossed size={40} className="text-content-faint" />
        <h2 className="text-lg font-bold">Recipe not found</h2>
        <p className="text-sm text-content-muted text-center max-w-xs">
          The recipe you're looking for does not exist or may have been removed.
        </p>
        <button
          onClick={() => navigate("/recipes")}
          className="px-6 py-2.5 rounded-2xl bg-sosika-cyan text-on-accent font-bold text-sm"
        >
          Return to recipe hub
        </button>
      </div>
    );
  }

  const totalMinutes = recipe.prepTimeMinutes + recipe.cookTimeMinutes;

  return (
    <div className="min-h-screen bg-ground text-content pb-16">
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

      <main className="max-w-md mx-auto">
        {/* 4:3 photo with back chevron overlay */}
        <div className="relative h-[230px] overflow-hidden bg-[repeating-linear-gradient(135deg,#17171A_0_9px,#131316_9px_18px)]">
          <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-sosika-ground via-transparent to-black/20" />
          <button
            onClick={() => navigate(`/recipes/${encodeURIComponent(decodedCountry)}/${encodeURIComponent(decodedSubcategory)}`)}
            className="absolute top-4 left-4 w-9 h-9 flex items-center justify-center rounded-xl bg-black/50 backdrop-blur-md text-white"
            aria-label="Back"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={handleShare}
            className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/50 backdrop-blur-md text-white text-xs font-semibold"
          >
            <Share2 size={13} />
            <span>{copied ? "Copied" : "Share"}</span>
          </button>
        </div>

        <div className="px-5 pt-5 flex flex-col gap-6">
          {/* Eyebrow + title + byline */}
          <div>
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-content-faint">
              {recipe.country} · {totalMinutes} MIN · SERVES {recipe.servings}
            </div>
            <h1 className="text-[26px] font-bold text-content tracking-[-0.025em] mt-[10px]">{recipe.title}</h1>
            <p className="text-[13px] text-content-muted mt-2">
              {recipe.submittedByName ? `by ${recipe.submittedByName}` : "by Sosika Kitchen"}
            </p>
          </div>

          {/* Order it card */}
          {linkedVendors.length > 0 ? (
            <div className="rounded-[18px] border border-sosika-cyan/28 bg-sosika-cyan/[0.055] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-content">Too tired to cook?</div>
                  <div className="text-xs text-content-secondary mt-1">
                    {linkedVendors.length} kitchen{linkedVendors.length !== 1 ? "s" : ""} serve {recipe.title.toLowerCase()} near you
                  </div>
                </div>
                {linkedVendors.length === 1 && (
                  <Link
                    to={`/vendor/${linkedVendors[0].id}/menu`}
                    className="flex-none text-xs font-bold text-on-accent bg-sosika-cyan px-[14px] py-[11px] rounded-[11px]"
                  >
                    Order it
                  </Link>
                )}
              </div>
              {linkedVendors.length > 1 && (
                <div className="flex flex-col mt-3">
                  {linkedVendors.map((vendor) => (
                    <Link
                      key={vendor.id}
                      to={`/vendor/${vendor.id}/menu`}
                      className="flex items-center justify-between py-2.5 border-t border-sosika-cyan/[0.12] first:border-t-0"
                    >
                      <span className="text-sm font-semibold text-content truncate">{vendor.name}</span>
                      <span className="flex items-center gap-1 text-xs font-bold text-accent-ink flex-none">
                        Order it
                        <ExternalLink size={12} />
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-[18px] bg-surface-1 border border-edge-2 p-4 text-xs text-content-muted">
              Are you a vendor serving {recipe.title}? Contact admin to link your menu to this recipe.
            </div>
          )}

          {/* Ingredients */}
          <div>
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-content-faint mb-3">
              Ingredients
            </div>
            <div className="flex flex-col gap-[11px]">
              {recipe.ingredients.map((ing) => {
                const isChecked = checkedIngredients[ing.id];
                return (
                  <button
                    key={ing.id}
                    onClick={() => toggleIngredient(ing.id)}
                    className={`flex items-center justify-between gap-3 text-left transition-opacity ${
                      isChecked ? "opacity-40" : ""
                    }`}
                  >
                    <span className={`text-sm ${isChecked ? "line-through text-content-muted" : "text-content-secondary"}`}>
                      {ing.name}
                    </span>
                    <span className="font-mono text-sm text-content-muted flex-none">{ing.amount}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Method */}
          <div>
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-content-faint mb-3">
              Method
            </div>
            <div className="flex flex-col gap-4">
              {recipe.steps.map((step, idx) => {
                const isDone = completedSteps[step.id];
                return (
                  <motion.button
                    key={step.id}
                    onClick={() => toggleStep(step.id)}
                    whileTap={{ scale: 0.99 }}
                    className={`flex gap-3 text-left transition-opacity ${isDone ? "opacity-40" : ""}`}
                  >
                    <span className="font-mono text-xs font-bold text-accent-ink flex-none pt-0.5">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1">
                      {step.title && (
                        <div className={`text-sm font-semibold mb-0.5 ${isDone ? "line-through text-content-muted" : "text-content"}`}>
                          {step.title}
                        </div>
                      )}
                      <p className={`text-sm leading-[1.6] ${isDone ? "line-through text-content-muted" : "text-content-secondary"}`}>
                        {step.content}
                      </p>
                    </div>
                    <CheckCircle2 size={16} className={`flex-none mt-0.5 ${isDone ? "text-accent-ink" : "text-content-faint"}`} />
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      <Navbar />
    </div>
  );
}
