import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fetchAllProducts } from "@/lib/trendyol";

function pickNumber(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function pickString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function normalizeImages(item: any): string[] {
  if (!Array.isArray(item?.images)) {
    return [];
  }

  const urls: string[] = [];

  for (const image of item.images) {
    if (typeof image === "string" && image.trim()) {
      urls.push(image);
      continue;
    }

    if (
      image &&
      typeof image === "object" &&
      typeof image.url === "string" &&
      image.url.trim()
    ) {
      urls.push(image.url);
    }
  }

  return Array.from(new Set(urls));
}

async function upsertItems(items: any[], forcedStatus?: string) {
  for (const item of items) {
    const salePrice = pickNumber(
      item.salePrice,
      item.discountedPrice,
      item.price
    );

    const listPrice = pickNumber(item.listPrice);

    const sourceStatus =
      forcedStatus ??
      (typeof item.archived === "boolean" && item.archived
        ? "archived"
        : typeof item.approved === "boolean"
          ? item.approved
            ? "approved"
            : "unapproved"
          : "unknown");

    const imageUrls = normalizeImages(item);

    const product = await db.product.upsert({
      where: {
        sourceProductId: String(item.id),
      },
      update: {
        sourceStatus,
        titleSource: item.title ?? "",
        descriptionSource: item.description ?? null,
        salePriceSource: salePrice,
        listPriceSource: listPrice,
        brand: pickString(item.brand, item.brandName),
        sku: pickString(item.stockCode, item.merchantSku),
        barcode: pickString(item.barcode),
        categorySource: pickString(item.categoryName, item.pimCategoryName),
        productMainId: pickString(item.productMainId),
      },
      create: {
        sourcePlatform: "trendyol",
        sourceProductId: String(item.id),
        sourceStatus,
        titleSource: item.title ?? "",
        descriptionSource: item.description ?? null,
        salePriceSource: salePrice,
        listPriceSource: listPrice,
        brand: pickString(item.brand, item.brandName),
        sku: pickString(item.stockCode, item.merchantSku),
        barcode: pickString(item.barcode),
        categorySource: pickString(item.categoryName, item.pimCategoryName),
        productMainId: pickString(item.productMainId),
        status: "draft",
      },
    });

    await db.productImage.deleteMany({
      where: {
        productId: product.id,
      },
    });

    if (imageUrls.length > 0) {
      await db.productImage.createMany({
        data: imageUrls.map((url, index) => ({
          productId: product.id,
          sourceUrl: url,
          localPath: null,
          downloadStatus: "remote",
          sortOrder: index + 1,
          isSelected: true,
        })),
      });
    }
  }
}

export async function POST(_: NextRequest) {
  try {
    const supplierId = process.env.TRENDYOL_SUPPLIER_ID;
    const apiKey = process.env.TRENDYOL_API_KEY;
    const apiSecret = process.env.TRENDYOL_API_SECRET;

    if (!supplierId || !apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "Trendyol env değişkenleri eksik" },
        { status: 500 }
      );
    }

    const normalItems = await fetchAllProducts({
      supplierId,
      apiKey,
      apiSecret,
      size: 100,
    });

    const archivedItems = await fetchAllProducts({
      supplierId,
      apiKey,
      apiSecret,
      size: 100,
      archived: true,
    });

    const blacklistedItems = await fetchAllProducts({
      supplierId,
      apiKey,
      apiSecret,
      size: 100,
      blacklisted: true,
    });

    await upsertItems(normalItems);
    await upsertItems(archivedItems, "archived");
    await upsertItems(blacklistedItems, "blacklisted");

    return NextResponse.json({
      imported:
        normalItems.length + archivedItems.length + blacklistedItems.length,
      normal: normalItems.length,
      archived: archivedItems.length,
      blacklisted: blacklistedItems.length,
    });
  } catch (error) {
    console.error("TRENDYOL IMPORT ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Bilinmeyen sunucu hatası",
      },
      { status: 500 }
    );
  }
}