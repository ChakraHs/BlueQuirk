// Client-side image compression before upload. Uses the browser's native
// Canvas codec (no extra dependency) to: downscale to a max dimension while
// keeping aspect ratio, and re-encode to WebP (falling back to JPEG when the
// browser can't encode WebP). This shrinks files for web performance without
// visible quality loss, so the backend just stores already-optimized bytes in
// Cloudflare.

export type CompressOptions = {
  maxDimension?: number; // longest edge, px
  quality?: number; // 0..1
  /** Skip files at/under this size (bytes) — already small enough. */
  skipUnderBytes?: number;
};

const DEFAULTS: Required<CompressOptions> = {
  maxDimension: 1600,
  quality: 0.82,
  skipUnderBytes: 40 * 1024, // 40 KB
};

/** True when the browser can encode WebP via canvas.toBlob. */
function canEncodeWebp(): boolean {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    return false;
  }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

function swapExtension(name: string, ext: string): string {
  const base = name.replace(/\.[^./\\]+$/, "");
  return `${base || "image"}.${ext}`;
}

/**
 * Compress one image file. Returns a new File (WebP when supported). Non-image
 * inputs, SVGs, GIFs (to preserve animation), and tiny files are returned as-is.
 */
export async function compressImage(file: File, options: CompressOptions = {}): Promise<File> {
  const opts = { ...DEFAULTS, ...options };

  const isImage = file.type.startsWith("image/");
  const isVector = file.type === "image/svg+xml";
  const isGif = file.type === "image/gif";
  if (!isImage || isVector || isGif || file.size <= opts.skipUnderBytes) {
    return file;
  }

  let img: HTMLImageElement;
  try {
    img = await loadImage(file);
  } catch {
    return file; // can't decode -> upload original untouched
  }

  const { width, height } = img;
  const scale = Math.min(1, opts.maxDimension / Math.max(width, height));
  const targetW = Math.max(1, Math.round(width * scale));
  const targetH = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, targetW, targetH);

  const useWebp = canEncodeWebp();
  const mime = useWebp ? "image/webp" : "image/jpeg";
  const ext = useWebp ? "webp" : "jpg";

  const blob = await canvasToBlob(canvas, mime, opts.quality);
  if (!blob) return file;

  // If compression somehow produced a bigger file, keep the original.
  if (blob.size >= file.size) return file;

  return new File([blob], swapExtension(file.name, ext), {
    type: mime,
    lastModified: Date.now(),
  });
}
