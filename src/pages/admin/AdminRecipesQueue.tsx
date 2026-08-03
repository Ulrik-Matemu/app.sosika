import { useState, useEffect } from "react";
import { collection, query, getDocs, doc, updateDoc, where, orderBy } from "firebase/firestore";
import { db } from "../../firebase";
import { Recipe, RecipeGenerationLog } from "../../types/recipe";
import {
  approveRecipe,
  rejectRecipe,
  STARTER_RECIPES,
  triggerAIRecipeGeneration,
  fetchRecipeGenerationLogs,
  fetchGeminiQuotaStatus,
  resetGeminiQuotaFlag,
} from "../../services/recipeService";
import AdminLogin from "../../components/my-components/AdminLogin";
import {
  CheckCircle,
  XCircle,
  ChefHat,
  Edit,
  Save,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  History,
  Layers,
  Image as ImageIcon,
  RotateCcw,
} from "lucide-react";

interface AdminRecipesQueueProps {
  embedded?: boolean; // True if rendered inside AdminDashboard tab
}

export default function AdminRecipesQueue({ embedded = false }: AdminRecipesQueueProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [activeFilter, setActiveFilter] = useState<"pending_review" | "published" | "rejected">("pending_review");
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [rejectionReasonInput, setRejectionReasonInput] = useState("");
  const [vendorInput, setVendorInput] = useState("");
  const [editingSlug, setEditingSlug] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // AI Generator Console & Log Inspector States
  const [aiLoading, setAiLoading] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<{ success: boolean; message: string; details?: any } | null>(null);
  const [logs, setLogs] = useState<RecipeGenerationLog[]>([]);
  const [quotaStatus, setQuotaStatus] = useState<{ isExhausted: boolean; exhaustedDate?: string }>({ isExhausted: false });
  const [showLogsInspector, setShowLogsInspector] = useState(false);

  useEffect(() => {
    fetchQueueRecipes();
    loadAiLogsAndStatus();
  }, [activeFilter]);

  const loadAiLogsAndStatus = async () => {
    const [fetchedLogs, status] = await Promise.all([
      fetchRecipeGenerationLogs(15),
      fetchGeminiQuotaStatus(),
    ]);
    setLogs(fetchedLogs);
    setQuotaStatus(status);
  };

  const fetchQueueRecipes = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "recipes"),
        where("status", "==", activeFilter),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      let list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Recipe[];

      if (list.length === 0 && activeFilter === "published") {
        list = [...STARTER_RECIPES];
      }

      setRecipes(list);
    } catch (err) {
      console.warn("Error fetching recipes for admin queue:", err);
      if (activeFilter === "published") {
        setRecipes([...STARTER_RECIPES]);
      } else {
        setRecipes([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleManualAIGeneration = async (resetQuota: boolean = false) => {
    setAiLoading(true);
    setAiFeedback(null);
    try {
      const res = await triggerAIRecipeGeneration(resetQuota);
      setAiFeedback(res);
      await loadAiLogsAndStatus();
      await fetchQueueRecipes();
    } catch (err: any) {
      console.error("Failed to run manual AI recipe generator:", err);
      setAiFeedback({
        success: false,
        message: err?.message || "Error calling Cloud Function.",
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleResetQuotaFlag = async () => {
    setActionLoading(true);
    try {
      await resetGeminiQuotaFlag();
      await loadAiLogsAndStatus();
    } catch (err) {
      console.error("Failed to reset quota flag:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async (recipe: Recipe) => {
    if (!recipe.id) return;
    setActionLoading(true);
    try {
      const overrides: Partial<Recipe> = {};
      if (editingSlug) {
        overrides.slug = editingSlug.trim();
      }
      if (vendorInput) {
        const ids = vendorInput.split(",").map((s) => s.trim()).filter(Boolean);
        overrides.linkedVendorIds = ids;
      }

      await approveRecipe(recipe.id, overrides);
      setSelectedRecipe(null);
      await fetchQueueRecipes();
    } catch (err) {
      console.error("Failed to approve recipe:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRecipe || !selectedRecipe.id) return;
    setActionLoading(true);
    try {
      await rejectRecipe(selectedRecipe.id, rejectionReasonInput.trim() || "Does not meet guidelines.");
      setRejectionModalOpen(false);
      setRejectionReasonInput("");
      setSelectedRecipe(null);
      await fetchQueueRecipes();
    } catch (err) {
      console.error("Failed to reject recipe:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveVendorLinks = async (recipeId: string) => {
    if (!recipeId) return;
    setActionLoading(true);
    try {
      const ids = vendorInput.split(",").map((s) => s.trim()).filter(Boolean);
      await updateDoc(doc(db, "recipes", recipeId), {
        linkedVendorIds: ids,
      });
      await fetchQueueRecipes();
      if (selectedRecipe) {
        setSelectedRecipe({ ...selectedRecipe, linkedVendorIds: ids });
      }
    } catch (err) {
      console.error("Error linking vendors:", err);
    } finally {
      setActionLoading(false);
    }
  };

  // If standalone route and not authenticated, render AdminLogin
  if (!embedded && !isAuthenticated) {
    return <AdminLogin onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="space-y-6 text-white font-sans">
      {/* Standalone Top Header */}
      {!embedded && (
        <div className="flex items-center justify-between bg-zinc-900/90 border border-white/[0.08] p-4 sm:p-6 rounded-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#00bfff]/10 border border-[#00bfff]/20 text-[#00bfff] flex items-center justify-center font-bold">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h1 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                Recipe Approval Queue & AI Console
                <span className="text-[10px] font-mono font-bold bg-[#00bfff]/20 text-[#00bfff] px-2 py-0.5 rounded-full border border-[#00bfff]/30 uppercase">
                  Admin
                </span>
              </h1>
              <p className="text-xs text-zinc-400">Manage user submissions, trigger AI recipe generation & inspect run logs</p>
            </div>
          </div>
        </div>
      )}

      {/* AI RECIPE GENERATOR CONTROL CONSOLE */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-[#0a0a0b] border border-white/[0.08] p-6 shadow-xl space-y-4">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

        <div className="flex items-center justify-between flex-wrap gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-purple-500/20 border border-purple-500/30 text-purple-300 flex items-center justify-center font-bold">
              <Sparkles size={22} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                Daily AI Recipe Generator
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold border capitalize ${
                  quotaStatus.isExhausted
                    ? "bg-red-500/20 text-red-400 border-red-500/30"
                    : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                }`}>
                  {quotaStatus.isExhausted ? "Quota Exhausted Today" : "Quota Active (Free Tier)"}
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Queries existing recipe counts, targets underrepresented cuisines, generates Pollinations/Fallback images, and creates drafts in queue.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLogsInspector(!showLogsInspector)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 font-bold text-xs border border-white/[0.08] transition-all"
            >
              <History size={14} />
              <span>{showLogsInspector ? "Hide Run Logs" : "Inspect Run Logs"} ({logs.length})</span>
            </button>

            {quotaStatus.isExhausted && (
              <button
                onClick={handleResetQuotaFlag}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs border border-amber-500/30 transition-all"
                title="Reset Quota Circuit Breaker"
              >
                <RotateCcw size={14} />
                <span>Reset Quota Flag</span>
              </button>
            )}

            <button
              onClick={() => handleManualAIGeneration(quotaStatus.isExhausted)}
              disabled={aiLoading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold text-xs shadow-lg shadow-purple-500/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw size={16} className={aiLoading ? "animate-spin" : ""} />
              <span>{aiLoading ? "Generating AI Recipes..." : "Run AI Generator Now"}</span>
            </button>
          </div>
        </div>

        {/* Live AI Execution Feedback Box */}
        {aiFeedback && (
          <div className={`p-4 rounded-2xl border text-xs space-y-2 relative z-10 ${
            aiFeedback.success
              ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-200"
              : "bg-red-950/40 border-red-500/30 text-red-200"
          }`}>
            <div className="flex items-center justify-between font-bold">
              <span className="flex items-center gap-1.5">
                {aiFeedback.success ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                {aiFeedback.message}
              </span>
              <button onClick={() => setAiFeedback(null)} className="text-zinc-400 hover:text-white">×</button>
            </div>

            {aiFeedback.details && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/[0.08] font-mono text-[11px]">
                <div>Attempted: <strong>{aiFeedback.details.attempted}</strong></div>
                <div>Accepted: <strong className="text-emerald-400">{aiFeedback.details.accepted}</strong></div>
                <div>Rejected: <strong className="text-red-400">{aiFeedback.details.rejected}</strong></div>
                <div>Dupes Skipped: <strong>{aiFeedback.details.duplicatesSkipped}</strong></div>
              </div>
            )}
          </div>
        )}

        {/* LIVE LOG INSPECTOR FEEDBOARD */}
        {showLogsInspector && (
          <div className="pt-4 border-t border-white/[0.08] space-y-3 relative z-10">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Layers size={14} className="text-[#00bfff]" />
              Execution Logs History (`recipeGenerationLogs`)
            </h3>

            {logs.length === 0 ? (
              <div className="p-4 text-center text-xs text-zinc-500 bg-black/40 rounded-2xl border border-white/[0.05]">
                No run logs recorded yet.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {logs.map((log) => {
                  const logDate = log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : "Just now";

                  return (
                    <div
                      key={log.id}
                      className="p-3.5 rounded-2xl bg-black/50 border border-white/[0.06] text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2 text-[11px] text-zinc-400">
                        <span className="font-mono text-zinc-300">{logDate}</span>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                            {log.acceptedCount} Accepted
                          </span>
                          {log.rejectedCount > 0 && (
                            <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-bold">
                              {log.rejectedCount} Rejected
                            </span>
                          )}
                          {log.duplicatesSkipped && log.duplicatesSkipped > 0 ? (
                            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                              {log.duplicatesSkipped} Dupes Skipped
                            </span>
                          ) : null}
                          {log.quotaExhausted && (
                            <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">
                              Quota Limited
                            </span>
                          )}
                        </div>
                      </div>

                      {log.recipesGenerated && log.recipesGenerated.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {log.recipesGenerated.map((item, i) => (
                            <span
                              key={i}
                              className="px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-[11px] flex items-center gap-1.5"
                            >
                              <ChefHat size={12} className="text-[#00bfff]" />
                              <span>{item.title}</span>
                              <span className="text-zinc-500">({item.country})</span>
                              {item.imageSource && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/60 text-[#00bfff] font-mono flex items-center gap-1">
                                  <ImageIcon size={10} />
                                  {item.imageSource}
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      )}

                      {log.apiErrors && log.apiErrors.length > 0 && (
                        <div className="p-2 rounded-xl bg-red-500/10 text-red-300 text-[11px] font-mono space-y-1">
                          {log.apiErrors.map((err, i) => (
                            <div key={i}>• {err}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      {/* QUEUE FILTER TABS */}
      <div className="flex items-center gap-2 bg-white/[0.03] p-1.5 rounded-2xl border border-white/[0.08] w-fit">
        <button
          onClick={() => setActiveFilter("pending_review")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeFilter === "pending_review"
              ? "bg-[#00bfff] text-black shadow-md shadow-[#00bfff]/20"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Pending Review ({recipes.filter((r) => r.status === "pending_review").length || (activeFilter === "pending_review" ? recipes.length : 0)})
        </button>
        <button
          onClick={() => setActiveFilter("published")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeFilter === "published"
              ? "bg-[#00bfff] text-black shadow-md shadow-[#00bfff]/20"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Published
        </button>
        <button
          onClick={() => setActiveFilter("rejected")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeFilter === "rejected"
              ? "bg-[#00bfff] text-black shadow-md shadow-[#00bfff]/20"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Rejected
        </button>
      </div>

      {/* Main Grid & Preview Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recipe List */}
        <div className="lg:col-span-1 space-y-4">
          {loading ? (
            <div className="p-8 text-center text-xs text-zinc-500">Loading queue...</div>
          ) : recipes.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-zinc-900/50 border border-white/[0.08] text-xs text-zinc-400">
              No recipes in status: <strong className="text-[#00bfff]">{activeFilter}</strong>
            </div>
          ) : (
            recipes.map((r) => {
              const isSelected = selectedRecipe?.id === r.id || selectedRecipe?.slug === r.slug;

              return (
                <div
                  key={r.id || r.slug}
                  onClick={() => {
                    setSelectedRecipe(r);
                    setEditingSlug(r.slug || "");
                    setVendorInput((r.linkedVendorIds || []).join(", "));
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                    isSelected
                      ? "bg-zinc-800/90 border-[#00bfff] shadow-lg shadow-[#00bfff]/10"
                      : "bg-zinc-900/60 border-white/[0.08] hover:border-white/[0.2]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-full bg-[#00bfff]/10 text-[#00bfff] text-[10px] font-bold border border-[#00bfff]/20">
                      {r.country} • {r.subcategory}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-md font-semibold capitalize ${
                        r.source === "ai_generated"
                          ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                          : r.source === "user_submission"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                      }`}
                    >
                      {r.source.replace("_", " ")}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-white line-clamp-1">{r.title}</h4>

                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span>{r.ingredients?.length || 0} ingr • {r.steps?.length || 0} steps</span>
                    {r.submittedByName ? <span>by {r.submittedByName}</span> : <span>AI Generated</span>}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Recipe Detail & Action Preview */}
        <div className="lg:col-span-2">
          {selectedRecipe ? (
            <div className="bg-zinc-900/90 border border-white/[0.08] p-6 sm:p-8 rounded-3xl space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-white/[0.08]">
                <div>
                  <span className="text-xs font-mono text-[#00bfff] uppercase tracking-wider">
                    {selectedRecipe.country} / {selectedRecipe.subcategory}
                  </span>
                  <h3 className="text-xl font-black text-white">{selectedRecipe.title}</h3>
                </div>

                {activeFilter === "pending_review" && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setRejectionModalOpen(true)}
                      disabled={actionLoading}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-xs border border-red-500/20 transition-all"
                    >
                      <XCircle size={16} />
                      <span>Reject</span>
                    </button>

                    <button
                      onClick={() => handleApprove(selectedRecipe)}
                      disabled={actionLoading}
                      className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#00bfff] hover:bg-[#0099cc] text-black font-bold text-xs shadow-lg shadow-[#00bfff]/20 transition-all"
                    >
                      <CheckCircle size={16} />
                      <span>Approve & Publish</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Image & Key Attributes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1 h-36 rounded-2xl overflow-hidden bg-zinc-800 border border-white/[0.1] relative">
                  <img
                    src={selectedRecipe.imageUrl}
                    alt={selectedRecipe.title}
                    className="w-full h-full object-cover"
                  />
                  {(selectedRecipe as any).imageSource && (
                    <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/80 backdrop-blur-md text-[#00bfff] text-[9px] font-mono border border-[#00bfff]/30">
                      {(selectedRecipe as any).imageSource}
                    </span>
                  )}
                </div>

                <div className="sm:col-span-2 space-y-2 text-xs text-zinc-300">
                  <p><strong>Source:</strong> {selectedRecipe.source}</p>
                  <p><strong>Submitter:</strong> {selectedRecipe.submittedByName || "AI Engine"} {selectedRecipe.submittedBySocial ? `(${selectedRecipe.submittedBySocial})` : ""}</p>
                  <p><strong>Timing:</strong> Prep {selectedRecipe.prepTimeMinutes}m | Cook {selectedRecipe.cookTimeMinutes}m | Serves {selectedRecipe.servings}</p>
                  <p><strong>Tags:</strong> {selectedRecipe.tags?.join(", ") || "None"}</p>
                </div>
              </div>

              {/* Editable Slug & Vendor Links */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Edit size={14} className="text-[#00bfff]" />
                  Admin Configuration
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">URL Slug</label>
                    <input
                      type="text"
                      value={editingSlug}
                      onChange={(e) => setEditingSlug(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white text-xs focus:outline-none focus:border-[#00bfff]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">
                      Linked Vendor IDs (comma separated)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={vendorInput}
                        onChange={(e) => setVendorInput(e.target.value)}
                        placeholder="vendor_id_1, vendor_id_2"
                        className="flex-1 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white text-xs focus:outline-none focus:border-[#00bfff]"
                      />
                      {activeFilter === "published" && (
                        <button
                          onClick={() => selectedRecipe.id && handleSaveVendorLinks(selectedRecipe.id)}
                          className="px-3 py-1.5 rounded-xl bg-[#00bfff] text-black font-bold text-xs"
                        >
                          <Save size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Ingredients & Steps Preview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-[#00bfff] uppercase">Ingredients ({selectedRecipe.ingredients?.length})</h4>
                  <ul className="space-y-1 text-xs text-zinc-300">
                    {selectedRecipe.ingredients?.map((ing, i) => (
                      <li key={i} className="flex justify-between border-b border-white/[0.04] py-1">
                        <span>{ing.name}</span>
                        <span className="text-zinc-400">{ing.amount}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-[#00bfff] uppercase">Cooking Steps ({selectedRecipe.steps?.length})</h4>
                  <ol className="space-y-2 text-xs text-zinc-300">
                    {selectedRecipe.steps?.map((st, i) => (
                      <li key={i} className="space-y-0.5">
                        <strong className="text-white">{i + 1}. {st.title}</strong>
                        <p className="text-zinc-400">{st.content}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-zinc-900/50 border border-white/[0.08] p-12 rounded-3xl text-center text-xs text-zinc-400 space-y-2">
              <ChefHat size={32} className="mx-auto text-zinc-600" />
              <p>Select a recipe from the list to preview details and take admin action.</p>
            </div>
          )}
        </div>
      </div>

      {/* Rejection Modal */}
      {rejectionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-white/[0.1] rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Reject Recipe</h3>
            <p className="text-xs text-zinc-400">
              Provide a reason for rejecting this recipe submission.
            </p>
            <textarea
              rows={3}
              value={rejectionReasonInput}
              onChange={(e) => setRejectionReasonInput(e.target.value)}
              placeholder="e.g. Incomplete ingredient measurements or duplicate entry."
              className="w-full p-3 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-[#00bfff]"
            />
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setRejectionModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/[0.05] text-xs font-bold text-zinc-300"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading}
                className="px-5 py-2 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
