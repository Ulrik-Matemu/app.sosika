import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Upload,
  CheckCircle,
  ChefHat,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { submitRecipe, getCountrySubcategoryMap } from "../../services/recipeService";
import { RecipeDifficulty } from "../../types/recipe";

const POPULAR_COUNTRIES = ["Tanzania", "Kenya", "Uganda", "Rwanda", "Zanzibar"];

export default function RecipeSubmitPage() {
  const navigate = useNavigate();

  // Form states
  const [title, setTitle] = useState("");
  const [country, setCountry] = useState("Tanzania");
  const [subcategory, setSubcategory] = useState("");
  const [prepTimeMinutes, setPrepTimeMinutes] = useState(15);
  const [cookTimeMinutes, setCookTimeMinutes] = useState(30);
  const [servings, setServings] = useState(4);
  const [difficulty, setDifficulty] = useState<RecipeDifficulty>("medium");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(["home-cooked", "traditional"]);
  const [submittedByName, setSubmittedByName] = useState("");
  const [submittedBySocial, setSubmittedBySocial] = useState("");

  // Dynamic arrays
  const [ingredients, setIngredients] = useState<{ name: string; amount: string }[]>([
    { name: "", amount: "" },
    { name: "", amount: "" },
  ]);
  const [steps, setSteps] = useState<{ title: string; content: string }[]>([
    { title: "Preparation", content: "" },
    { title: "Cooking", content: "" },
  ]);

  // Image Upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // UI state
  const [existingSubcategories, setExistingSubcategories] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSubcats() {
      const map = await getCountrySubcategoryMap();
      if (map[country]) {
        setExistingSubcategories(Object.keys(map[country].subcategories));
      } else {
        setExistingSubcategories(["Zanzibari", "Coastal/Swahili", "Chaga", "Street Food"]);
      }
    }
    loadSubcats();
  }, [country]);

  // Image Handler
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Ingredient Helpers
  const addIngredientRow = () => {
    setIngredients([...ingredients, { name: "", amount: "" }]);
  };

  const removeIngredientRow = (index: number) => {
    if (ingredients.length <= 1) return;
    setIngredients(ingredients.filter((_, idx) => idx !== index));
  };

  const updateIngredient = (index: number, field: "name" | "amount", value: string) => {
    const updated = [...ingredients];
    updated[index][field] = value;
    setIngredients(updated);
  };

  // Step Helpers
  const addStepRow = () => {
    setSteps([...steps, { title: `Step ${steps.length + 1}`, content: "" }]);
  };

  const removeStepRow = (index: number) => {
    if (steps.length <= 1) return;
    setSteps(steps.filter((_, idx) => idx !== index));
  };

  const updateStep = (index: number, field: "title" | "content", value: string) => {
    const updated = [...steps];
    updated[index][field] = value;
    setSteps(updated);
  };

  // Tag Helpers
  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim().toLowerCase())) {
      setTags([...tags, tagInput.trim().toLowerCase()]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic validation
    if (!title.trim()) {
      setError("Please enter a recipe title.");
      return;
    }
    if (!country.trim()) {
      setError("Please enter or select a country.");
      return;
    }
    if (!subcategory.trim()) {
      setError("Please select or enter a subcategory / cuisine style.");
      return;
    }

    const validIngredients = ingredients.filter((ing) => ing.name.trim() !== "");
    if (validIngredients.length === 0) {
      setError("Please provide at least one ingredient.");
      return;
    }

    const validSteps = steps.filter((st) => st.content.trim() !== "");
    if (validSteps.length === 0) {
      setError("Please provide at least one cooking step instruction.");
      return;
    }

    setIsSubmitting(true);

    try {
      await submitRecipe({
        title: title.trim(),
        country: country.trim(),
        subcategory: subcategory.trim(),
        tags,
        ingredients: validIngredients,
        steps: validSteps,
        prepTimeMinutes: Number(prepTimeMinutes),
        cookTimeMinutes: Number(cookTimeMinutes),
        servings: Number(servings),
        difficulty,
        imageFile,
        submittedByName: submittedByName.trim() || undefined,
        submittedBySocial: submittedBySocial.trim() || undefined,
      });

      setIsSubmitting(false);
      setIsSubmitted(true);
    } catch (err: any) {
      console.error("Recipe submission error:", err);
      setError(err?.message || "Failed to submit recipe. Please try again.");
      setIsSubmitting(false);
    }
  };

  // Confirmation View
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] text-white flex flex-col items-center justify-center p-6 space-y-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full bg-zinc-900 border border-white/[0.1] rounded-3xl p-8 text-center space-y-6 shadow-2xl"
        >
          <div className="w-16 h-16 rounded-2xl bg-[#00bfff]/10 border border-[#00bfff]/30 text-[#00bfff] flex items-center justify-center mx-auto">
            <CheckCircle size={36} />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white">Recipe Submitted!</h2>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Thank you for sharing your culinary creation with the Sosika community! Your submission for{" "}
              <strong className="text-[#00bfff]">{title}</strong> has been received and queued for admin review.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-left text-xs text-zinc-400 space-y-2">
            <p className="font-semibold text-zinc-200">What happens next?</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Our moderators review recipe ingredients & steps for clarity.</li>
              <li>Once approved, your recipe will appear on the public library!</li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                setIsSubmitted(false);
                setTitle("");
                setIngredients([{ name: "", amount: "" }]);
                setSteps([{ title: "", content: "" }]);
                setImageFile(null);
                setImagePreview(null);
              }}
              className="w-full py-3 rounded-xl bg-[#00bfff] text-black font-bold text-xs hover:bg-[#0099cc] transition-all"
            >
              Submit Another Recipe
            </button>
            <button
              onClick={() => navigate("/recipes")}
              className="w-full py-3 rounded-xl bg-white/[0.05] text-white font-bold text-xs hover:bg-white/[0.1] transition-all border border-white/[0.08]"
            >
              Back to Recipe Library
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white font-sans antialiased pb-24">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-[#0a0a0b]/90 backdrop-blur-xl border-b border-white/[0.08] px-4 sm:px-8 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
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
                <span className="text-white font-semibold">Submit Recipe</span>
              </div>
              <h1 className="text-xl font-black text-white">Share a Recipe</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-8 pt-8 space-y-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Basic Details Section */}
          <section className="bg-zinc-900/80 border border-white/[0.08] p-6 sm:p-8 rounded-3xl space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b border-white/[0.08]">
              <ChefHat className="text-[#00bfff]" size={22} />
              <h2 className="text-lg font-extrabold text-white">Basic Information</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5 uppercase tracking-wide">
                  Recipe Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Zanzibari Coconut Fish Curry"
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-[#00bfff]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5 uppercase tracking-wide">
                    Country *
                  </label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="e.g. Tanzania"
                    list="country-suggestions"
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-[#00bfff]"
                    required
                  />
                  <datalist id="country-suggestions">
                    {POPULAR_COUNTRIES.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5 uppercase tracking-wide">
                    Subcategory / Region *
                  </label>
                  <input
                    type="text"
                    value={subcategory}
                    onChange={(e) => setSubcategory(e.target.value)}
                    placeholder="e.g. Zanzibari, Coastal/Swahili, Chaga"
                    list="subcategory-suggestions"
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-[#00bfff]"
                    required
                  />
                  <datalist id="subcategory-suggestions">
                    {existingSubcategories.map((sub) => (
                      <option key={sub} value={sub} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Prep, Cook, Servings, Difficulty */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                    Prep Time (mins)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={prepTimeMinutes}
                    onChange={(e) => setPrepTimeMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white text-sm text-center focus:outline-none focus:border-[#00bfff]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                    Cook Time (mins)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={cookTimeMinutes}
                    onChange={(e) => setCookTimeMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white text-sm text-center focus:outline-none focus:border-[#00bfff]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                    Servings
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={servings}
                    onChange={(e) => setServings(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white text-sm text-center focus:outline-none focus:border-[#00bfff]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                    Difficulty
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as RecipeDifficulty)}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-800 border border-white/[0.1] text-white text-sm focus:outline-none focus:border-[#00bfff]"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* Image Upload Section */}
          <section className="bg-zinc-900/80 border border-white/[0.08] p-6 sm:p-8 rounded-3xl space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-white/[0.08]">
              <Upload className="text-[#00bfff]" size={22} />
              <h2 className="text-lg font-extrabold text-white">Recipe Image</h2>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative w-full sm:w-48 h-36 rounded-2xl bg-white/[0.03] border border-dashed border-white/[0.15] overflow-hidden flex flex-col items-center justify-center text-center p-4">
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="space-y-1 text-zinc-500">
                    <Upload size={24} className="mx-auto" />
                    <p className="text-[11px]">Upload Photo</p>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="block w-full text-xs text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#00bfff]/10 file:text-[#00bfff] hover:file:bg-[#00bfff]/20"
                />
                <p className="text-[11px] text-zinc-500">
                  Upload a clear, appetizing photo of your prepared dish. High resolution recommended.
                </p>
              </div>
            </div>
          </section>

          {/* Ingredients Section */}
          <section className="bg-zinc-900/80 border border-white/[0.08] p-6 sm:p-8 rounded-3xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                <BookOpen className="text-[#00bfff]" size={20} />
                Ingredients *
              </h2>
              <button
                type="button"
                onClick={addIngredientRow}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#00bfff]/10 text-[#00bfff] border border-[#00bfff]/20 text-xs font-bold hover:bg-[#00bfff]/20 transition-all"
              >
                <Plus size={14} /> Add Row
              </button>
            </div>

            <div className="space-y-3">
              {ingredients.map((ing, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className="text-xs text-zinc-500 font-mono w-6 text-center">{idx + 1}.</span>
                  <input
                    type="text"
                    value={ing.name}
                    onChange={(e) => updateIngredient(idx, "name", e.target.value)}
                    placeholder="Ingredient name (e.g. Basmati Rice)"
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-[#00bfff]"
                  />
                  <input
                    type="text"
                    value={ing.amount}
                    onChange={(e) => updateIngredient(idx, "amount", e.target.value)}
                    placeholder="Amount (e.g. 2 cups)"
                    className="w-32 sm:w-44 px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-[#00bfff]"
                  />
                  <button
                    type="button"
                    onClick={() => removeIngredientRow(idx)}
                    className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Cooking Steps Section */}
          <section className="bg-zinc-900/80 border border-white/[0.08] p-6 sm:p-8 rounded-3xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                <Sparkles className="text-[#00bfff]" size={20} />
                Step-by-Step Cooking Instructions *
              </h2>
              <button
                type="button"
                onClick={addStepRow}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#00bfff]/10 text-[#00bfff] border border-[#00bfff]/20 text-xs font-bold hover:bg-[#00bfff]/20 transition-all"
              >
                <Plus size={14} /> Add Step
              </button>
            </div>

            <div className="space-y-4">
              {steps.map((st, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#00bfff]">Step {idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeStepRow(idx)}
                      className="text-zinc-500 hover:text-red-400 text-xs flex items-center gap-1"
                    >
                      <Trash2 size={14} /> Remove
                    </button>
                  </div>

                  <input
                    type="text"
                    value={st.title}
                    onChange={(e) => updateStep(idx, "title", e.target.value)}
                    placeholder="Step Title (e.g. Marinate Chicken)"
                    className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-[#00bfff]"
                  />

                  <textarea
                    rows={3}
                    value={st.content}
                    onChange={(e) => updateStep(idx, "content", e.target.value)}
                    placeholder="Describe step instructions in detail..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-[#00bfff]"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Submitter Info & Tags */}
          <section className="bg-zinc-900/80 border border-white/[0.08] p-6 sm:p-8 rounded-3xl space-y-4">
            <h2 className="text-lg font-extrabold text-white">Credits & Tags (Optional)</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Your Name / Chef Credit
                </label>
                <input
                  type="text"
                  value={submittedByName}
                  onChange={(e) => setSubmittedByName(e.target.value)}
                  placeholder="e.g. Chef Ali"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-[#00bfff]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Social Link or Handle
                </label>
                <input
                  type="text"
                  value={submittedBySocial}
                  onChange={(e) => setSubmittedBySocial(e.target.value)}
                  placeholder="e.g. @chefalizanzibar"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-[#00bfff]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Tags (Press Enter to add)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="Add tag (e.g. vegetarian, spicy, dinner)..."
                  className="flex-1 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-[#00bfff]"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-4 py-2 rounded-xl bg-white/[0.08] text-white font-bold text-xs hover:bg-white/[0.15]"
                >
                  Add
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-2">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-[#00bfff]/10 border border-[#00bfff]/20 text-[#00bfff]"
                  >
                    #{t}
                    <button type="button" onClick={() => removeTag(t)} className="hover:text-white">
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* Submit Action */}
          <div className="flex items-center justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate("/recipes")}
              className="px-6 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 font-bold text-xs border border-white/[0.08]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-8 py-3 rounded-xl bg-[#00bfff] hover:bg-[#0099cc] text-black font-bold text-xs sm:text-sm shadow-lg shadow-[#00bfff]/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Plus size={16} />
                  <span>Submit for Review</span>
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
