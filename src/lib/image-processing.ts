// src/lib/image-processing.ts
import sharp from "sharp";

export async function cropWhiteMargins(buffer: Buffer) {
  const img = sharp(buffer).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });

  const isWhiteRow = (y: number) => {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * info.channels;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      if (r < 248 || g < 248 || b < 248) return false;
    }
    return true;
  };

  let top = 0;
  let bottom = info.height - 1;

  while (top < info.height && isWhiteRow(top)) top++;
  while (bottom > top && isWhiteRow(bottom)) bottom--;

  const padding = 4;
  top = Math.max(0, top - padding);
  bottom = Math.min(info.height - 1, bottom + padding);

  if (bottom <= top) return buffer;

  return sharp(buffer)
    .extract({
      left: 0,
      top,
      width: info.width,
      height: bottom - top + 1,
    })
    .jpeg({ quality: 95 })
    .toBuffer();
}