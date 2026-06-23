// Uploads product images to the shop backend (:9090), which stores them in
// Cloudflare R2 (see backend ImageController + R2StorageService) and returns the
// public URL. Images are compressed client-side before upload (lib/imageCompression).
import api from "./api";
import { compressImage } from "@/lib/imageCompression";

export type UploadedImage = {
  id: number;
  fileName: string;
  url: string;
  primary?: boolean;
  sortOrder?: number;
};

export const ImageService = {
  /**
   * Compress then upload a single image. The returned record carries the
   * Cloudflare URL and the new DB id to link to a product.
   */
  upload: async (file: File): Promise<UploadedImage> => {
    const optimized = await compressImage(file);
    const form = new FormData();
    form.append("file", optimized);
    const { data } = await api.post<UploadedImage>("/images", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
};
