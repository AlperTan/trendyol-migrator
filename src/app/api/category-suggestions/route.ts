import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { suggestTrendyolCategories } from "@/core/category-suggestions";

export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get("productId");
  if (!productId) return NextResponse.json({ error: "productId is required" }, { status: 400 });
  const [product, categories] = await Promise.all([
    db.product.findUnique({ where: { id: productId } }),
    db.marketplaceCategoryCache.findMany({ where: { marketplace: "trendyol" }, select: { externalId: true, name: true } }),
  ]);
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  return NextResponse.json(suggestTrendyolCategories({
    title: product.titleEdited ?? product.titleSource,
    localCategoryName: product.categoryName ?? product.categorySource,
  }, categories));
}
