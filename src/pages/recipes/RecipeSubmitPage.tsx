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
import Navbar from "../../components/my-components/navbar";

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
      <div className="min-h-screen bg-ground text-content flex flex-col items-center justify-center p-6 space-y-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full bg-surface-1 border border-edge-3 rounded-[18px] p-8 text-center space-y-6 shadow-2xl"
        >
          <div className="w-16 h-16 rounded-2xl bg-sosika-cyan/10 border border-sosika-cyan/30 text-accent-ink flex items-center justify-center mx-auto">
            <CheckCircle size={36} />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-content">Recipe Submitted!</h2>
            <p className="text-xs text-content-secondary leading-relaxed">
              Thank you for sharing your culinary creation with the Sosika community! Your submission for{" "}
              <strong className="text-accent-ink">{title}</strong> has been received and queued for admin review.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-surface-1 border border-edge-2 text-left text-xs text-content-tertiary space-y-2">
            <p className="font-semibold text-content-secondary">What happens next?</p>
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
              className="w-full py-3 rounded-xl bg-sosika-cyan text-black font-bold text-xs hover:bg-sosika-cyan transition-all"
            >
              Submit Another Recipe
            </button>
            <button
              onClick={() => navigate("/recipes")}
              className="w-full py-3 rounded-xl bg-surface-2 text-content font-bold text-xs hover:bg-surface-3 transition-all border border-edge-2"
            >
              Back to Recipe Library
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ground text-content font-sans antialiased pb-28">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-chrome backdrop-blur-xl border-b border-edge-2 px-4 sm:px-8 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/recipes")}
              className="p-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-content-secondary hover:text-content border border-edge-2 transition-all cursor-pointer"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2 text-xs text-content-tertiary">
                <Link to="/recipes" className="hover:text-accent-ink">Recipes</Link>
                <span>/</span>
                <span className="text-content font-semibold">Submit Recipe</span>
              </div>
              <h1 className="text-xl font-bold text-content">Share a Recipe</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 sm:px-8 pt-8 space-y-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Basic Details Section */}
          <section className="bg-surface-1 border border-edge-2 p-6 sm:p-8 rounded-[18px] space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b border-edge-2">
              <ChefHat className="text-accent-ink" size={22} />
              <h2 className="text-lg font-extrabold text-content">Basic Information</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-content-secondary mb-1.5 uppercase tracking-wide">
                  Recipe Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Zanzibari Coconut Fish Curry"
                  className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-edge-3 text-content placeholder-content-muted text-sm focus:outline-none focus:border-sosika-cyan"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-content-secondary mb-1.5 uppercase tracking-wide">
                    Country *
                  </label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="e.g. Tanzania"
                    list="country-suggestions"
                    className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-edge-3 text-content placeholder-content-muted text-sm focus:outline-none focus:border-sosika-cyan"
                    required
                  />
                  <datalist id="country-suggestions">
                    {POPULAR_COUNTRIES.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-content-secondary mb-1.5 uppercase tracking-wide">
                    Subcategory / Region *
                  </label>
                  <input
                    type="text"
                    value={subcategory}
                    onChange={(e) => setSubcategory(e.target.value)}
                    placeholder="e.g. Zanzibari, Coastal/Swahili, Chaga"
                    list="subcategory-suggestions"
                    className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-edge-3 text-content placeholder-content-muted text-sm focus:outline-none focus:border-sosika-cyan"
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
                  <label className="block text-[11px] font-bold text-content-tertiary mb-1">
                    Prep Time (mins)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={prepTimeMinutes}
                    onChange={(e) => setPrepTimeMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-surface-2 border border-edge-3 text-content text-sm text-center focus:outline-none focus:border-sosika-cyan"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-content-tertiary mb-1">
                    Cook Time (mins)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={cookTimeMinutes}
                    onChange={(e) => setCookTimeMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-surface-2 border border-edge-3 text-content text-sm text-center focus:outline-none focus:border-sosika-cyan"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-content-tertiary mb-1">
                    Servings
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={servings}
                    onChange={(e) => setServings(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-surface-2 border border-edge-3 text-content text-sm text-center focus:outline-none focus:border-sosika-cyan"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-content-tertiary mb-1">
                    Difficulty
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as RecipeDifficulty)}
                    className="w-full px-3 py-2.5 rounded-xl bg-content-faint border border-edge-3 text-content text-sm focus:outline-none focus:border-sosika-cyan"
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
          <section className="bg-surface-1 border border-edge-2 p-6 sm:p-8 rounded-[18px] space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-edge-2">
              <Upload className="text-accent-ink" size={22} />
              <h2 className="text-lg font-extrabold text-content">Recipe Image</h2>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative w-full sm:w-48 h-36 rounded-2xl bg-surface-1 border border-dashed border-edge-3 overflow-hidden flex flex-col items-center justify-center text-center p-4">
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="space-y-1 text-content-muted">
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
                  className="block w-full text-xs text-content-tertiary file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-sosika-cyan/10 file:text-accent-ink hover:file:bg-sosika-cyan/20"
                />
                <p className="text-[11px] text-content-muted">
                  Upload a clear, appetizing photo of your prepared dish. High resolution recommended.
                </p>
              </div>
            </div>
          </section>

          {/* Ingredients Section */}
          <section className="bg-surface-1 border border-edge-2 p-6 sm:p-8 rounded-[18px] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-edge-2">
              <h2 className="text-lg font-extrabold text-content flex items-center gap-2">
                <BookOpen className="text-accent-ink" size={20} />
                Ingredients *
              </h2>
              <button
                type="button"
                onClick={addIngredientRow}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-sosika-cyan/10 text-accent-ink border border-sosika-cyan/20 text-xs font-bold hover:bg-sosika-cyan/20 transition-all"
              >
                <Plus size={14} /> Add Row
              </button>
            </div>

            <div className="space-y-3">
              {ingredients.map((ing, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className="text-xs text-content-muted font-mono w-6 text-center">{idx + 1}.</span>
                  <input
                    type="text"
                    value={ing.name}
                    onChange={(e) => updateIngredient(idx, "name", e.target.value)}
                    placeholder="Ingredient name (e.g. Basmati Rice)"
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-surface-2 border border-edge-3 text-content text-xs placeholder-content-muted focus:outline-none focus:border-sosika-cyan"
                  />
                  <input
                    type="text"
                    value={ing.amount}
                    onChange={(e) => updateIngredient(idx, "amount", e.target.value)}
                    placeholder="Amount (e.g. 2 cups)"
                    className="w-32 sm:w-44 px-3.5 py-2.5 rounded-xl bg-surface-2 border border-edge-3 text-content text-xs placeholder-content-muted focus:outline-none focus:border-sosika-cyan"
                  />
                  <button
                    type="button"
                    onClick={() => removeIngredientRow(idx)}
                    className="p-2 text-content-muted hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Cooking Steps Section */}
          <section className="bg-surface-1 border border-edge-2 p-6 sm:p-8 rounded-[18px] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-edge-2">
              <h2 className="text-lg font-extrabold text-content flex items-center gap-2">
                <Sparkles className="text-accent-ink" size={20} />
                Step-by-Step Cooking Instructions *
              </h2>
              <button
                type="button"
                onClick={addStepRow}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-sosika-cyan/10 text-accent-ink border border-sosika-cyan/20 text-xs font-bold hover:bg-sosika-cyan/20 transition-all"
              >
                <Plus size={14} /> Add Step
              </button>
            </div>

            <div className="space-y-4">
              {steps.map((st, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-surface-1 border border-edge-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-accent-ink">Step {idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeStepRow(idx)}
                      className="text-content-muted hover:text-red-400 text-xs flex items-center gap-1"
                    >
                      <Trash2 size={14} /> Remove
                    </button>
                  </div>

                  <input
                    type="text"
                    value={st.title}
                    onChange={(e) => updateStep(idx, "title", e.target.value)}
                    placeholder="Step Title (e.g. Marinate Chicken)"
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-2 border border-edge-3 text-content text-xs placeholder-content-muted focus:outline-none focus:border-sosika-cyan"
                  />

                  <textarea
                    rows={3}
                    value={st.content}
                    onChange={(e) => updateStep(idx, "content", e.target.value)}
                    placeholder="Describe step instructions in detail..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-edge-3 text-content text-xs placeholder-content-muted focus:outline-none focus:border-sosika-cyan"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Submitter Info & Tags */}
          <section className="bg-surface-1 border border-edge-2 p-6 sm:p-8 rounded-[18px] space-y-4">
            <h2 className="text-lg font-extrabold text-content">Credits & Tags (Optional)</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-content-secondary mb-1">
                  Your Name / Chef Credit
                </label>
                <input
                  type="text"
                  value={submittedByName}
                  onChange={(e) => setSubmittedByName(e.target.value)}
                  placeholder="e.g. Chef Ali"
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-2 border border-edge-3 text-content text-xs placeholder-content-muted focus:outline-none focus:border-sosika-cyan"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-content-secondary mb-1">
                  Social Link or Handle
                </label>
                <input
                  type="text"
                  value={submittedBySocial}
                  onChange={(e) => setSubmittedBySocial(e.target.value)}
                  placeholder="e.g. @chefalizanzibar"
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-2 border border-edge-3 text-content text-xs placeholder-content-muted focus:outline-none focus:border-sosika-cyan"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-content-secondary mb-1">
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
                  className="flex-1 px-4 py-2 rounded-xl bg-surface-2 border border-edge-3 text-content text-xs placeholder-content-muted focus:outline-none focus:border-sosika-cyan"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-4 py-2 rounded-xl bg-surface-3 text-content font-bold text-xs hover:bg-surface-3"
                >
                  Add
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-2">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-sosika-cyan/10 border border-sosika-cyan/20 text-accent-ink"
                  >
                    #{t}
                    <button type="button" onClick={() => removeTag(t)} className="hover:text-content">
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
              className="px-6 py-3 rounded-xl bg-surface-2 hover:bg-surface-3 text-content-secondary font-bold text-xs border border-edge-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-8 py-3 rounded-xl bg-sosika-cyan hover:bg-sosika-cyan text-black font-bold text-xs sm:text-sm shadow-lg shadow-sosika-cyan/20 transition-all cursor-pointer disabled:opacity-50"
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

      <Navbar />
    </div>
  );
}
