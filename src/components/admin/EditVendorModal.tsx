import React, { useState } from "react";
import { db } from "../../firebase";
import { doc, updateDoc } from "firebase/firestore";
import { Vendor } from "../../pages/mood/types/types";
import {
  X,
  Store,
  Key,
  MapPin,
  Crown,
  Save,
  CheckCircle,
  AlertCircle
} from "lucide-react";

interface EditVendorModalProps {
  vendor: Vendor;
  onClose: () => void;
  onVendorUpdated: () => void;
}

export default function EditVendorModal({
  vendor,
  onClose,
  onVendorUpdated,
}: EditVendorModalProps) {
  const vAny = vendor as any;

  // Form State
  const [name, setName] = useState(vendor.name || vAny.listing_data?.name || "");
  const [ownerName, setOwnerName] = useState(vendor.owner_name || vAny.auth_info?.owner_name || vAny.listing_data?.owner_name || "");
  const [collegeId, setCollegeId] = useState(String(vendor.college_id || 1));
  const [address, setAddress] = useState(vendor.address || "");
  const [shortDescription, setShortDescription] = useState(vAny.short_description || "");
  const [fullDescription, setFullDescription] = useState(vAny.full_description || "");

  // Auth Info State
  const [phone, setPhone] = useState(vAny.auth_info?.phone_number || vAny.phone || vAny.listing_data?.phone || "");
  const [email, setEmail] = useState(vAny.auth_info?.email || vAny.email || "");

  // Geolocation State
  const [lat, setLat] = useState(String(vendor.geolocation?.lat ?? vAny.listing_data?.geolocation?.lat ?? ""));
  const [lng, setLng] = useState(String(vendor.geolocation?.lng ?? vAny.listing_data?.geolocation?.lng ?? ""));

  // Cover Image State
  const [coverImageUrl, setCoverImageUrl] = useState(vendor.cover_image_url || "");
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);

  // Subscription State
  const [subTier, setSubTier] = useState<"free" | "premium">(vAny.subscription?.tier || "free");
  const [subStatus, setSubStatus] = useState<string>(vAny.subscription?.status || "active");
  const [smsNotifications, setSmsNotifications] = useState<boolean>(
    vAny.subscription?.features_enabled?.sms_notifications ?? false
  );
  const [analytics, setAnalytics] = useState<boolean>(
    vAny.subscription?.features_enabled?.analytics ?? false
  );

  // Active Modal Tab
  const [activeTab, setActiveTab] = useState<"profile" | "auth" | "location" | "subscription">("profile");

  // Status
  const [saving, setSaving] = useState(false);
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

    if (!res.ok) throw new Error("Cloudinary image upload failed");
    const data = await res.json();
    return data.secure_url;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !ownerName || !lat || !lng) {
      setError("Please fill in Spot Name, Owner Name, Latitude, and Longitude.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      let finalCoverUrl = coverImageUrl;
      if (coverImageFile) {
        finalCoverUrl = await uploadImage(coverImageFile);
      }

      const parsedLat = parseFloat(lat);
      const parsedLng = parseFloat(lng);

      const docRef = doc(db, "vendors", vendor.id);

      const updatePayload: any = {
        // Root properties
        name,
        owner_name: ownerName,
        college_id: Number(collegeId) || 1,
        address,
        short_description: shortDescription,
        full_description: fullDescription,
        cover_image_url: finalCoverUrl,
        geolocation: {
          lat: parsedLat,
          lng: parsedLng,
        },

        // Authentication Map (merchant login & contact)
        "auth_info.owner_name": ownerName,
        "auth_info.email": email,
        "auth_info.phone_number": phone,

        // Legacy listing_data sync
        "listing_data.name": name,
        "listing_data.owner_name": ownerName,
        "listing_data.geolocation": {
          lat: parsedLat,
          lng: parsedLng,
        },

        // Subscription Map
        "subscription.tier": subTier,
        "subscription.status": subStatus,
        "subscription.features_enabled.sms_notifications": smsNotifications,
        "subscription.features_enabled.analytics": analytics,

        updated_at: new Date(),
      };

      await updateDoc(docRef, updatePayload);

      setSuccess("Vendor details & auth parameters updated successfully!");
      setTimeout(() => {
        onVendorUpdated();
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error("Error updating vendor:", err);
      setError(err.message || "Failed to update vendor document.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0f0f12] border border-white/[0.1] w-full max-w-2xl rounded-3xl p-6 space-y-5 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <Store size={18} className="text-[#00bfff]" />
              <h3 className="font-extrabold text-base text-white">Edit Merchant Spot & Auth</h3>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">Vendor ID: {vendor.id}</p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white p-1 rounded-xl cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-2 shrink-0">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex items-center gap-2 shrink-0">
            <CheckCircle size={15} />
            <span>{success}</span>
          </div>
        )}

        {/* Modal Sub-Tabs */}
        <div className="flex items-center gap-1.5 bg-white/[0.03] p-1.5 rounded-2xl border border-white/[0.08] shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "profile" ? "bg-[#00bfff] text-black" : "text-zinc-400 hover:text-white"
            }`}
          >
            <Store size={14} />
            <span>Profile Info</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("auth")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "auth" ? "bg-[#00bfff] text-black" : "text-zinc-400 hover:text-white"
            }`}
          >
            <Key size={14} />
            <span>Auth & Contact</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("location")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "location" ? "bg-[#00bfff] text-black" : "text-zinc-400 hover:text-white"
            }`}
          >
            <MapPin size={14} />
            <span>Geolocation</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("subscription")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "subscription" ? "bg-[#00bfff] text-black" : "text-zinc-400 hover:text-white"
            }`}
          >
            <Crown size={14} />
            <span>Subscription</span>
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto space-y-4 text-xs pr-1 custom-scrollbar">
          {/* TAB 1: PROFILE INFO */}
          {activeTab === "profile" && (
            <div className="space-y-3.5">
              <div>
                <label className="text-zinc-300 font-bold block mb-1">Spot Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 text-white outline-none focus:border-[#00bfff]"
                  placeholder="e.g. Mama Ntilie Royal"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-300 font-bold block mb-1">Owner Name</label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 text-white outline-none focus:border-[#00bfff]"
                    required
                  />
                </div>

                <div>
                  <label className="text-zinc-300 font-bold block mb-1">Campus / College ID</label>
                  <input
                    type="number"
                    value={collegeId}
                    onChange={(e) => setCollegeId(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 text-white outline-none focus:border-[#00bfff]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-300 font-bold block mb-1">Address / Street Location</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 text-white outline-none focus:border-[#00bfff]"
                  placeholder="e.g. Campus Gate B, Arusha"
                />
              </div>

              <div>
                <label className="text-zinc-300 font-bold block mb-1">Short Description</label>
                <input
                  type="text"
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 text-white outline-none focus:border-[#00bfff]"
                />
              </div>

              <div>
                <label className="text-zinc-300 font-bold block mb-1">Full Description</label>
                <textarea
                  value={fullDescription}
                  onChange={(e) => setFullDescription(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 text-white outline-none focus:border-[#00bfff] h-20"
                />
              </div>

              <div>
                <label className="text-zinc-300 font-bold block mb-1">Cover Image</label>
                {coverImageUrl && (
                  <img
                    src={coverImageUrl}
                    alt="Cover Preview"
                    className="w-full h-24 object-cover rounded-xl border border-white/[0.1] mb-2"
                  />
                )}
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Cover Image URL"
                    value={coverImageUrl}
                    onChange={(e) => setCoverImageUrl(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-2.5 text-white outline-none focus:border-[#00bfff] font-mono text-xs"
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setCoverImageFile(e.target.files ? e.target.files[0] : null)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-2 text-zinc-300"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AUTH & CONTACT DATA */}
          {activeTab === "auth" && (
            <div className="space-y-3.5">
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-300 space-y-1">
                <span className="font-bold block flex items-center gap-1.5">
                  <Key size={14} /> Merchant Authentication Credentials
                </span>
                <p className="text-[11px] text-amber-200/80">
                  Editing phone number or email modifies the merchant's login credentials (`auth_info`) used to log into the Sosika Merchant Portal and receive order SMS/emails.
                </p>
              </div>

              <div>
                <label className="text-zinc-300 font-bold block mb-1">
                  Merchant Phone Number (<span className="font-mono text-[#00bfff]">auth_info.phone_number</span>)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 text-white outline-none focus:border-[#00bfff] font-mono"
                  placeholder="e.g. 255712345678"
                />
              </div>

              <div>
                <label className="text-zinc-300 font-bold block mb-1">
                  Merchant Email Address (<span className="font-mono text-[#00bfff]">auth_info.email</span>)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 text-white outline-none focus:border-[#00bfff] font-mono"
                  placeholder="e.g. vendor@sosika.com"
                />
              </div>
            </div>
          )}

          {/* TAB 3: GEOLOCATION */}
          {activeTab === "location" && (
            <div className="space-y-3.5">
              <div className="p-3.5 bg-[#00bfff]/10 border border-[#00bfff]/20 rounded-2xl text-[#00bfff] space-y-1">
                <span className="font-bold block flex items-center gap-1.5">
                  <MapPin size={14} /> Map Distance Coordinates
                </span>
                <p className="text-[11px] text-zinc-300">
                  Coordinates are used to compute delivery distances and delivery fees from this spot to the customer.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-300 font-bold block mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 text-white outline-none focus:border-[#00bfff] font-mono"
                    placeholder="e.g. -3.37"
                    required
                  />
                </div>

                <div>
                  <label className="text-zinc-300 font-bold block mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 text-white outline-none focus:border-[#00bfff] font-mono"
                    placeholder="e.g. 36.7"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SUBSCRIPTION & FEATURES */}
          {activeTab === "subscription" && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-300 font-bold block mb-1">Subscription Tier</label>
                  <select
                    value={subTier}
                    onChange={(e) => setSubTier(e.target.value as any)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 text-white outline-none focus:border-[#00bfff]"
                  >
                    <option value="free" className="bg-zinc-900">Free Tier</option>
                    <option value="premium" className="bg-zinc-900">Premium Tier</option>
                  </select>
                </div>

                <div>
                  <label className="text-zinc-300 font-bold block mb-1">Account Status</label>
                  <select
                    value={subStatus}
                    onChange={(e) => setSubStatus(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 text-white outline-none focus:border-[#00bfff]"
                  >
                    <option value="active" className="bg-zinc-900">Active</option>
                    <option value="inactive" className="bg-zinc-900">Inactive</option>
                    <option value="expired" className="bg-zinc-900">Expired</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                <span className="text-zinc-300 font-bold block">Gated Features</span>

                <label className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] cursor-pointer">
                  <div>
                    <span className="font-bold text-white block">SMS Order Notifications</span>
                    <span className="text-[11px] text-zinc-400">Send direct Meseji SMS alerts to merchant phone on new orders</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={smsNotifications}
                    onChange={(e) => setSmsNotifications(e.target.checked)}
                    className="w-4 h-4 accent-[#00bfff]"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] cursor-pointer">
                  <div>
                    <span className="font-bold text-white block">Advanced Analytics</span>
                    <span className="text-[11px] text-zinc-400">Unlock merchant revenue reporting & insights</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={analytics}
                    onChange={(e) => setAnalytics(e.target.checked)}
                    className="w-4 h-4 accent-[#00bfff]"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Footer Submit */}
          <div className="pt-3 border-t border-white/[0.08] flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-white/[0.08] text-zinc-400 hover:text-white"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="bg-[#00bfff] hover:bg-[#00a8e6] text-black font-extrabold px-6 py-2.5 rounded-xl transition-all cursor-pointer shadow-lg shadow-[#00bfff]/20 disabled:opacity-50 flex items-center gap-1.5"
            >
              <Save size={15} />
              <span>{saving ? "Saving Changes..." : "Save Vendor Data"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
