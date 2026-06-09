import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildProductReadiness } from "@/lib/product-readiness";
import { logProductActivity, parseProductStatus } from "@/lib/product-activity";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  const product = await db.product.findUnique({
    where: { id },
    include: {
      images: {
        orderBy: {
          sortOrder: "asc",
        },
      },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });

  if (!product) {
    return NextResponse.json(
      { error: "Ürün bulunamadı" },
      { status: 404 }
    );
  }

  const [categoryMappings, categories, brands] = await Promise.all([
    db.categoryMapping.findMany({ where: { marketplace: "trendyol" } }),
    db.marketplaceCategoryCache.findMany({ where: { marketplace: "trendyol" }, select: { externalId: true, name: true } }),
    db.marketplaceBrandCache.findMany({ where: { marketplace: "trendyol" }, select: { externalId: true, name: true } }),
  ]);
  return NextResponse.json({
    ...product,
    readiness: buildProductReadiness(product, categoryMappings, { categories, brands }).readiness,
  });
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const body = await req.json();

  const current = await db.product.findUnique({ where: { id } });
  if (!current) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }
  const status = parseProductStatus(body.status);
  if (body.status != null && !status) {
    return NextResponse.json({ error: "Invalid product status" }, { status: 400 });
  }
  const updated = await db.product.update({
    where: { id },
    data: {
      titleEdited: body.titleEdited ?? null,
      descriptionEdited: body.descriptionEdited ?? null,
      salePriceEdited:
        body.salePriceEdited === "" || body.salePriceEdited == null
          ? null
          : Number(body.salePriceEdited),
      stock: Math.max(0, Math.trunc(Number(body.stock) || 0)),
      currency: body.currency?.trim() || "TRY",
      vatRateEdited:
        body.vatRateEdited === "" || body.vatRateEdited == null
          ? null
          : Number(body.vatRateEdited),
      brand: body.brand ?? null,
      sku: body.sku ?? null,
      barcode: body.barcode ?? null,
      categoryName: body.categoryName ?? null,
      localCategoryId: body.localCategoryId ?? null,
      status: status ?? current.status,
    },
  });
  await logProductActivity({
    productId: id,
    type: "product_edited",
    message:
      current.status !== updated.status
        ? `Product edited and status changed to ${updated.status}`
        : "Product edited",
    metadata: { previousStatus: current.status, status: updated.status },
  });

  return NextResponse.json(updated);
}
