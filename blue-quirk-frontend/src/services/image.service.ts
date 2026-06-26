// Uploads product images to the shop backend (:9090). The backend stores the
// full-resolution original in Cloudflare R2 and automatically generates the
// optimized thumbnail/display variants (see ImageController + ProductImageService),
// returning all the URLs. We intentionally upload the ORIGINAL file untouched —
// no client-side compression — so the stored original stays genuinely high-res
// for future fullscreen/deep zoom and downloads; all optimization happens server
// side.
import api from "./api";

export type UploadedImage = {
  id: number;
  fileName: string;
  url: string;
  thumbnailUrl?: string;
  displayUrl?: string;
  originalUrl?: string;
  primary?: boolean;
  sortOrder?: number;
};

export const ImageService = {
  /**
   * Upload a single image at full resolution. The returned record carries the
   * Cloudflare URLs (original + generated variants) and the new DB id to link to
   * a product.
   */
  upload: async (file: File): Promise<UploadedImage> => {
    const form = new FormData();
    form.append("file", file);
    const { data } = await api.post<UploadedImage>("/images", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
};
