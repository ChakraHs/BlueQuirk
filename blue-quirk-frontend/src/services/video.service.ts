// Uploads a product's featured video to the shop backend (:9090), which stores
// the MP4 untouched in Cloudflare R2 and returns its public URL + byte size
// (see VideoController). Only MP4 (H.264) is accepted — the one format that
// plays inline everywhere. Poster generation happens client-side (a frame is
// captured from the local file before upload) and the poster is uploaded via the
// normal ImageService, so there is no separate poster endpoint.
import api from "./api";

export type UploadedVideo = {
  videoUrl: string;
  fileSize: number;
  contentType: string;
};

export const VideoService = {
  /**
   * Upload a single MP4 at full quality; returns its R2 URL and size.
   * `onProgress` (0–100) is reported as the file uploads — videos are large, so
   * the admin UI shows a real progress bar rather than an indeterminate spinner.
   */
  upload: async (
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<UploadedVideo> => {
    const form = new FormData();
    form.append("file", file);
    const { data } = await api.post<UploadedVideo>("/videos", form, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.min(100, Math.round((e.loaded / e.total) * 100)));
        }
      },
    });
    return data;
  },
};
