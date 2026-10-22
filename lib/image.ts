"use client";

/**
 * Make a payment-slip photo small enough to upload quickly and safely.
 * Phone screenshots are often 3–8 MB PNGs; the server (Netlify) refuses
 * request bodies of about 6 MB, which the phone reports as "Load failed".
 * Re-encodes as JPEG, longest side ≤ `maxSide`. Small files are kept as-is.
 */
export async function shrinkImage(file: File, maxSide = 1800, quality = 0.85): Promise<File> {
  if (file.size <= 1_200_000 && file.type !== "image/heic") return file;
  try {
    const img = await decode(file);
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.fillStyle = "#fff"; // transparent PNG areas become white, not black
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img.source, 0, 0, w, h);
    img.close?.();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file;
    const name = (file.name || "slip").replace(/\.[a-z0-9]+$/i, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}

type Decoded = { source: CanvasImageSource; width: number; height: number; close?: () => void };

async function decode(file: File): Promise<Decoded> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file);
      return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
    } catch {
      /* fall back to <img> */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const el = new Image();
    el.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      el.onload = () => resolve();
      el.onerror = () => reject(new Error("decode failed"));
      el.src = url;
    });
    return { source: el, width: el.naturalWidth, height: el.naturalHeight };
  } finally {
    // The image is already decoded; revoking after drawing is not needed.
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
}

/** True for the browser's own "could not reach the server" errors. */
export function isNetworkError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return err instanceof TypeError && /load failed|failed to fetch|networkerror|network request failed/i.test(msg);
}
