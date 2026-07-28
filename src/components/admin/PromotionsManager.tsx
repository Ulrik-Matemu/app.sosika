import React, { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase";
import { Promotion } from "../../pages/mood/types/types";
import { Plus, Trash2, Edit2, Megaphone, Loader2, Check, ExternalLink, Eye, EyeOff } from "lucide-react";
import { usePlatformConfig } from "../../hooks/usePlatformConfig";

export const PromotionsManager: React.FC = () => {
  const { promotionsCarouselVisible } = usePlatformConfig();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [togglingMaster, setTogglingMaster] = useState<boolean>(false);

  const toggleMasterVisibility = async () => {
    setTogglingMaster(true);
    try {
      await setDoc(
        doc(db, "system_settings", "global"),
        { promotionsCarouselVisible: !promotionsCarouselVisible },
        { merge: true }
      );
    } catch (err) {
      console.error("Failed to toggle promotions master visibility:", err);
    } finally {
      setTogglingMaster(false);
    }
  };

  // Form State
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [sortOrder, setSortOrder] = useState(1);
  const [isActive, setIsActive] = useState(true);

  const loadPromotions = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "promotions"));
      const list: Promotion[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Promotion);
      });
      list.sort((a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99));
      setPromotions(list);
    } catch (err) {
      console.error("Failed to load promotions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPromotions();
  }, []);

  const resetForm = () => {
    setTitle("");
    setSubtitle("");
    setImageUrl("");
    setLinkUrl("");
    setSortOrder(1);
    setIsActive(true);
    setEditingPromo(null);
    setIsCreating(false);
  };

  const handleEditClick = (promo: Promotion) => {
    setEditingPromo(promo);
    setTitle(promo.title || "");
    setSubtitle(promo.subtitle || "");
    setImageUrl(promo.image_url || "");
    setLinkUrl(promo.link_url || "");
    setSortOrder(promo.sort_order ?? 1);
    setIsActive(promo.is_active !== false);
    setIsCreating(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSaving(true);
    try {
      const payload: Record<string, any> = {
        title: title.trim(),
        image_url: imageUrl.trim(),
        sort_order: Number(sortOrder) || 1,
        is_active: isActive,
      };

      if (subtitle.trim()) {
        payload.subtitle = subtitle.trim();
      }
      if (linkUrl.trim()) {
        payload.link_url = linkUrl.trim();
      }

      if (editingPromo) {
        await updateDoc(doc(db, "promotions", editingPromo.id), payload);
      } else {
        await addDoc(collection(db, "promotions"), {
          ...payload,
          created_at: serverTimestamp(),
        });
      }

      await loadPromotions();
      resetForm();
    } catch (err) {
      console.error("Failed to save promotion:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleActive = async (promo: Promotion) => {
    try {
      await updateDoc(doc(db, "promotions", promo.id), {
        is_active: !promo.is_active,
      });
      setPromotions((prev) =>
        prev.map((p) => (p.id === promo.id ? { ...p, is_active: !p.is_active } : p))
      );
    } catch (err) {
      console.error("Failed to toggle promotion status:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this promo banner?")) return;
    try {
      await deleteDoc(doc(db, "promotions", id));
      setPromotions((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error("Failed to delete promotion:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Master Visibility Switch Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900/80 border border-white/10 rounded-2xl p-5">
        <div>
          <div className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-[#00bfff]" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Promotions Carousel Widget
            </h3>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Controls the visibility of the Promotional Banners carousel on the user-facing Results Page.
          </p>
        </div>

        <button
          onClick={toggleMasterVisibility}
          disabled={togglingMaster}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
            promotionsCarouselVisible
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-md shadow-emerald-500/10"
              : "bg-red-500/10 text-red-400 border border-red-500/20"
          }`}
        >
          {togglingMaster ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : promotionsCarouselVisible ? (
            <>
              <Eye className="w-4 h-4" /> Carousel Visible (ON)
            </>
          ) : (
            <>
              <EyeOff className="w-4 h-4" /> Carousel Hidden (OFF)
            </>
          )}
        </button>
      </div>

      {/* Header & Create Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900/60 border border-white/10 rounded-2xl p-5">
        <div>
          <div className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-[#00bfff]" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Promotional Banners & Events ({promotions.length})
            </h3>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Manage advertising banners, offers, and custom links shown in the Results Page carousel.
          </p>
        </div>

        {!isCreating && (
          <button
            onClick={() => {
              resetForm();
              setIsCreating(true);
            }}
            className="flex items-center gap-2 bg-[#00bfff] text-black font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-[#33ccff] transition-all shadow-md shadow-[#00bfff]/20"
          >
            <Plus className="w-4 h-4" />
            Add New Banner
          </button>
        )}
      </div>

      {/* Create / Edit Form Drawer */}
      {isCreating && (
        <form
          onSubmit={handleSave}
          className="bg-zinc-900 border border-[#00bfff]/30 rounded-2xl p-5 space-y-4 animate-in fade-in duration-300"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-[#00bfff]" />
              {editingPromo ? "Edit Banner" : "New Promotional Banner"}
            </h4>
            <button
              type="button"
              onClick={resetForm}
              className="text-xs text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">
                Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 50% Off Weekend Brunch!"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-[#00bfff]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">
                Subtitle (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Valid until Sunday on selected vendors"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-[#00bfff]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">
                Cover Image URL
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-[#00bfff]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">
                Click Action / Link URL (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. /vendor/abc/menu or https://..."
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-[#00bfff]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">
                Sort Order (Rank)
              </label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(parseInt(e.target.value) || 1)}
                className="w-full bg-black/50 border border-white/10 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-[#00bfff]"
              />
            </div>

            <div className="flex items-center gap-3 pt-4">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-zinc-300">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#00bfff]"
                />
                Active (Visible to users)
              </label>
            </div>
          </div>

          {/* Image Preview */}
          {imageUrl && (
            <div className="relative h-24 rounded-xl overflow-hidden border border-white/10 bg-black/40">
              <img src={imageUrl} alt="Preview" className="w-full h-full object-cover opacity-60" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-3 flex flex-col justify-end">
                <p className="text-xs font-bold text-white">{title || "Banner Title"}</p>
                {subtitle && <p className="text-[10px] text-zinc-400">{subtitle}</p>}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 bg-[#00bfff] text-black font-bold text-xs px-5 py-2.5 rounded-xl hover:bg-[#33ccff] transition-all disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" /> Save Banner
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Promotions List */}
      {loading ? (
        <div className="py-12 flex justify-center items-center text-zinc-500 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-xs">Loading banners...</span>
        </div>
      ) : promotions.length === 0 ? (
        <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-8 text-center text-zinc-500 text-xs">
          No promotional banners configured yet. Click "Add New Banner" to create one.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {promotions.map((promo) => (
            <div
              key={promo.id}
              className={`relative overflow-hidden rounded-2xl border p-4 flex flex-col justify-between gap-3 transition-all ${
                promo.is_active
                  ? "bg-zinc-900/80 border-white/10 hover:border-white/20"
                  : "bg-zinc-900/30 border-white/5 opacity-50"
              }`}
            >
              {promo.image_url && (
                <div className="relative h-24 rounded-xl overflow-hidden mb-1">
                  <img
                    src={promo.image_url}
                    alt={promo.title}
                    className="w-full h-full object-cover opacity-60"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-white truncate">{promo.title}</h4>
                  <span className="text-[10px] font-bold text-zinc-500 bg-white/5 px-2 py-0.5 rounded">
                    Rank #{promo.sort_order ?? 1}
                  </span>
                </div>
                {promo.subtitle && (
                  <p className="text-[10px] text-zinc-400 mt-0.5 truncate">{promo.subtitle}</p>
                )}
                {promo.link_url && (
                  <p className="text-[10px] text-[#00bfff] mt-1 flex items-center gap-1 truncate">
                    <ExternalLink className="w-3 h-3" /> {promo.link_url}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <button
                  onClick={() => toggleActive(promo)}
                  className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border transition-all ${
                    promo.is_active
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-zinc-800 text-zinc-500 border-zinc-700"
                  }`}
                >
                  {promo.is_active ? "● Active" : "○ Inactive"}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditClick(promo)}
                    className="p-1.5 rounded-lg bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                    title="Edit"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(promo.id)}
                    className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
