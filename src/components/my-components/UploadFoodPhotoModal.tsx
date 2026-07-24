import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, UploadCloud, Camera, CheckCircle2, AlertCircle, Loader2, Sparkles, ShieldCheck } from "lucide-react";
import { collection, addDoc, getDocs, query, where, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";

interface UploadFoodPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  phone: string;
  vendorId: string;
  vendorName: string;
  menuItemId: string;
  menuItemName: string;
}

export default function UploadFoodPhotoModal({
  isOpen,
  onClose,
  orderId,
  phone,
  vendorId,
  vendorName,
  menuItemId,
  menuItemName,
}: UploadFoodPhotoModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if photo was already submitted for this specific order item
  useEffect(() => {
    if (!isOpen || !orderId || !menuItemId) return;

    const checkExistingSubmission = async () => {
      setCheckingExisting(true);
      setError(null);
      try {
        const q = query(
          collection(db, "food_photo_submissions"),
          where("orderId", "==", orderId),
          where("menuItemId", "==", menuItemId)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          setAlreadySubmitted(true);
        } else {
          setAlreadySubmitted(false);
        }
      } catch (err) {
        console.warn("[UploadFoodPhotoModal] Check existing error:", err);
      } finally {
        setCheckingExisting(false);
      }
    };

    checkExistingSubmission();
  }, [isOpen, orderId, menuItemId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError("Image size must be less than 10MB.");
        return;
      }
      setError(null);
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const uploadToCloudinary = async (file: File): Promise<string> => {
    const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    formData.append("folder", "sosika_user_food_photos");

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: "POST", body: formData }
    );

    if (!response.ok) {
      throw new Error("Failed to upload image to Cloudinary.");
    }
    const data = await response.json();
    return data.secure_url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (alreadySubmitted) {
      setError("A photo has already been submitted for this item.");
      return;
    }
    if (!selectedFile) {
      setError("Please select or capture a photo of your meal.");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Re-verify strictly that no duplicate submission exists
      const doubleCheckQ = query(
        collection(db, "food_photo_submissions"),
        where("orderId", "==", orderId),
        where("menuItemId", "==", menuItemId)
      );
      const doubleCheckSnap = await getDocs(doubleCheckQ);
      if (!doubleCheckSnap.empty) {
        setAlreadySubmitted(true);
        throw new Error("A photo for this item has already been submitted.");
      }

      // 1. Upload to Cloudinary
      const imageUrl = await uploadToCloudinary(selectedFile);

      // 2. Save submission to Firestore
      await addDoc(collection(db, "food_photo_submissions"), {
        submissionKey: `${orderId}_${menuItemId}`, // Unique compound key
        orderId,
        phone,
        vendorId,
        vendorName: vendorName || "Vendor",
        menuItemId,
        menuItemName,
        imageUrl,
        status: "pending",
        rewardAmount: 1000,
        createdAt: serverTimestamp(),
      });

      setSuccess(true);
    } catch (err: any) {
      console.error("[UploadFoodPhotoModal] Submission error:", err);
      setError(err?.message || "Failed to submit photo. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const resetAndClose = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    setSuccess(false);
    setAlreadySubmitted(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md bg-[#121215] border border-white/[0.1] rounded-3xl p-6 shadow-2xl space-y-5 text-white relative overflow-hidden"
        >
          {/* Close button */}
          <button
            onClick={resetAndClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-all cursor-pointer"
          >
            <X size={18} />
          </button>

          {checkingExisting ? (
            <div className="py-12 text-center space-y-3">
              <Loader2 size={28} className="animate-spin text-[#00bfff] mx-auto" />
              <p className="text-xs text-zinc-400">Verifying item photo status...</p>
            </div>
          ) : alreadySubmitted ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                <ShieldCheck size={28} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-white">Photo Already Submitted</h3>
                <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
                  You have already submitted a photo for <strong>{menuItemName}</strong> on Order #{orderId.slice(-6)}. Each meal item can only earn a reward once.
                </p>
              </div>
              <button
                onClick={resetAndClose}
                className="w-full bg-white/[0.08] hover:bg-white/[0.12] text-white font-extrabold py-3 rounded-xl text-xs transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          ) : !success ? (
            <>
              {/* Header */}
              <div className="space-y-1.5 pr-8">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#00bfff]/10 text-[#00bfff] border border-[#00bfff]/20">
                  <Sparkles size={12} />
                  Earn TZS 1,000 Reward
                </span>
                <h2 className="text-lg font-black tracking-tight text-white">
                  Upload Food Photo
                </h2>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Upload a photo of your <strong>{menuItemName}</strong> from {vendorName}. Once approved by admin, <strong>1,000 TZS Sosika Cash</strong> will be credited to your wallet!
                </p>
              </div>

              {/* Upload Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {/* Upload Box / Image Preview */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-white/[0.15] hover:border-[#00bfff]/50 rounded-2xl p-6 text-center cursor-pointer transition-all bg-white/[0.02] hover:bg-white/[0.04] relative group overflow-hidden"
                >
                  {previewUrl ? (
                    <div className="relative aspect-video w-full rounded-xl overflow-hidden">
                      <img
                        src={previewUrl}
                        alt="Meal preview"
                        className="w-full h-full object-cover rounded-xl"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-xs font-bold bg-black/60 px-3 py-1.5 rounded-lg border border-white/20">
                          Change Photo
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 py-4">
                      <div className="w-12 h-12 rounded-2xl bg-[#00bfff]/10 text-[#00bfff] border border-[#00bfff]/20 flex items-center justify-center mx-auto">
                        <Camera size={24} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-extrabold text-white">
                          Tap to take or choose photo
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          Supports PNG, JPG, WEBP (Max 10MB)
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {error && (
                  <p className="text-xs text-red-400 flex items-center gap-1.5">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{error}</span>
                  </p>
                )}

                <button
                  type="submit"
                  disabled={uploading || !selectedFile}
                  className="w-full bg-[#00bfff] hover:bg-[#00a8e6] disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-extrabold py-3.5 rounded-xl text-xs transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#00bfff]/10"
                >
                  {uploading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Uploading & Submitting...
                    </>
                  ) : (
                    <>
                      <UploadCloud size={16} />
                      <span>Submit Photo for TZS 1,000</span>
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-black text-white">Photo Submitted!</h3>
                <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
                  Your photo for <strong>{menuItemName}</strong> is now pending admin approval. You will receive <strong>1,000 TZS Sosika Cash</strong> in your wallet once verified!
                </p>
              </div>
              <button
                onClick={resetAndClose}
                className="w-full bg-white/[0.08] hover:bg-white/[0.12] text-white font-extrabold py-3 rounded-xl text-xs transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
