import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type ImageUpdateItem = {
  id: string;
  sortOrder: number;
  isSelected: boolean;
};

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id: productId } = await context.params;
    const body = await req.json();

    const images = Array.isArray(body?.images) ? body.images : [];

    const product = await db.product.findUnique({
      where: { id: productId },
      include: { images: true },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Ürün bulunamadı" },
        { status: 404 }
      );
    }

    const existingIds = new Set(product.images.map((img) => img.id));

    for (const image of images as ImageUpdateItem[]) {
      if (!existingIds.has(image.id)) {
        continue;
      }

      await db.productImage.update({
        where: { id: image.id },
        data: {
          sortOrder: image.sortOrder,
          isSelected: image.isSelected,
        },
      });
    }

    const updated = await db.product.findUnique({
      where: { id: productId },
      include: {
        images: {
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("UPDATE IMAGES ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Bilinmeyen sunucu hatası",
      },
      { status: 500 }
    );
  }
}