/**
 * High-performance, Non-Blocking Browser Image Compressor & Optimizer
 * Optimized for Ataq Online & Firebase Storage.
 *
 * Specifications:
 * - Direct <canvas> hardware-accelerated processing with async event-loop yielding (zero UI freeze).
 * - Max dimensions: 1000px (width/height).
 * - Compression quality: 0.7 (70% quality).
 * - Automatic format conversion: image/webp with automatic fallback to image/jpeg.
 * - Drastically reduces multi-megabyte camera photos to lightweight assets (< 150-200 KB).
 */

export interface CompressedImageResult {
  full: string; // Data URL for immediate local preview and offline storage
  blob: Blob; // Optimized Blob ready for Firebase Storage upload
  thumbnail: string; // Micro thumbnail (32px) for instant 0ms blur-up placeholder
  originalSize: number; // File size before compression in bytes
  compressedSize: number; // Final compressed size in bytes
  originalSizeFormatted: string; // Human readable (e.g. "4.8 ميجابايت")
  compressedSizeFormatted: string; // Human readable (e.g. "115 كيلوبايت")
  savingsPercent: number; // Percentage saved (e.g. 96%)
  width: number; // Final width (<= 1000px)
  height: number; // Final height (<= 1000px)
  mimeType: 'image/webp' | 'image/jpeg';
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 كيلوبايت';
  if (bytes >= 1024 * 1024) {
    return (bytes / (1024 * 1024)).toFixed(2) + ' ميجابايت';
  }
  return Math.round(bytes / 1024) + ' كيلوبايت';
}

/**
 * Helper to yield execution to the browser event loop,
 * preventing any frame drop or UI freezing during file reading.
 */
function yieldToMainThread(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => setTimeout(resolve, 0));
    } else {
      setTimeout(resolve, 0);
    }
  });
}

/**
 * Converts a Canvas to a Blob with target MIME type and quality.
 */
function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), type, quality);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Converts a Blob to a Data URL asynchronously.
 */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('فشل في تحويل ملف الصورة إلى مسار بيانات'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Decodes an image file efficiently using createImageBitmap (background thread)
 * or HTMLImageElement fallback without locking the UI.
 */
async function loadSourceImage(file: File | Blob): Promise<{
  source: ImageBitmap | HTMLImageElement;
  width: number;
  height: number;
  close: () => void;
}> {
  // 1. Prefer createImageBitmap for off-main-thread decoding
  if (typeof window !== 'undefined' && 'createImageBitmap' in window) {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close()
      };
    } catch {
      // Fall through to HTMLImageElement fallback
    }
  }

  // 2. Fallback using standard Image with async decoding
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = async () => {
      try {
        if ('decode' in img) {
          await img.decode();
        }
      } catch {
        // Ignored, image is already loaded
      }
      resolve({
        source: img,
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        close: () => URL.revokeObjectURL(url)
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('فشل في فك ترميز ملف الصورة'));
    };

    img.src = url;
  });
}

/**
 * Fast, Non-Blocking Browser Image Compressor & Resizer
 *
 * Defaults:
 * - maxWidth: 1000px
 * - maxHeight: 1000px
 * - quality: 0.7 (70%)
 * - format: image/webp with automatic fallback to image/jpeg
 */
export async function compressAndOptimizeImage(
  file: File | Blob,
  maxWidth = 1000,
  maxHeight = 1000,
  quality = 0.7
): Promise<CompressedImageResult> {
  const originalSize = file.size;

  // Yield to UI thread immediately so user sees loading spinners smoothly
  await yieldToMainThread();

  const { source, width: rawWidth, height: rawHeight, close } = await loadSourceImage(file);

  try {
    // 1. Calculate optimal aspect-ratio preserving dimensions capped at 1000px
    let targetWidth = rawWidth;
    let targetHeight = rawHeight;

    if (targetWidth > maxWidth || targetHeight > maxHeight) {
      const widthRatio = maxWidth / targetWidth;
      const heightRatio = maxHeight / targetHeight;
      const bestRatio = Math.min(widthRatio, heightRatio);

      targetWidth = Math.round(targetWidth * bestRatio);
      targetHeight = Math.round(targetHeight * bestRatio);
    }

    // Ensure dimensions are valid positive integers
    targetWidth = Math.max(1, targetWidth);
    targetHeight = Math.max(1, targetHeight);

    // 2. Setup hardware-accelerated offscreen canvas
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d', { alpha: false });

    if (!ctx) {
      throw new Error('فشل في تهيئة مساحة المعالجة (Canvas 2D Context)');
    }

    // Enable high-quality smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Fill white background (useful for transparent PNGs converted to JPEG/WebP)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, targetWidth, targetHeight);

    // Draw resized image
    ctx.drawImage(source, 0, 0, targetWidth, targetHeight);

    // Allow UI thread to breathe
    await yieldToMainThread();

    // 3. Compress using 70% quality (0.7) with WebP first, then fallback to JPEG
    let targetMime: 'image/webp' | 'image/jpeg' = 'image/webp';
    let blob = await canvasToBlob(canvas, 'image/webp', quality);

    // If WebP is not supported by the environment, convert to JPEG
    if (!blob || !blob.type.includes('webp')) {
      targetMime = 'image/jpeg';
      blob = await canvasToBlob(canvas, 'image/jpeg', quality);
    }

    if (!blob) {
      throw new Error('فشل في إنشاء ملف الصورة المضغوطة');
    }

    // Convert Blob to Data URL
    const fullDataUrl = await blobToDataUrl(blob);

    // 4. Generate micro blur placeholder thumbnail (32px)
    const thumbCanvas = document.createElement('canvas');
    const thumbWidth = 32;
    const thumbHeight = Math.max(16, Math.round((targetHeight * 32) / targetWidth)) || 32;
    thumbCanvas.width = thumbWidth;
    thumbCanvas.height = thumbHeight;
    const thumbCtx = thumbCanvas.getContext('2d', { alpha: false });
    
    if (thumbCtx) {
      thumbCtx.imageSmoothingEnabled = true;
      thumbCtx.fillStyle = '#FFFFFF';
      thumbCtx.fillRect(0, 0, thumbWidth, thumbHeight);
      thumbCtx.drawImage(canvas, 0, 0, thumbWidth, thumbHeight);
    }
    const thumbDataUrl = thumbCanvas.toDataURL('image/jpeg', 0.5);

    const compressedSize = blob.size;
    const savingsPercent = originalSize > compressedSize
      ? Math.round(((originalSize - compressedSize) / originalSize) * 100)
      : 0;

    return {
      full: fullDataUrl,
      blob,
      thumbnail: thumbDataUrl,
      originalSize,
      compressedSize,
      originalSizeFormatted: formatBytes(originalSize),
      compressedSizeFormatted: formatBytes(compressedSize),
      savingsPercent,
      width: targetWidth,
      height: targetHeight,
      mimeType: targetMime
    };
  } finally {
    close();
  }
}

/**
 * Image Cache in Memory for instant 0ms retrieval
 */
const MEMORY_CACHE = new Map<string, string>();

export function getCachedImage(src: string): string {
  return MEMORY_CACHE.get(src) || src;
}

export function setCachedImage(src: string, cachedUrl: string): void {
  if (MEMORY_CACHE.size > 200) {
    const firstKey = MEMORY_CACHE.keys().next().value;
    if (firstKey) MEMORY_CACHE.delete(firstKey);
  }
  MEMORY_CACHE.set(src, cachedUrl);
}
