import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import {
  fetchAllProducts,
  fetchCategoryIdsByBarcodes,
  fetchProductBaseInfoByBarcode,
  type TrendyolProductRecord,
} from "@/lib/trendyol";
import { logProductActivity } from "@/lib/product-activity";

function pickNumber(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function pickInteger(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return Math.trunc(value);
    }

    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return Math.trunc(parsed);
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

function isRecord(value: unknown): value is TrendyolProductRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeImages(item: TrendyolProductRecord): string[] {
  if (!Array.isArray(item.images)) {
    return [];
  }

  const urls: string[] = [];

  for (const image of item.images) {
    if (typeof image === "string" && image.trim()) {
      urls.push(image.trim());
      continue;
    }

    if (
      isRecord(image) &&
      typeof image.url === "string" &&
      image.url.trim()
    ) {
      urls.push(image.url.trim());
    }
  }

  return Array.from(new Set(urls));
}

function pickDeliveryDuration(item: TrendyolProductRecord): number | null {
  const deliveryOption = isRecord(item.deliveryOption)
    ? item.deliveryOption
    : null;
  return pickInteger(
    item.deliveryDuration,
    deliveryOption?.deliveryDuration
  );
}

function mergeMissingFields(
  item: TrendyolProductRecord,
  baseInfo: TrendyolProductRecord | null
): TrendyolProductRecord {
  if (!baseInfo) return item;

  return {
    ...item,
    contentId: item?.contentId ?? baseInfo?.contentId ?? null,
    title: item?.title ?? baseInfo?.title ?? null,
    description: item?.description ?? baseInfo?.description ?? null,
    brandId: item?.brandId ?? baseInfo?.brandId ?? null,
    categoryId: item?.categoryId ?? baseInfo?.categoryId ?? null,
    vatRate: item?.vatRate ?? baseInfo?.vatRate ?? null,
    productMainId: item?.productMainId ?? baseInfo?.productMainId ?? null,
    cargoCompanyId: item?.cargoCompanyId ?? baseInfo?.cargoCompanyId ?? null,
    shipmentAddressId:
      item?.shipmentAddressId ?? baseInfo?.shipmentAddressId ?? null,
    returningAddressId:
      item?.returningAddressId ?? baseInfo?.returningAddressId ?? null,
    brand: item?.brand ?? item?.brandName ?? baseInfo?.brand ?? null,
    brandName: item?.brandName ?? baseInfo?.brand ?? null,
    categoryName:
      item?.categoryName ?? item?.pimCategoryName ?? baseInfo?.categoryName ?? null,
  };
}

async function enrichByBarcode(item: TrendyolProductRecord) {
  const barcode = pickString(item.barcode);
  if (!barcode) {
    return item;
  }

  try {
    const baseInfo = await fetchProductBaseInfoByBarcode(barcode);
    return mergeMissingFields(item, baseInfo);
  } catch (error) {
    console.warn("BASE INFO FETCH FAILED", {
      barcode,
      error: error instanceof Error ? error.message : error,
    });
    return item;
  }
}

async function upsertItems(items: TrendyolProductRecord[], forcedStatus?: string) {
  const enrichedItems = await Promise.all(items.map((item) => enrichByBarcode(item)));

  const barcodes = enrichedItems
    .map((item) => pickString(item?.barcode))
    .filter((value): value is string => Boolean(value));

  const categoryLookup = await fetchCategoryIdsByBarcodes(barcodes);
  const barcodeCategories = categoryLookup?.barcodeCategories ?? {};

  for (const rawItem of enrichedItems) {
    const barcode = pickString(rawItem?.barcode);

    const fallbackCategoryId =
      barcode && barcodeCategories[barcode]?.id != null
        ? Number(barcodeCategories[barcode].id)
        : null;

    const item: TrendyolProductRecord = {
      ...rawItem,
      categoryId: rawItem?.categoryId ?? fallbackCategoryId,
      categoryName:
        rawItem?.categoryName ??
        rawItem?.pimCategoryName ??
        (barcode ? barcodeCategories[barcode]?.displayName ?? null : null),
    };

    const salePrice = pickNumber(
      item?.salePrice,
      item?.discountedPrice,
      item?.price
    );

    const listPrice = pickNumber(item?.listPrice);

    const sourceStatus =
      forcedStatus ??
      (typeof item?.archived === "boolean" && item.archived
        ? "archived"
        : typeof item?.approved === "boolean"
        ? item.approved
          ? "approved"
          : "unapproved"
        : "unknown");

    const imageUrls = normalizeImages(item);
    const deliveryDuration = pickDeliveryDuration(item);

    const contentId = pickString(item?.contentId);
    const titleSource = pickString(item.title) ?? "";
    const descriptionSource = pickString(item.description);
    const brand = pickString(item?.brand, item?.brandName);
    const brandId = pickInteger(item?.brandId);
    const categorySource = pickString(item?.categoryName, item?.pimCategoryName);
    const categoryId = pickInteger(item?.categoryId);
    const vatRateSource = pickNumber(item?.vatRate);
    const productMainId = pickString(item?.productMainId);
    const cargoCompanyId = pickInteger(item?.cargoCompanyId);
    const shipmentAddressId = pickInteger(item?.shipmentAddressId);
    const returningAddressId = pickInteger(item?.returningAddressId);

    console.log("IMPORT ITEM SAMPLE", {
      id: item?.id,
      contentId,
      barcode,
      title: titleSource,
      brandId,
      categoryId,
      vatRateSource,
      productMainId,
      deliveryDuration,
    });

    const existingProduct = await db.product.findUnique({
      where: { sourceProductId: String(item?.id) },
      select: { id: true },
    });
    const product = await db.product.upsert({
      where: {
        sourceProductId: String(item?.id),
      },
      update: {
        sourceStatus,
        contentId,
        titleSource,
        descriptionSource,
        salePriceSource: salePrice,
        listPriceSource: listPrice,
        deliveryDurationSource: deliveryDuration,
        deliveryDurationEdited: deliveryDuration,
        vatRateSource,
        brand,
        brandId,
        sku: pickString(item?.stockCode, item?.merchantSku),
        barcode,
        categorySource,
        categoryId,
        productMainId,
        cargoCompanyId,
        shipmentAddressId,
        returningAddressId,
      },
      create: {
        sourcePlatform: "trendyol",
        sourceProductId: String(item?.id),
        contentId,
        sourceStatus,
        titleSource,
        descriptionSource,
        salePriceSource: salePrice,
        listPriceSource: listPrice,
        deliveryDurationSource: deliveryDuration,
        deliveryDurationEdited: deliveryDuration,
        vatRateSource,
        brand,
        brandId,
        sku: pickString(item?.stockCode, item?.merchantSku),
        barcode,
        categorySource,
        categoryId,
        productMainId,
        cargoCompanyId,
        shipmentAddressId,
        returningAddressId,
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
    await logProductActivity({
      productId: product.id,
      type: existingProduct ? "product_edited" : "product_created",
      message: existingProduct ? "Product updated from Trendyol import" : "Product created from Trendyol import",
      metadata: { sourcePlatform: "trendyol" },
    });
  }
}

export async function POST() {
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
      imported: normalItems.length + archivedItems.length + blacklistedItems.length,
      normal: normalItems.length,
      archived: archivedItems.length,
      blacklisted: blacklistedItems.length,
    });
  } catch (error) {
    console.error("TRENDYOL IMPORT ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Bilinmeyen sunucu hatası",
      },
      { status: 500 }
    );
  }
}
