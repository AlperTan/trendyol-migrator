import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { errorResponseMessage } from "@/lib/marketplace-api";
import { syncShopifyProductTypes } from "@/integrations/shopify/sync";
import { syncTrendyolAttributes, syncTrendyolBrands, syncTrendyolCategories } from "@/integrations/trendyol/sync";

export async function GET(req: NextRequest) {
  const [categories, brands, attributes] = await Promise.all([
    db.marketplaceCategoryCache.groupBy({ by: ["marketplace"], _count: true, _max: { updatedAt: true } }),
    db.marketplaceBrandCache.groupBy({ by: ["marketplace"], _count: true, _max: { updatedAt: true } }),
    db.marketplaceAttributeCache.groupBy({ by: ["marketplace"], _count: true, _max: { updatedAt: true } }),
  ]);
  const includeRecords = req.nextUrl.searchParams.get("records") === "1";
  return NextResponse.json({
    categories, brands, attributes,
    ...(includeRecords ? {
      categoryRecords: await db.marketplaceCategoryCache.findMany({ where: { marketplace: "trendyol" }, orderBy: { name: "asc" } }),
      brandRecords: await db.marketplaceBrandCache.findMany({ where: { marketplace: "trendyol" }, orderBy: { name: "asc" } }),
    } : {}),
  });
}

export async function POST(req: NextRequest) {
  try {
    const { action } = await req.json();
    if (action === "trendyol-categories") return NextResponse.json(await syncTrendyolCategories());
    if (action === "trendyol-brands") return NextResponse.json(await syncTrendyolBrands());
    if (action === "trendyol-attributes") return NextResponse.json(await syncTrendyolAttributes());
    if (action === "shopify-product-types") return NextResponse.json(await syncShopifyProductTypes());
    return NextResponse.json({ error: "Unknown sync action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: errorResponseMessage(error) }, { status: 500 });
  }
}
