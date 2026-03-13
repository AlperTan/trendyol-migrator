import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import {
  getBatchRequestResult,
  updateDeliveryDurationsLegacy,
} from "@/lib/trendyol";

type DeliveryUpdateItem = {
  productId: string;
  deliveryDuration: number;
};

function normalizeItems(input: unknown): DeliveryUpdateItem[] {
  if (!Array.isArray(input)) {
    throw new Error("items array olmalı.");
  }

  const normalized: DeliveryUpdateItem[] = [];

  for (const row of input) {
    const productId =
      typeof row?.productId === "string" ? row.productId.trim() : "";

    const rawDuration = row?.deliveryDuration;
    const deliveryDuration =
      typeof rawDuration === "number"
        ? rawDuration
        : Number(rawDuration);

    if (!productId) {
      throw new Error("Tüm satırlarda productId zorunlu.");
    }

    if (!Number.isFinite(deliveryDuration) || deliveryDuration < 1) {
      throw new Error(`Geçersiz deliveryDuration: ${productId}`);
    }

    normalized.push({
      productId,
      deliveryDuration: Math.trunc(deliveryDuration),
    });
  }

  return normalized;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items = normalizeItems(body?.items);

    const products = await db.product.findMany({
      where: {
        id: {
          in: items.map((item) => item.productId),
        },
      },
      select: {
        id: true,
        barcode: true,
        titleEdited: true,
        titleSource: true,
        descriptionEdited: true,
        descriptionSource: true,
        brandId: true,
        categoryId: true,
        productMainId: true,
        vatRateSource: true,
        cargoCompanyId: true,
        shipmentAddressId: true,
        returningAddressId: true,
      },
    });

    const byId = new Map(products.map((product) => [product.id, product]));

    const payloadItems = items.map((item) => {
      const product = byId.get(item.productId);

      if (!product) {
        throw new Error(`Ürün bulunamadı: ${item.productId}`);
      }

      if (!product.barcode?.trim()) {
        throw new Error(`barcode eksik: ${item.productId}`);
      }

      const title = (product.titleEdited ?? product.titleSource ?? "").trim();
      const description = (
        product.descriptionEdited ??
        product.descriptionSource ??
        ""
      ).trim();

      if (!title) {
        throw new Error(`title eksik: ${product.barcode}`);
      }

      if (!description) {
        throw new Error(`description eksik: ${product.barcode}`);
      }

      if (!Number.isFinite(product.brandId)) {
        throw new Error(`brandId eksik: ${product.barcode}`);
      }

      if (!Number.isFinite(product.categoryId)) {
        throw new Error(`categoryId eksik: ${product.barcode}`);
      }

      if (!product.productMainId?.trim()) {
        throw new Error(`productMainId eksik: ${product.barcode}`);
      }

      if (!Number.isFinite(product.vatRateSource)) {
        throw new Error(`vatRate eksik: ${product.barcode}`);
      }

      return {
        barcode: product.barcode.trim(),
        title,
        description,
        brandId: product.brandId as number,
        categoryId: product.categoryId as number,
        productMainId: product.productMainId.trim(),
        vatRate: product.vatRateSource as number,
        deliveryDuration: item.deliveryDuration,
        cargoCompanyId: product.cargoCompanyId,
        shipmentAddressId: product.shipmentAddressId,
        returningAddressId: product.returningAddressId,
      };
    });

    const result = await updateDeliveryDurationsLegacy(payloadItems);

    return NextResponse.json(result);
  } catch (error) {
    console.error("DELIVERY DURATION UPDATE ERROR:", error);

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

export async function GET(req: NextRequest) {
  try {
    const batchRequestId = req.nextUrl.searchParams.get("batchRequestId");

    if (!batchRequestId) {
      return NextResponse.json(
        { error: "batchRequestId zorunlu" },
        { status: 400 }
      );
    }

    const result = await getBatchRequestResult(batchRequestId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("DELIVERY DURATION BATCH RESULT ERROR:", error);

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