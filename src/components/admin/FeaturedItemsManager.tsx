import React, { useState, useEffect } from "react";
import { collection, getDocs, updateDoc, setDoc, doc } from "firebase/firestore";
import { db } from "../../firebase";
import { MenuItem } from "../../pages/mood/types/types";
import { Search, Flame, Loader2, Eye, EyeOff } from "lucide-react";
import { usePlatformConfig } from "../../hooks/usePlatformConfig";

export const FeaturedItemsManager: React.FC = () => {
  const { featuredCarouselVisible } = usePlatformConfig();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [vendorsMap, setVendorsMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [togglingMaster, setTogglingMaster] = useState<boolean>(false);

  const toggleMasterVisibility = async () => {
    setTogglingMaster(true);
    try {
      await setDoc(
        doc(db, "system_settings", "global"),
        { featuredCarouselVisible: !featuredCarouselVisible },
        { merge: true }
      );
    } catch (err) {
      console.error("Failed to toggle master visibility:", err);
    } finally {
      setTogglingMaster(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch vendors lookup
      const vendorSnap = await getDocs(collection(db, "vendors"));
      const vMap: Record<string, string> = {};
      vendorSnap.forEach((d) => {
        vMap[d.id] = d.data().name || "Unknown Vendor";
      });
      setVendorsMap(vMap);

      // Fetch all menu items
      const itemSnap = await getDocs(collection(db, "menuItems"));
      const list: MenuItem[] = [];
      itemSnap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as MenuItem);
      });
      setItems(list);
    } catch (err) {
      console.error("Failed to load items/vendors for featured manager:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleFeatured = async (item: MenuItem) => {
    setUpdatingId(item.id);
    const newFeatured = !item.is_featured;
    try {
      await updateDoc(doc(db, "menuItems", item.id), {
        is_featured: newFeatured,
        featured_rank: newFeatured ? (item.featured_rank ?? 99) : null,
      });
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? { ...i, is_featured: newFeatured, featured_rank: newFeatured ? (i.featured_rank ?? 99) : undefined }
            : i
        )
      );
    } catch (err) {
      console.error("Failed to update featured status:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  const updateRank = async (item: MenuItem, rank: number) => {
    setUpdatingId(item.id);
    try {
      await updateDoc(doc(db, "menuItems", item.id), {
        featured_rank: rank,
      });
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, featured_rank: rank } : i))
      );
    } catch (err) {
      console.error("Failed to update rank:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  const featuredItems = items
    .filter((i) => i.is_featured)
    .sort((a, b) => (a.featured_rank ?? 99) - (b.featured_rank ?? 99));

  const filteredItems = items.filter(
    (i) =>
      i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (vendorsMap[i.vendor_id] || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Master Visibility Switch Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900/80 border border-white/10 rounded-2xl p-5">
        <div>
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Featured Items Carousel Widget
            </h3>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Controls the visibility of the Featured Menu Items carousel on the user-facing Results Page.
          </p>
        </div>

        <button
          onClick={toggleMasterVisibility}
          disabled={togglingMaster}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
            featuredCarouselVisible
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-md shadow-emerald-500/10"
              : "bg-red-500/10 text-red-400 border border-red-500/20"
          }`}
        >
          {togglingMaster ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : featuredCarouselVisible ? (
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

      {/* Currently Featured Summary Card */}
      <div className="bg-gradient-to-r from-amber-500/10 via-zinc-900 to-zinc-900 border border-amber-500/20 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Flame className="w-5 h-5 text-amber-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Active Featured Items ({featuredItems.length})
          </h3>
        </div>

        {featuredItems.length === 0 ? (
          <p className="text-xs text-zinc-500 italic">
            No items currently featured. Enable items below to show them on the Results Page carousel.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {featuredItems.map((item, idx) => (
              <div
                key={item.id}
                className="bg-black/40 border border-amber-500/30 rounded-xl p-3 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-500 text-xs font-bold">
                      #{idx + 1}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{item.name}</p>
                    <p className="text-[10px] text-zinc-400 truncate">
                      {vendorsMap[item.vendor_id] || "Vendor"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg border border-white/10">
                    <span className="text-[10px] text-zinc-400">Rank:</span>
                    <input
                      type="number"
                      value={item.featured_rank ?? idx + 1}
                      onChange={(e) => updateRank(item, parseInt(e.target.value) || 1)}
                      className="w-8 bg-transparent text-xs font-bold text-amber-400 outline-none text-center"
                    />
                  </div>
                  <button
                    onClick={() => toggleFeatured(item)}
                    className="text-zinc-500 hover:text-red-400 text-xs p-1"
                    title="Remove from featured"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All Menu Items Search & List */}
      <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-white">All Vendor Menu Items</h3>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search items or vendors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#00bfff]/50"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center items-center text-zinc-500 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-xs">Loading items...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-zinc-400 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3">Item</th>
                  <th className="py-3 px-3">Vendor</th>
                  <th className="py-3 px-3">Price</th>
                  <th className="py-3 px-3 text-center">Featured?</th>
                  <th className="py-3 px-3 text-center">Rank</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredItems.map((item) => {
                  const isBusy = updatingId === item.id;
                  return (
                    <tr key={item.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-8 h-8 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-zinc-800" />
                          )}
                          <div>
                            <p className="font-semibold text-white">{item.name}</p>
                            <p className="text-[10px] text-zinc-500 capitalize">{item.category}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-zinc-300">
                        {vendorsMap[item.vendor_id] || "Unknown"}
                      </td>
                      <td className="py-3 px-3 text-[#00bfff] font-bold">
                        {Number(item.price).toLocaleString()} TZS
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => toggleFeatured(item)}
                          disabled={isBusy}
                          className={`px-3 py-1.5 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all ${
                            item.is_featured
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                              : "bg-white/5 text-zinc-500 border border-white/10 hover:text-white"
                          }`}
                        >
                          {isBusy ? "Saving..." : item.is_featured ? "★ Featured" : "☆ Set Featured"}
                        </button>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {item.is_featured ? (
                          <input
                            type="number"
                            value={item.featured_rank ?? 99}
                            onChange={(e) => updateRank(item, parseInt(e.target.value) || 1)}
                            className="w-12 bg-black/40 border border-white/10 rounded-lg py-1 text-center font-bold text-amber-400 outline-none"
                          />
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
