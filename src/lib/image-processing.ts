import sharp from "sharp";

export type CropWhiteMarginsOptions = {
  whiteThreshold?: number;
  padding?: number;
  jpegQuality?: number;
};

export type ImageProcessingResult = {
  buffer: Buffer;
  processed: boolean;
  extension: string | null;
};

function envNumber(name: string, fallback: number, min: number, max: number) {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed)
    ? Math.min(max, Math.max(min, Math.trunc(parsed)))
    : fallback;
}

export function isImageProcessingEnabled() {
  return process.env.IMAGE_CROP_WHITE_MARGINS?.toLowerCase() === "true";
}

export function getImageProcessingOptions(): Required<CropWhiteMarginsOptions> {
  return {
    whiteThreshold: envNumber("IMAGE_WHITE_THRESHOLD", 248, 0, 255),
    padding: envNumber("IMAGE_CROP_PADDING", 4, 0, 10_000),
    jpegQuality: envNumber("IMAGE_JPEG_QUALITY", 95, 1, 100),
  };
}

export async function cropWhiteMargins(
  buffer: Buffer,
  options: CropWhiteMarginsOptions = {}
) {
  const config = { ...getImageProcessingOptions(), ...options };
  const image = sharp(buffer, { failOn: "error" }).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

  const isWhiteRow = (y: number) => {
    for (let x = 0; x < info.width; x += 1) {
      const index = (y * info.width + x) * info.channels;
      const alpha = data[index + 3] / 255;
      const red = data[index] * alpha + 255 * (1 - alpha);
      const green = data[index + 1] * alpha + 255 * (1 - alpha);
      const blue = data[index + 2] * alpha + 255 * (1 - alpha);

      if (
        red < config.whiteThreshold ||
        green < config.whiteThreshold ||
        blue < config.whiteThreshold
      ) {
        return false;
      }
    }
    return true;
  };

  let top = 0;
  let bottom = info.height - 1;

  while (top < info.height && isWhiteRow(top)) top += 1;
  while (bottom >= top && isWhiteRow(bottom)) bottom -= 1;

  // A fully white/transparent image is retained at its original dimensions.
  if (top >= info.height || bottom < top) {
    top = 0;
    bottom = info.height - 1;
  } else {
    top = Math.max(0, top - config.padding);
    bottom = Math.min(info.height - 1, bottom + config.padding);
  }

  return sharp(buffer, { failOn: "error" })
    .extract({
      left: 0,
      top,
      width: info.width,
      height: bottom - top + 1,
    })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: config.jpegQuality })
    .toBuffer();
}

export async function processProductImage(
  buffer: Buffer
): Promise<ImageProcessingResult> {
  if (!isImageProcessingEnabled()) {
    return { buffer, processed: false, extension: null };
  }

  return {
    buffer: await cropWhiteMargins(buffer),
    processed: true,
    extension: ".jpg",
  };
}
