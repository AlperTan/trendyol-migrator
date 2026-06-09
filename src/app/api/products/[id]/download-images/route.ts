import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import fs from "node:fs/promises";
import path from "node:path";
import { processProductImage } from "@/lib/image-processing";
import {
  getProductImagePublicPath,
  getProductStorageDir,
} from "@/lib/product-storage";
import { logProductActivity } from "@/lib/product-activity";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

function getOriginalExtension(url: string, contentType: string | null) {
  const fromContentType: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
  };
  if (contentType && fromContentType[contentType.split(";")[0]]) {
    return fromContentType[contentType.split(";")[0]];
  }

  try {
    const extension = path.extname(new URL(url).pathname).toLowerCase();
    return [".jpg", ".jpeg", ".png", ".webp"].includes(extension)
      ? extension
      : ".jpg";
  } catch {
    return ".jpg";
  }
}

export async function POST(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const product = await db.product.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Ürün bulunamadı" },
        { status: 404 }
      );
    }

    const baseDir = getProductStorageDir(product.id);
    await ensureDir(baseDir);

    let downloaded = 0;
    let processed = 0;
    let skipped = 0;
    const errors: Array<{ imageId: string; error: string }> = [];

    for (const image of product.images) {
      try {
        const res = await fetch(image.sourceUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const original = Buffer.from(await res.arrayBuffer());
        const result = await processProductImage(original);
        const extension =
          result.extension ??
          getOriginalExtension(image.sourceUrl, res.headers.get("content-type"));
        const filename = `${String(image.sortOrder).padStart(2, "0")}${extension}`;
        const relativePath = getProductImagePublicPath(product.id, filename);

        await fs.writeFile(path.join(baseDir, filename), result.buffer);
        await db.productImage.update({
          where: { id: image.id },
          data: { localPath: relativePath, downloadStatus: "downloaded" },
        });

        downloaded += 1;
        if (result.processed) processed += 1;
      } catch (error) {
        skipped += 1;
        errors.push({
          imageId: image.id,
          error: error instanceof Error ? error.message : "Unknown image error",
        });
      }
    }
    if (downloaded > 0) {
      await logProductActivity({
        productId: product.id,
        type: "image_processed",
        message: `${downloaded} image(s) downloaded and processed`,
        metadata: { downloaded, processed, skipped },
      });
    }

    return NextResponse.json({
      downloaded,
      processed,
      skipped,
      errors,
    });
  } catch (error) {
    console.error("DOWNLOAD IMAGES ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Bilinmeyen sunucu hatası",
      },
      { status: 500 }
    );
  }
}
