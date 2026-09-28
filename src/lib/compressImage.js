// Phone photos are often 5-12 MB, but the server only analyses ~1600 px (it
// resizes to that anyway). Shrinking in the browser first keeps uploads fast
// on slow connections and under hosting request limits (Vercel: 4.5 MB).

const MAX_DIMENSION = 1600;
const QUALITY = 0.85;
const SMALL_ENOUGH_BYTES = 1.5 * 1024 * 1024;

export default async function compressImage(file) {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= SMALL_ENOUGH_BYTES) {
      bitmap.close();
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff"; // transparent PNG areas become white, not black
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALITY));
    if (!blob || blob.size >= file.size) return file;
    const name = `${file.name.replace(/\.[^.]+$/, "") || "photo"}.jpg`;
    return new File([blob], name, { type: "image/jpeg" });
  } catch {
    return file; // unsupported format or old browser: upload as-is
  }
}
