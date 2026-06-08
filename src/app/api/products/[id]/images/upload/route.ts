import fs from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import {
  getProductImagePublicPath,
  getProductStorageDir,
} from "@/lib/product-storage";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function safeBaseName(filename: string) {
  return path
    .basename(filename, path.extname(filename))
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "image";
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id: productId } = await context.params;
    const product = await db.product.findUnique({
      where: { id: productId },
      include: { images: { orderBy: { sortOrder: "desc" }, take: 1 } },
    });

    if (!product) {
      return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });
    }

    const formData = await req.formData();
    const files = formData
      .getAll("files")
      .filter((item): item is File => item instanceof File && item.size > 0);

    if (files.length === 0) {
      return NextResponse.json({ error: "En az bir görsel seçin" }, { status: 400 });
    }

    const invalid = files.find((file) => !ALLOWED_TYPES.has(file.type));
    if (invalid) {
      return NextResponse.json(
        { error: `${invalid.name}: yalnızca JPG, PNG ve WebP yüklenebilir` },
        { status: 400 }
      );
    }

    const productDir = getProductStorageDir(productId);
    await fs.mkdir(productDir, { recursive: true });

    let sortOrder = product.images[0]?.sortOrder ?? 0;
    const created = [];

    for (const file of files) {
      sortOrder += 1;
      const extension = path.extname(file.name).toLowerCase() || ".jpg";
      const filename = `${Date.now()}-${sortOrder}-${safeBaseName(file.name)}${extension}`;
      const publicPath = getProductImagePublicPath(productId, filename);

      await fs.writeFile(path.join(productDir, filename), Buffer.from(await file.arrayBuffer()));
      created.push(
        await db.productImage.create({
          data: {
            productId,
            sourceUrl: publicPath,
            localPath: publicPath,
            downloadStatus: "uploaded",
            sortOrder,
            isSelected: true,
          },
        })
      );
    }

    return NextResponse.json({ images: created }, { status: 201 });
  } catch (error) {
    console.error("UPLOAD PRODUCT IMAGES ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Görseller yüklenemedi" },
      { status: 500 }
    );
  }
}
