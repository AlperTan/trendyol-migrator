import type { CategoryMapping, Product, ProductImage } from "@prisma/client";

import { buildNormalizedProduct } from "@/core/normalized-product";
import { getMarketplaceReadiness } from "@/core/readiness";
import { matchBrand, suggestTrendyolCategories } from "@/core/category-suggestions";

type ProductForReadiness = Product & { images: ProductImage[] };

function requiredAttributes(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return Object.entries(value);
  return [];
}

export function buildProductReadiness(
  product: ProductForReadiness,
  categoryMappings: CategoryMapping[] = [],
  cache: {
    categories?: Array<{ externalId: string; name: string }>;
    brands?: Array<{ externalId: string; name: string }>;
  } = {}
) {
  const normalized = buildNormalizedProduct(product);
  const mapping = categoryMappings.find(
    (item) =>
      item.marketplace === "trendyol" &&
      ((normalized.localCategoryId && item.localCategoryId === normalized.localCategoryId) ||
        (normalized.categoryName && item.localCategoryName === normalized.categoryName))
  );
  const trendyol = normalized.marketplaceData.trendyol;
  if (trendyol && !trendyol.brandId) {
    const brand = matchBrand(normalized.brand, cache.brands ?? []);
    if (brand?.confidence === 1) trendyol.brandId = Number(brand.externalId) || null;
  }
  if (trendyol && !trendyol.categoryId) {
    const category = suggestTrendyolCategories(
      { title: normalized.title, localCategoryName: normalized.categoryName },
      cache.categories ?? [],
      1
    )[0];
    if (category?.confidence >= 0.75) {
      trendyol.categoryId = Number(category.externalId) || null;
    }
  }
  if (mapping && trendyol) {
    const targetCategoryId = Number(mapping.targetCategoryId);
    if (!trendyol.categoryId && Number.isInteger(targetCategoryId)) {
      trendyol.categoryId = targetCategoryId;
    }
    trendyol.requiredAttributes = requiredAttributes(mapping.requiredAttributesJson);
  }
  return { normalized, readiness: getMarketplaceReadiness(normalized) };
}
