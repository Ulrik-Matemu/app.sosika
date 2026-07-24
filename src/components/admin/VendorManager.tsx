import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import {
  collection,
  addDoc,
  getDocs,
  writeBatch,
  doc,
  updateDoc
} from "firebase/firestore";
import { Vendor } from "../../pages/mood/types/types";
import {
  Store,
  Plus,
  FileJson,
  Download
} from "lucide-react";

export default function VendorManager() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<"directory" | "add_vendor" | "add_item" | "bulk_item">("directory");

  const fetchVendors = async () => {
    setLoadingVendors(true);
    try {
      const vendorsCollection = collection(db, "vendors");
      const vendorSnapshot = await getDocs(vendorsCollection);
      const vendorsList = vendorSnapshot.docs.map((d) => ({
        ...d.data(),
        id: d.id,
      })) as Vendor[];
      setVendors(vendorsList);
    } catch (err) {
      console.error("Error fetching vendors:", err);
    } finally {
      setLoadingVendors(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const toggleVendorApproval = async (vendorId: string, currentApproved: boolean) => {
    try {
      await updateDoc(doc(db, "vendors", vendorId), {
        is_approved: !currentApproved,
        "auth_info.is_approved": !currentApproved,
      });
      fetchVendors();
    } catch (err) {
      console.error("Approval toggle error:", err);
      alert("Failed to toggle vendor approval status.");
    }
  };

  const toggleVendorOpenState = async (vendorId: string, currentOpen: boolean) => {
    try {
      await updateDoc(doc(db, "vendors", vendorId), {
        is_open: !currentOpen,
        "listing_data.is_open": !currentOpen,
      });
      fetchVendors();
    } catch (err) {
      console.error("Open state toggle error:", err);
      alert("Failed to toggle vendor open state.");
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Sub Tab Navigation */}
      <div className="flex items-center gap-2 bg-white/[0.02] border border-white/[0.08] p-1.5 rounded-2xl overflow-x-auto">
        <button
          onClick={() => setActiveSubTab("directory")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === "directory" ? "bg-[#00bfff] text-black shadow-md shadow-[#00bfff]/20" : "text-zinc-400 hover:text-white"
          }`}
        >
          Vendor Directory ({vendors.length})
        </button>
        <button
          onClick={() => setActiveSubTab("add_vendor")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === "add_vendor" ? "bg-[#00bfff] text-black shadow-md shadow-[#00bfff]/20" : "text-zinc-400 hover:text-white"
          }`}
        >
          + Add New Vendor
        </button>
        <button
          onClick={() => setActiveSubTab("add_item")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === "add_item" ? "bg-[#00bfff] text-black shadow-md shadow-[#00bfff]/20" : "text-zinc-400 hover:text-white"
          }`}
        >
          + Add Single Item
        </button>
        <button
          onClick={() => setActiveSubTab("bulk_item")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === "bulk_item" ? "bg-[#00bfff] text-black shadow-md shadow-[#00bfff]/20" : "text-zinc-400 hover:text-white"
          }`}
        >
          📁 Bulk JSON Import
        </button>
      </div>

      {/* Directory Tab */}
      {activeSubTab === "directory" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Registered Merchant Spots
            </h3>
            <button
              onClick={fetchVendors}
              className="bg-white/[0.04] border border-white/[0.08] text-xs px-3 py-1.5 rounded-xl text-zinc-300 hover:text-white"
            >
              Refresh Directory
            </button>
          </div>

          {loadingVendors ? (
            <div className="p-8 text-center text-zinc-500 text-xs">Loading vendors...</div>
          ) : vendors.length === 0 ? (
            <div className="bg-white/[0.02] border border-white/[0.06] p-8 rounded-3xl text-center text-zinc-400 text-xs">
              No vendors registered yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vendors.map((v) => {
                const vAny = v as any;
                const isApproved = vAny.is_approved === true || vAny.auth_info?.is_approved === true;
                const isOpen = v.is_open === true || vAny.listing_data?.is_open === true;

                return (
                  <div
                    key={v.id}
                    className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-4 space-y-3"
                  >
                    <div className="flex gap-3">
                      {v.cover_image_url ? (
                        <img
                          src={v.cover_image_url}
                          alt={v.name}
                          className="w-16 h-16 rounded-xl object-cover border border-white/[0.1] shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-600 shrink-0">
                          <Store size={24} />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-sm text-white truncate">{v.name}</h4>
                          <span
                            className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                              isApproved
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            }`}
                          >
                            {isApproved ? "Approved" : "Pending"}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Owner: <span className="text-zinc-200">{v.owner_name || "N/A"}</span>
                        </p>
                        <p className="text-[11px] text-zinc-500 font-mono">ID: {v.id}</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between gap-2 text-xs">
                      <button
                        onClick={() => toggleVendorApproval(v.id, isApproved)}
                        className={`flex-1 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                          isApproved
                            ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
                            : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                        }`}
                      >
                        {isApproved ? "Deactivate Vendor" : "Approve Vendor"}
                      </button>

                      <button
                        onClick={() => toggleVendorOpenState(v.id, isOpen)}
                        className={`flex-1 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                          isOpen
                            ? "bg-[#00bfff]/10 hover:bg-[#00bfff]/20 text-[#00bfff] border border-[#00bfff]/20"
                            : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                        }`}
                      >
                        {isOpen ? "Open (Online)" : "Closed (Offline)"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add New Vendor Tab */}
      {activeSubTab === "add_vendor" && (
        <AddVendorForm onVendorAdded={fetchVendors} />
      )}

      {/* Add Single Menu Item Tab */}
      {activeSubTab === "add_item" && (
        <AddMenuItemForm vendors={vendors} />
      )}

      {/* Bulk JSON Import Tab */}
      {activeSubTab === "bulk_item" && (
        <AddMenuItemsInBulkForm vendors={vendors} />
      )}
    </div>
  );
}

/* --- ADD VENDOR FORM --- */
const AddVendorForm = ({ onVendorAdded }: { onVendorAdded: () => void }) => {
  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [collegeId, setCollegeId] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error("Cloudinary upload failed");
    const data = await res.json();
    return data.secure_url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !ownerName || !lat || !lng || !coverImageFile) {
      setError("Please fill all required fields and select a cover image.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const coverImageUrl = await uploadImage(coverImageFile);

      await addDoc(collection(db, "vendors"), {
        name,
        owner_name: ownerName,
        college_id: Number(collegeId) || 1,
        geolocation: {
          lat: parseFloat(lat),
          lng: parseFloat(lng),
        },
        is_open: true,
        is_approved: true,
        cover_image_url: coverImageUrl,
        created_at: new Date(),
      });

      setSuccess("Vendor registered and approved successfully!");
      setName("");
      setOwnerName("");
      setCollegeId("");
      setLat("");
      setLng("");
      setCoverImageFile(null);
      onVendorAdded();
    } catch (err: any) {
      setError("Failed to register vendor.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl bg-white/[0.02] border border-white/[0.08] p-6 rounded-3xl space-y-4">
      <h3 className="text-base font-extrabold text-white flex items-center gap-2">
        <Store size={18} className="text-[#00bfff]" />
        <span>Register New Merchant Spot</span>
      </h3>

      <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
        <input
          type="text"
          placeholder="Vendor Spot Name (e.g. Mama Ntilie Royal)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 text-white outline-none focus:border-[#00bfff]"
        />

        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Owner Name"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 text-white outline-none focus:border-[#00bfff]"
          />
          <input
            type="number"
            placeholder="College/Campus ID"
            value={collegeId}
            onChange={(e) => setCollegeId(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 text-white outline-none focus:border-[#00bfff]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <input
            type="number"
            step="any"
            placeholder="Latitude (e.g. -3.37)"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 text-white outline-none focus:border-[#00bfff] font-mono"
          />
          <input
            type="number"
            step="any"
            placeholder="Longitude (e.g. 36.7)"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 text-white outline-none focus:border-[#00bfff] font-mono"
          />
        </div>

        <div>
          <label className="text-zinc-400 block mb-1">Cover Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setCoverImageFile(e.target.files ? e.target.files[0] : null)}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-2 text-zinc-300"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-[#00bfff] hover:bg-[#00a8e6] text-black font-extrabold py-3 rounded-xl transition-all cursor-pointer shadow-lg shadow-[#00bfff]/20 disabled:opacity-50"
        >
          {submitting ? "Registering Vendor..." : "Register & Approve Vendor"}
        </button>

        {error && <p className="text-red-400 text-xs">{error}</p>}
        {success && <p className="text-emerald-400 text-xs">{success}</p>}
      </form>
    </div>
  );
};

/* --- ADD MENU ITEM FORM --- */
const AddMenuItemForm = ({ vendors }: { vendors: Vendor[] }) => {
  const [vendorId, setVendorId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("lunch");
  const [price, setPrice] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

  useEffect(() => {
    if (vendors.length > 0 && !vendorId) {
      setVendorId(vendors[0].id);
    }
  }, [vendors, vendorId]);

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error("Cloudinary upload failed");
    const data = await res.json();
    return data.secure_url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorId || !name || !price || !imageFile) {
      setError("Please fill all fields and upload an item image.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const imageUrl = await uploadImage(imageFile);

      await addDoc(collection(db, "menuItems"), {
        vendor_id: vendorId,
        name,
        description,
        category,
        price: parseFloat(price),
        is_available: true,
        image_url: imageUrl,
        created_at: new Date(),
      });

      setSuccess("Menu item created successfully!");
      setName("");
      setDescription("");
      setPrice("");
      setImageFile(null);
    } catch (err: any) {
      setError("Failed to create menu item.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl bg-white/[0.02] border border-white/[0.08] p-6 rounded-3xl space-y-4">
      <h3 className="text-base font-extrabold text-white flex items-center gap-2">
        <Plus size={18} className="text-[#00bfff]" />
        <span>Add Single Menu Item</span>
      </h3>

      <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
        <div>
          <label className="text-zinc-400 block mb-1">Select Vendor Spot</label>
          <select
            value={vendorId}
            onChange={(e) => setVendorId(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 text-white outline-none focus:border-[#00bfff]"
          >
            {vendors.map((v) => (
              <option key={v.id} value={v.id} className="bg-zinc-900">
                {v.name}
              </option>
            ))}
          </select>
        </div>

        <input
          type="text"
          placeholder="Item Name (e.g. Chips Mayai Special)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 text-white outline-none focus:border-[#00bfff]"
        />

        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 text-white outline-none focus:border-[#00bfff] h-20"
        />

        <div className="grid grid-cols-2 gap-3">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 text-white outline-none focus:border-[#00bfff]"
          >
            <option value="breakfast" className="bg-zinc-900">Breakfast</option>
            <option value="lunch" className="bg-zinc-900">Lunch</option>
            <option value="dinner" className="bg-zinc-900">Dinner</option>
            <option value="snacks" className="bg-zinc-900">Snacks</option>
            <option value="drinks" className="bg-zinc-900">Drinks</option>
          </select>

          <input
            type="number"
            placeholder="Price (TZS)"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 text-white outline-none focus:border-[#00bfff] font-mono"
          />
        </div>

        <div>
          <label className="text-zinc-400 block mb-1">Food Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files ? e.target.files[0] : null)}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-2 text-zinc-300"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-[#00bfff] hover:bg-[#00a8e6] text-black font-extrabold py-3 rounded-xl transition-all cursor-pointer shadow-lg shadow-[#00bfff]/20 disabled:opacity-50"
        >
          {submitting ? "Uploading Item..." : "Save Menu Item"}
        </button>

        {error && <p className="text-red-400 text-xs">{error}</p>}
        {success && <p className="text-emerald-400 text-xs">{success}</p>}
      </form>
    </div>
  );
};

/* --- BULK JSON IMPORT FORM --- */
const AddMenuItemsInBulkForm = ({ vendors }: { vendors: Vendor[] }) => {
  const [vendorId, setVendorId] = useState("");
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (vendors.length > 0 && !vendorId) {
      setVendorId(vendors[0].id);
    }
  }, [vendors, vendorId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorId || !jsonFile) {
      setError("Please select vendor and a valid JSON file.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const text = await jsonFile.text();
      const items = JSON.parse(text);

      if (!Array.isArray(items)) throw new Error("JSON file must be an array of items.");

      const batch = writeBatch(db);
      const collectionRef = collection(db, "menuItems");
      let count = 0;

      for (const item of items) {
        if (!item.name || !item.price) continue;
        const newRef = doc(collectionRef);
        batch.set(newRef, {
          vendor_id: vendorId,
          name: item.name,
          description: item.description || "",
          category: item.category || "lunch",
          price: parseFloat(item.price),
          is_available: item.is_available !== false,
          image_url: item.image_url || "",
          created_at: new Date(),
        });
        count++;
      }

      await batch.commit();
      setSuccess(`Imported ${count} menu items in bulk!`);
      setJsonFile(null);
    } catch (err: any) {
      setError(err.message || "Failed to parse JSON file.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl bg-white/[0.02] border border-white/[0.08] p-6 rounded-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-extrabold text-white flex items-center gap-2">
          <FileJson size={18} className="text-purple-400" />
          <span>Bulk JSON Catalog Import</span>
        </h3>

        <a
          href="https://firebasestorage.googleapis.com/v0/b/sosika-a4328.appspot.com/o/misc%2FmenuItems-template.json?alt=media&token=33b68758-f8a3-482f-a39e-969895832b8f"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[#00bfff] hover:underline flex items-center gap-1 font-bold"
        >
          <Download size={13} />
          <span>Template .json</span>
        </a>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
        <div>
          <label className="text-zinc-400 block mb-1">Target Vendor Spot</label>
          <select
            value={vendorId}
            onChange={(e) => setVendorId(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 text-white outline-none focus:border-[#00bfff]"
          >
            {vendors.map((v) => (
              <option key={v.id} value={v.id} className="bg-zinc-900">
                {v.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-zinc-400 block mb-1">Select JSON File</label>
          <input
            type="file"
            accept=".json"
            onChange={(e) => setJsonFile(e.target.files ? e.target.files[0] : null)}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-2 text-zinc-300"
          />
        </div>

        <button
          type="submit"
          disabled={submitting || !jsonFile}
          className="w-full bg-purple-500 hover:bg-purple-400 text-black font-extrabold py-3 rounded-xl transition-all cursor-pointer disabled:opacity-50"
        >
          {submitting ? "Processing Bulk Batch..." : "Import Bulk Catalog Batch"}
        </button>

        {error && <p className="text-red-400 text-xs">{error}</p>}
        {success && <p className="text-emerald-400 text-xs">{success}</p>}
      </form>
    </div>
  );
};
