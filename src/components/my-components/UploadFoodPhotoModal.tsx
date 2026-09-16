import React, { useState, useEffect, useRef } from "react";
import { UploadCloud, CheckCircle2, AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import { collection, addDoc, getDocs, query, where, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import BottomSheet from "./BottomSheet";

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

      // 2. Save submission to Firestore. The reward amount is intentionally
      // NOT set here — it's attacker-controlled if it were, since this is a
      // client write. The onFoodPhotoApproved Cloud Function trigger reads
      // the true amount from system_settings/global.photoRewardAmount when
      // an admin approves the submission (see functions/src/wallet.ts).
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
    <BottomSheet
      isOpen={isOpen}
      onClose={resetAndClose}
      title="Snap your food 📸"
      closeLabel="Later"
    >
      {checkingExisting ? (
        <div className="py-12 text-center space-y-3">
          <Loader2 size={28} className="animate-spin text-accent-ink mx-auto" />
          <p className="text-xs text-content-muted">Verifying item photo status…</p>
        </div>
      ) : alreadySubmitted ? (
        <div className="py-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-[18px] bg-sosika-amber/10 border border-sosika-amber/20 text-amber-ink flex items-center justify-center mx-auto">
            <ShieldCheck size={28} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-content">Photo already submitted</h3>
            <p className="text-xs text-content-muted max-w-xs mx-auto leading-relaxed">
              You have already submitted a photo for <strong className="text-content-secondary">{menuItemName}</strong> on order #{orderId.slice(-6)}. Each meal item can only earn a reward once.
            </p>
          </div>
          <button
            onClick={resetAndClose}
            className="w-full bg-surface-3 border border-edge-2 text-content font-bold py-3 rounded-2xl text-sm"
          >
            Close
          </button>
        </div>
      ) : !success ? (
        <>
          <p className="text-[13px] text-content-secondary leading-[1.6]">
            Photograph what you ordered from {vendorName}. If we publish it, 500 TZS lands in your Sosika Cash.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border border-dashed border-edge-3 rounded-[20px] p-[34px] text-center cursor-pointer transition-colors bg-surface-1 relative group overflow-hidden"
            >
              {previewUrl ? (
                <div className="relative aspect-video w-full rounded-xl overflow-hidden">
                  <img src={previewUrl} alt="Meal preview" className="w-full h-full object-cover rounded-xl" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs font-bold bg-black/60 px-3 py-1.5 rounded-lg border border-white/20">
                      Change photo
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <span className="w-12 h-12 rounded-[15px] bg-sosika-cyan/[0.12] flex items-center justify-center text-[19px] text-accent-ink">＋</span>
                  <p className="text-sm font-semibold text-content">Take or choose a photo</p>
                  <p className="font-mono text-[10px] text-content-faint uppercase tracking-wider">
                    JPG or PNG · Max 5 MB
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2.5 text-[13px] text-content-secondary">
                <span className="text-emerald-ink">✓</span> Good light, whole plate in frame
              </div>
              <div className="flex items-center gap-2.5 text-[13px] text-content-secondary">
                <span className="text-emerald-ink">✓</span> No faces or receipts
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-400 flex items-center gap-1.5">
                <AlertCircle size={14} className="shrink-0" />
                <span>{error}</span>
              </p>
            )}

            <div className="flex items-center justify-between rounded-[15px] border border-sosika-amber/25 bg-sosika-amber/[0.055] px-[14px] py-[14px]">
              <span className="text-[13px] font-semibold text-amber-ink">Reward if approved</span>
              <span className="font-mono text-[15px] font-bold text-amber-ink">+500</span>
            </div>

            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className="w-full bg-sosika-cyan disabled:bg-surface-3 disabled:text-content-faint text-on-accent font-bold py-[18px] rounded-2xl text-[15px] transition-opacity active:opacity-90 flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <UploadCloud size={16} />
                  <span>Submit photo</span>
                </>
              )}
            </button>
          </form>
        </>
      ) : (
        <div className="text-center py-6 space-y-4">
          <div className="w-16 h-16 rounded-[18px] bg-sosika-emerald/10 border border-sosika-emerald/20 text-emerald-ink flex items-center justify-center mx-auto">
            <CheckCircle2 size={32} />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-content">Photo submitted</h3>
            <p className="text-xs text-content-muted max-w-xs mx-auto leading-relaxed">
              Your photo for <strong className="text-content-secondary">{menuItemName}</strong> is pending review. 500 TZS lands in your Sosika Cash once it's approved.
            </p>
          </div>
          <button
            onClick={resetAndClose}
            className="w-full bg-surface-3 border border-edge-2 text-content font-bold py-3 rounded-2xl text-sm"
          >
            Done
          </button>
        </div>
      )}
    </BottomSheet>
  );
}
