import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import fs from "node:fs/promises";
import path from "node:path";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

function getFileExtensionFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const ext = path.extname(pathname);
    return ext || ".jpg";
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

    const baseDir = path.join(process.cwd(), "storage", "products", product.id);
    await ensureDir(baseDir);

    let downloaded = 0;

    for (const image of product.images) {
      const res = await fetch(image.sourceUrl);

      if (!res.ok) {
        continue;
      }

      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const ext = getFileExtensionFromUrl(image.sourceUrl);
      const filename = `${String(image.sortOrder).padStart(2, "0")}${ext}`;
      const fullPath = path.join(baseDir, filename);

      await fs.writeFile(fullPath, buffer);

      const relativePath = path
        .join("storage", "products", product.id, filename)
        .replaceAll("\\", "/");

      await db.productImage.update({
        where: { id: image.id },
        data: {
          localPath: relativePath,
          downloadStatus: "downloaded",
        },
      });

      downloaded += 1;
    }

    return NextResponse.json({
      downloaded,
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