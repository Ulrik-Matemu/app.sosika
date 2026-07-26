import React, { useState, useEffect, useMemo } from "react";
import { db } from "../../firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  writeBatch,
  arrayUnion
} from "firebase/firestore";
import { Vendor, MenuItem } from "../../pages/mood/types/types";
import {
  UtensilsCrossed,
  Search,
  Edit2,
  Check,
  X,
  History,
  TrendingUp,
  CheckSquare,
  Square,
  AlertTriangle,
  RefreshCw,
  Eye,
  Store
} from "lucide-react";

export interface MenuItemWithHistory extends MenuItem {
  price_history?: Array<{
    old_price: number;
    new_price: number;
    changed_at: any;
    change_type: string;
  }>;
}

export default function MenuItemManager() {
  // Master Data
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemWithHistory[]>([]);
  const [loading, setLoading] = useState(true);

  // Sub-Tab Navigation
  const [activeTab, setActiveTab] = useState<"directory" | "bulk">("directory");

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVendorId, setSelectedVendorId] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<"all" | "available" | "unavailable">("all");

  // Selection for Bulk Actions
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  // Edit Modal/Drawer State
  const [editingItem, setEditingItem] = useState<MenuItemWithHistory | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState<any>("lunch");
  const [editPrice, setEditPrice] = useState("");
  const [editAvailable, setEditAvailable] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);

  // History Modal State
  const [historyItem, setHistoryItem] = useState<MenuItemWithHistory | null>(null);

  // Bulk Adjustment Form State
  const [bulkAdjustmentType, setBulkAdjustmentType] = useState<"percent_increase" | "percent_decrease" | "fixed_increase" | "fixed_decrease" | "exact">("percent_increase");
  const [bulkValue, setBulkValue] = useState<string>("10");
  const [showBulkPreview, setShowBulkPreview] = useState(false);
  const [applyingBulk, setApplyingBulk] = useState(false);
  const [bulkSuccessMessage, setBulkSuccessMessage] = useState("");

  // Fetch Master Data
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Vendors
      const vendorSnap = await getDocs(collection(db, "vendors"));
      const vendorList = vendorSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Vendor[];
      setVendors(vendorList);

      // 2. Fetch Menu Items
      const itemSnap = await getDocs(collection(db, "menuItems"));
      const itemList = itemSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as MenuItemWithHistory[];
      setMenuItems(itemList);
    } catch (err) {
      console.error("Error fetching menu items:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Vendor Map for quick lookup
  const vendorMap = useMemo(() => {
    const map = new Map<string, string>();
    vendors.forEach((v) => map.set(v.id, v.name));
    return map;
  }, [vendors]);

  // Categories present in dataset
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    menuItems.forEach((i) => {
      if (i.category) set.add(i.category);
    });
    return Array.from(set);
  }, [menuItems]);

  // Filtered Menu Items
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      // Search
      const query = searchQuery.toLowerCase().trim();
      const nameMatch = item.name?.toLowerCase().includes(query) || item.description?.toLowerCase().includes(query);
      if (query && !nameMatch) return false;

      // Vendor Filter
      if (selectedVendorId !== "all" && item.vendor_id !== selectedVendorId) return false;

      // Category Filter
      if (selectedCategory !== "all" && item.category !== selectedCategory) return false;

      // Availability Filter
      if (availabilityFilter === "available" && !item.is_available) return false;
      if (availabilityFilter === "unavailable" && item.is_available) return false;

      return true;
    });
  }, [menuItems, searchQuery, selectedVendorId, selectedCategory, availabilityFilter]);

  // Handle Select All / Deselect All
  const handleToggleSelectAll = () => {
    if (selectedItemIds.size === filteredItems.length && filteredItems.length > 0) {
      setSelectedItemIds(new Set());
    } else {
      const newSet = new Set<string>();
      filteredItems.forEach((i) => newSet.add(i.id));
      setSelectedItemIds(newSet);
    }
  };

  const handleToggleSelectItem = (id: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Open Single Item Edit Modal
  const handleOpenEdit = (item: MenuItemWithHistory) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditDescription(item.description || "");
    setEditCategory(item.category || "lunch");
    setEditPrice(String(item.price));
    setEditAvailable(item.is_available !== false);
  };

  // Save Single Item Edit with Price History Tracking
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setSavingEdit(true);

    const oldPriceNum = parseFloat(String(editingItem.price)) || 0;
    const newPriceNum = parseFloat(editPrice) || 0;
    const priceChanged = Math.abs(oldPriceNum - newPriceNum) > 0.01;

    try {
      const docRef = doc(db, "menuItems", editingItem.id);
      const updatePayload: any = {
        name: editName,
        description: editDescription,
        category: editCategory,
        price: newPriceNum,
        is_available: editAvailable,
        updated_at: new Date(),
      };

      if (priceChanged) {
        const historyEntry = {
          old_price: oldPriceNum,
          new_price: newPriceNum,
          changed_at: new Date().toISOString(),
          change_type: "manual_edit",
        };
        updatePayload.price_history = arrayUnion(historyEntry);
      }

      await updateDoc(docRef, updatePayload);

      setEditingItem(null);
      fetchData();
    } catch (err) {
      console.error("Error saving menu item edit:", err);
      alert("Failed to save menu item changes.");
    } finally {
      setSavingEdit(false);
    }
  };

  // Quick Toggle Availability
  const handleToggleAvailability = async (item: MenuItemWithHistory) => {
    try {
      await updateDoc(doc(db, "menuItems", item.id), {
        is_available: !item.is_available,
      });
      fetchData();
    } catch (err) {
      console.error("Error toggling availability:", err);
    }
  };

  // Compute Bulk Adjustment New Price Preview
  const computeNewPrice = (oldPrice: number): number => {
    const val = parseFloat(bulkValue) || 0;
    let newP = oldPrice;
    if (bulkAdjustmentType === "percent_increase") {
      newP = oldPrice * (1 + val / 100);
    } else if (bulkAdjustmentType === "percent_decrease") {
      newP = oldPrice * (1 - val / 100);
    } else if (bulkAdjustmentType === "fixed_increase") {
      newP = oldPrice + val;
    } else if (bulkAdjustmentType === "fixed_decrease") {
      newP = oldPrice - val;
    } else if (bulkAdjustmentType === "exact") {
      newP = val;
    }
    // Round to nearest 50 TZS for clean financial formatting
    return Math.max(0, Math.round(newP / 50) * 50);
  };

  // Items targeted for bulk operation
  const targetedItems = useMemo(() => {
    return menuItems.filter((i) => selectedItemIds.has(i.id));
  }, [menuItems, selectedItemIds]);

  // Apply Bulk Price Adjustments with Price History Tracking
  const handleApplyBulkAdjustment = async () => {
    if (targetedItems.length === 0) return;
    setApplyingBulk(true);
    setBulkSuccessMessage("");

    try {
      const batch = writeBatch(db);
      const timestampIso = new Date().toISOString();

      targetedItems.forEach((item) => {
        const oldPriceNum = parseFloat(String(item.price)) || 0;
        const newPriceNum = computeNewPrice(oldPriceNum);
        const itemRef = doc(db, "menuItems", item.id);

        const historyEntry = {
          old_price: oldPriceNum,
          new_price: newPriceNum,
          changed_at: timestampIso,
          change_type: `bulk_${bulkAdjustmentType}`,
        };

        batch.update(itemRef, {
          price: newPriceNum,
          price_history: arrayUnion(historyEntry),
          updated_at: new Date(),
        });
      });

      await batch.commit();

      setBulkSuccessMessage(`Successfully updated prices for ${targetedItems.length} menu items!`);
      setShowBulkPreview(false);
      setSelectedItemIds(new Set());
      fetchData();
      setTimeout(() => setBulkSuccessMessage(""), 4000);
    } catch (err) {
      console.error("Error applying bulk price adjustment:", err);
      alert("Failed to apply bulk price adjustments.");
    } finally {
      setApplyingBulk(false);
    }
  };

  return (
    <div className="space-y-6 font-sans pb-16">
      {/* Header Banner */}
      <div className="bg-white/[0.02] border border-white/[0.08] p-6 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
              <UtensilsCrossed size={20} />
            </div>
            <h2 className="text-lg font-black text-white tracking-tight">Merchant Menu Item Manager</h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1 max-w-xl">
            Browse food offerings across all vendor spots, edit descriptions & pricing, toggle item availability, and apply bulk price adjustments with full price history tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-xs px-3.5 py-2 rounded-xl text-zinc-300 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            <span>Refresh Catalog</span>
          </button>
        </div>
      </div>

      {bulkSuccessMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl text-xs font-bold flex items-center gap-2">
          <Check size={16} />
          <span>{bulkSuccessMessage}</span>
        </div>
      )}

      {/* Main Mode Sub-Tabs */}
      <div className="flex items-center gap-2 bg-white/[0.02] border border-white/[0.08] p-1.5 rounded-2xl">
        <button
          onClick={() => setActiveTab("directory")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "directory"
              ? "bg-[#00bfff] text-black shadow-md shadow-[#00bfff]/20"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Catalog Directory ({filteredItems.length})
        </button>
        <button
          onClick={() => setActiveTab("bulk")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "bulk"
              ? "bg-purple-500 text-black shadow-md shadow-purple-500/20"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <TrendingUp size={14} />
          <span>Bulk Price Adjuster ({selectedItemIds.size} Selected)</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white/[0.02] border border-white/[0.08] p-4 rounded-2xl space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          {/* Search Box */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search dish name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl py-2 pl-9 pr-3 text-white placeholder-zinc-500 outline-none focus:border-[#00bfff]"
            />
          </div>

          {/* Vendor Filter */}
          <select
            value={selectedVendorId}
            onChange={(e) => setSelectedVendorId(e.target.value)}
            className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-2 text-white outline-none focus:border-[#00bfff]"
          >
            <option value="all" className="bg-zinc-900">All Vendors ({vendors.length})</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id} className="bg-zinc-900">
                {v.name}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-2 text-white outline-none focus:border-[#00bfff] capitalize"
          >
            <option value="all" className="bg-zinc-900">All Categories ({categoriesList.length})</option>
            {categoriesList.map((cat) => (
              <option key={cat} value={cat} className="bg-zinc-900 capitalize">
                {cat}
              </option>
            ))}
          </select>

          {/* Availability Filter */}
          <select
            value={availabilityFilter}
            onChange={(e) => setAvailabilityFilter(e.target.value as any)}
            className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-2 text-white outline-none focus:border-[#00bfff]"
          >
            <option value="all" className="bg-zinc-900">All Availability</option>
            <option value="available" className="bg-zinc-900">Available Only</option>
            <option value="unavailable" className="bg-zinc-900">Unavailable / Out of Stock</option>
          </select>
        </div>

        {/* Selection Stats Bar */}
        <div className="flex items-center justify-between text-xs pt-2 border-t border-white/[0.06]">
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleSelectAll}
              className="text-[#00bfff] hover:underline font-bold flex items-center gap-1.5 cursor-pointer"
            >
              {selectedItemIds.size === filteredItems.length && filteredItems.length > 0 ? (
                <CheckSquare size={14} />
              ) : (
                <Square size={14} />
              )}
              <span>
                {selectedItemIds.size === filteredItems.length && filteredItems.length > 0
                  ? "Deselect All"
                  : `Select All Filtered (${filteredItems.length})`}
              </span>
            </button>

            {selectedItemIds.size > 0 && (
              <span className="bg-purple-500/10 text-purple-400 px-2.5 py-0.5 rounded-full border border-purple-500/20 font-bold text-[10px]">
                {selectedItemIds.size} items ready for bulk action
              </span>
            )}
          </div>

          <span className="text-zinc-500 text-[11px]">
            Showing {filteredItems.length} of {menuItems.length} total catalog items
          </span>
        </div>
      </div>

      {/* Directory View */}
      {activeTab === "directory" && (
        <div className="bg-white/[0.02] border border-white/[0.08] rounded-3xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-zinc-500 text-xs">Loading food menu catalog...</div>
          ) : filteredItems.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 text-xs">No menu items match your search filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.03] border-b border-white/[0.08] text-zinc-400 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-4 w-10">Select</th>
                    <th className="p-4">Item & Description</th>
                    <th className="p-4">Vendor Spot</th>
                    <th className="p-4">Category</th>
                    <th className="p-4 text-right">Price (TZS)</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Price History</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {filteredItems.map((item) => {
                    const isSelected = selectedItemIds.has(item.id);
                    const vendorName = vendorMap.get(item.vendor_id) || item.vendor_id;

                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-white/[0.02] transition-all ${
                          isSelected ? "bg-purple-500/[0.05]" : ""
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="p-4">
                          <button
                            onClick={() => handleToggleSelectItem(item.id)}
                            className="text-zinc-400 hover:text-white cursor-pointer"
                          >
                            {isSelected ? (
                              <CheckSquare size={16} className="text-purple-400" />
                            ) : (
                              <Square size={16} />
                            )}
                          </button>
                        </td>

                        {/* Image & Name */}
                        <td className="p-4">
                          <div className="flex items-center gap-3 min-w-[200px]">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.name}
                                className="w-10 h-10 rounded-xl object-cover border border-white/[0.1] shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-600 shrink-0">
                                <UtensilsCrossed size={16} />
                              </div>
                            )}
                            <div>
                              <div className="font-extrabold text-white">{item.name}</div>
                              {item.description && (
                                <p className="text-[11px] text-zinc-400 line-clamp-1 max-w-xs">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Vendor */}
                        <td className="p-4 text-zinc-300 font-medium">
                          <div className="flex items-center gap-1.5">
                            <Store size={12} className="text-zinc-500 shrink-0" />
                            <span className="truncate max-w-[140px]">{vendorName}</span>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="p-4">
                          <span className="bg-white/[0.04] border border-white/[0.08] text-zinc-300 px-2.5 py-1 rounded-lg text-[10px] font-mono capitalize">
                            {item.category || "uncategorized"}
                          </span>
                        </td>

                        {/* Price */}
                        <td className="p-4 text-right font-mono font-extrabold text-white">
                          {Number(item.price).toLocaleString()} TZS
                        </td>

                        {/* Status Toggle */}
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleToggleAvailability(item)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition-all cursor-pointer border ${
                              item.is_available !== false
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-red-500/10 text-red-400 border-red-500/20"
                            }`}
                          >
                            {item.is_available !== false ? "Available" : "Out of Stock"}
                          </button>
                        </td>

                        {/* Price History Log button */}
                        <td className="p-4 text-center">
                          {item.price_history && item.price_history.length > 0 ? (
                            <button
                              onClick={() => setHistoryItem(item)}
                              className="text-xs text-[#00bfff] hover:underline flex items-center justify-center gap-1 mx-auto font-mono"
                            >
                              <History size={13} />
                              <span>{item.price_history.length} changes</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-zinc-600 font-mono">No history</span>
                          )}
                        </td>

                        {/* Edit Button */}
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="bg-white/[0.04] border border-white/[0.08] hover:bg-[#00bfff] hover:text-black hover:border-[#00bfff] text-zinc-300 p-2 rounded-xl transition-all cursor-pointer"
                            title="Edit menu item"
                          >
                            <Edit2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Bulk Price Adjuster Tab */}
      {activeTab === "bulk" && (
        <div className="bg-white/[0.02] border border-white/[0.08] p-6 rounded-3xl space-y-6">
          <div>
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <TrendingUp size={20} className="text-purple-400" />
              <span>Bulk Price Adjustment Engine</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Modify menu item prices in bulk across all selected vendor dishes. All price adjustments are automatically tracked in each item's price history audit log.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Adjustment Type */}
            <div className="space-y-1.5">
              <label className="text-zinc-300 font-bold block">Adjustment Type</label>
              <select
                value={bulkAdjustmentType}
                onChange={(e) => setBulkAdjustmentType(e.target.value as any)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 text-white outline-none focus:border-purple-400"
              >
                <option value="percent_increase" className="bg-zinc-900">Increase by Percentage (%)</option>
                <option value="percent_decrease" className="bg-zinc-900">Decrease by Percentage (%)</option>
                <option value="fixed_increase" className="bg-zinc-900">Increase by Fixed Amount (TZS)</option>
                <option value="fixed_decrease" className="bg-zinc-900">Decrease by Fixed Amount (TZS)</option>
                <option value="exact" className="bg-zinc-900">Set Uniform Price (TZS)</option>
              </select>
            </div>

            {/* Adjustment Value */}
            <div className="space-y-1.5">
              <label className="text-zinc-300 font-bold block">
                {bulkAdjustmentType.startsWith("percent") ? "Percentage Rate (%)" : "Amount in TZS"}
              </label>
              <input
                type="number"
                step="any"
                value={bulkValue}
                onChange={(e) => setBulkValue(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 text-white outline-none focus:border-purple-400 font-mono text-sm"
              />
            </div>

            {/* Target Summary */}
            <div className="space-y-1.5 bg-purple-500/10 border border-purple-500/20 p-3.5 rounded-2xl flex flex-col justify-between">
              <span className="text-[11px] text-purple-300 font-bold uppercase tracking-wider block">
                Target Selected Scope
              </span>
              <div className="text-sm font-extrabold text-white">
                {targetedItems.length} Items Selected
              </div>
              <p className="text-[10px] text-zinc-400">
                {targetedItems.length === 0
                  ? "Select items from the directory tab or click 'Select All Filtered' above."
                  : "Click preview below to review new price computations before committing."}
              </p>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              onClick={() => setShowBulkPreview(true)}
              disabled={targetedItems.length === 0}
              className="bg-purple-500 hover:bg-purple-400 text-black font-extrabold px-6 py-3 rounded-xl text-xs transition-all cursor-pointer shadow-lg shadow-purple-500/20 disabled:opacity-50 flex items-center gap-2"
            >
              <Eye size={15} />
              <span>Preview New Prices for {targetedItems.length} Items</span>
            </button>
          </div>

          {/* Bulk Preview List */}
          {showBulkPreview && (
            <div className="bg-white/[0.02] border border-purple-500/30 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-400" />
                  <span>Bulk Price Update Preview</span>
                </h4>
                <button
                  onClick={() => setShowBulkPreview(false)}
                  className="text-zinc-500 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto divide-y divide-white/[0.06] text-xs">
                {targetedItems.map((item) => {
                  const oldP = parseFloat(String(item.price)) || 0;
                  const newP = computeNewPrice(oldP);
                  const diff = newP - oldP;

                  return (
                    <div key={item.id} className="py-2.5 flex items-center justify-between gap-4">
                      <div>
                        <div className="font-bold text-white">{item.name}</div>
                        <div className="text-[11px] text-zinc-400">{vendorMap.get(item.vendor_id)}</div>
                      </div>

                      <div className="flex items-center gap-3 font-mono">
                        <span className="text-zinc-400 line-through">{oldP.toLocaleString()} TZS</span>
                        <span className="text-zinc-500">→</span>
                        <span className="text-emerald-400 font-extrabold">{newP.toLocaleString()} TZS</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            diff >= 0
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-red-500/10 text-red-400"
                          }`}
                        >
                          {diff >= 0 ? `+${diff.toLocaleString()}` : diff.toLocaleString()} TZS
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between">
                <span className="text-xs text-zinc-400">
                  This action will update {targetedItems.length} records in Firestore and append price history logs.
                </span>

                <button
                  onClick={handleApplyBulkAdjustment}
                  disabled={applyingBulk}
                  className="bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold px-6 py-3 rounded-xl text-xs transition-all cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-2"
                >
                  <Check size={16} />
                  <span>{applyingBulk ? "Committing Updates..." : "Confirm & Update All Prices"}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SINGLE ITEM EDIT MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0f0f12] border border-white/[0.1] w-full max-w-lg rounded-3xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                <Edit2 size={18} className="text-[#00bfff]" />
                <span>Edit Menu Item</span>
              </h3>
              <button
                onClick={() => setEditingItem(null)}
                className="text-zinc-500 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="text-zinc-300 font-bold block mb-1">Item Dish Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 text-white outline-none focus:border-[#00bfff]"
                  required
                />
              </div>

              <div>
                <label className="text-zinc-300 font-bold block mb-1">Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 text-white outline-none focus:border-[#00bfff] h-20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-300 font-bold block mb-1">Category</label>
                  <input
                    type="text"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 text-white outline-none focus:border-[#00bfff] capitalize"
                  />
                </div>

                <div>
                  <label className="text-zinc-300 font-bold block mb-1">Price (TZS)</label>
                  <input
                    type="number"
                    step="50"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 text-white outline-none focus:border-[#00bfff] font-mono text-sm"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <span className="text-zinc-300 font-bold">Item Availability Status</span>
                <button
                  type="button"
                  onClick={() => setEditAvailable(!editAvailable)}
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase transition-all border ${
                    editAvailable
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-red-500/10 text-red-400 border-red-500/20"
                  }`}
                >
                  {editAvailable ? "Available" : "Out of Stock"}
                </button>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2.5 rounded-xl border border-white/[0.08] text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={savingEdit}
                  className="bg-[#00bfff] hover:bg-[#00a8e6] text-black font-extrabold px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow-lg shadow-[#00bfff]/20 disabled:opacity-50"
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRICE HISTORY AUDIT LOG MODAL */}
      {historyItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0f0f12] border border-white/[0.1] w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div>
                <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                  <History size={16} className="text-[#00bfff]" />
                  <span>Price Change Audit Trail</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">{historyItem.name}</p>
              </div>
              <button
                onClick={() => setHistoryItem(null)}
                className="text-zinc-500 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2.5 text-xs">
              {historyItem.price_history && historyItem.price_history.length > 0 ? (
                historyItem.price_history.map((log, index) => {
                  const dateStr = log.changed_at ? new Date(log.changed_at).toLocaleString() : "Unknown date";
                  const diff = log.new_price - log.old_price;

                  return (
                    <div
                      key={index}
                      className="bg-white/[0.02] border border-white/[0.06] p-3 rounded-2xl space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-zinc-500 uppercase">
                          {log.change_type}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono">{dateStr}</span>
                      </div>

                      <div className="flex items-center justify-between font-mono">
                        <span className="text-zinc-400">{log.old_price.toLocaleString()} TZS</span>
                        <span className="text-zinc-600">→</span>
                        <span className="text-emerald-400 font-extrabold">{log.new_price.toLocaleString()} TZS</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            diff >= 0
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-red-500/10 text-red-400"
                          }`}
                        >
                          {diff >= 0 ? `+${diff.toLocaleString()}` : diff.toLocaleString()} TZS
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-zinc-500 py-6">No historical price changes recorded yet.</div>
              )}
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setHistoryItem(null)}
                className="px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-zinc-300 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
