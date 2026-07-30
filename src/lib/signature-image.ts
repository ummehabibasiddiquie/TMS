/**
 * Prepare a scanned signature so it looks written on the certificate
 * (ink on paper), not a pasted sticker/photo.
 */

const INK = { r: 180, g: 140, b: 40 }; // warm gold ink

function paperScore(r: number, g: number, b: number) {
  const brightness = (r + g + b) / 3;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max - min;
  // Higher = more like paper (remove)
  let score = 0;
  if (brightness > 245) score += 1;
  if (brightness > 220 && saturation < 40) score += 0.85;
  if (brightness > 200 && saturation < 50) score += 0.7;
  if (brightness > 175 && r > 160 && g > 150 && b > 130 && saturation < 60) {
    score += 0.65;
  }
  if (brightness > 160 && saturation < 25) score += 0.5;
  return Math.min(1, score);
}

function processSignatureImageData(image: ImageData) {
  const { data, width, height } = image;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a < 8) {
      data[i + 3] = 0;
      continue;
    }

    const paper = paperScore(r, g, b);
    const brightness = (r + g + b) / 3;
    // How "inky" the pixel is (dark / chromatic vs paper)
    const inkAmount = Math.max(0, 1 - paper) * (1 - brightness / 255);

    if (paper > 0.55 || inkAmount < 0.04) {
      data[i + 3] = 0;
      continue;
    }

    // Soft fade at paper edges — no hard sticker cutout
    const edgeSoft = Math.max(0, Math.min(1, (0.55 - paper) / 0.35));
    const alpha = Math.round(
      Math.min(230, 40 + inkAmount * 280) * edgeSoft * (a / 255)
    );

    data[i] = INK.r;
    data[i + 1] = INK.g;
    data[i + 2] = INK.b;
    data[i + 3] = alpha;
  }

  // Light blur of alpha only would need a second pass — skip for sharpness of strokes
  void width;
  void height;
  return image;
}

export async function prepareSignaturePng(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    bitmap.close();
    return file;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  processSignatureImageData(image);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.putImageData(image, 0, 0);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png")
  );
  if (!blob) return file;

  const base = file.name.replace(/\.[^.]+$/, "") || "signature";
  return new File([blob], `${base}-ink.png`, { type: "image/png" });
}

/** Live-render signature as ink on paper (fixes older sticker-like uploads). */
export async function renderSignatureAsInk(
  src: string
): Promise<string | null> {
  try {
    const img = await loadImage(src);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    processSignatureImageData(image);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.putImageData(image, 0, 0);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load signature"));
    img.src = src;
  });
}
