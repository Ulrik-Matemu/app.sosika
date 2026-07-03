/**
 * Shared Cloudinary Upload Service
 */

const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "";
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "";

/**
 * Uploads a file (image, PDF, etc.) to Cloudinary.
 * @param file The File object to upload
 * @returns A promise that resolves to the secure URL of the uploaded asset
 */
export async function uploadToCloudinary(file: File): Promise<string> {
  if (!CLOUDINARY_UPLOAD_PRESET || !CLOUDINARY_CLOUD_NAME) {
    throw new Error("Cloudinary credentials are not configured in environment variables.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error("Asset upload pipeline rejected the file. Please check file type and size.");
  }

  const data = await response.json();
  if (!data.secure_url) {
    throw new Error("Invalid response received from asset upload server.");
  }

  return data.secure_url;
}
