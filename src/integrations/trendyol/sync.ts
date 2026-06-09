import { db } from "@/lib/db";
import { toInputJson } from "@/lib/marketplace-api";
import { matchBrand, suggestTrendyolCategories } from "@/core/category-suggestions";
import { trendyolRequest } from "./client";

type Item = Record<string, unknown>;

function rows(value: unknown, keys: string[]): Item[] {
  if (Array.isArray(value)) return value.filter((item): item is Item => Boolean(item) && typeof item === "object");
  if (!value || typeof value !== "object") return [];
  for (const key of keys) {
    const child = (value as Item)[key];
    if (Array.isArray(child)) return child.filter((item): item is Item => Boolean(item) && typeof item === "object");
  }
  return [];
}

function flattenCategories(items: Item[], parentId: string | null = null): Item[] {
  return items.flatMap((item) => {
    const id = string(item.id);
    const current = { ...item, parentId: item.parentId ?? parentId };
    const children = Array.isArray(item.subCategories)
      ? item.subCategories.filter((child): child is Item => Boolean(child) && typeof child === "object")
      : [];
    return [current, ...flattenCategories(children, id)];
  });
}

function string(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value) : null;
}

async function refreshSuggestions() {
  const [products, categories, brands] = await Promise.all([
    db.product.findMany({ select: { id: true, titleSource: true, titleEdited: true, categorySource: true, categoryName: true, brand: true, categoryId: true, brandId: true } }),
    db.marketplaceCategoryCache.findMany({ where: { marketplace: "trendyol" }, select: { externalId: true, name: true } }),
    db.marketplaceBrandCache.findMany({ where: { marketplace: "trendyol" }, select: { externalId: true, name: true } }),
  ]);
  for (const product of products) {
    const category = product.categoryId ? null : suggestTrendyolCategories({ title: product.titleEdited ?? product.titleSource, localCategoryName: product.categoryName ?? product.categorySource }, categories, 1)[0];
    const brand = product.brandId ? null : matchBrand(product.brand, brands);
    await db.product.update({
      where: { id: product.id },
      data: {
        suggestedCategoryId: category ? Number(category.externalId) || null : null,
        suggestedCategoryConfidence: category?.confidence ?? null,
        suggestedBrandId: brand ? Number(brand.externalId) || null : null,
        suggestedBrandConfidence: brand?.confidence ?? null,
      },
    });
  }
}

export async function syncTrendyolCategories() {
  const payload = await trendyolRequest<unknown>("GET", "/integration/product/product-categories");
  const categories = flattenCategories(rows(payload, ["categories", "content"]));
  for (const item of categories) {
    const externalId = string(item.id);
    const name = string(item.name);
    if (!externalId || !name) continue;
    await db.marketplaceCategoryCache.upsert({
      where: { marketplace_externalId: { marketplace: "trendyol", externalId } },
      update: { name, parentId: string(item.parentId), rawPayload: toInputJson(item) },
      create: { marketplace: "trendyol", externalId, name, parentId: string(item.parentId), rawPayload: toInputJson(item) },
    });
  }
  await refreshSuggestions();
  return { count: categories.length };
}

export async function syncTrendyolBrands() {
  const payload = await trendyolRequest<unknown>("GET", "/integration/product/brands");
  const brands = rows(payload, ["brands", "content"]);
  for (const item of brands) {
    const externalId = string(item.id);
    const name = string(item.name);
    if (!externalId || !name) continue;
    await db.marketplaceBrandCache.upsert({
      where: { marketplace_externalId: { marketplace: "trendyol", externalId } },
      update: { name, rawPayload: toInputJson(item) },
      create: { marketplace: "trendyol", externalId, name, rawPayload: toInputJson(item) },
    });
  }
  await refreshSuggestions();
  return { count: brands.length };
}

export async function syncTrendyolAttributes() {
  const categories = await db.marketplaceCategoryCache.findMany({ where: { marketplace: "trendyol" } });
  let count = 0;
  for (const category of categories) {
    const payload = await trendyolRequest<unknown>("GET", `/integration/product/product-categories/${encodeURIComponent(category.externalId)}/attributes`);
    const attributes = rows(payload, ["categoryAttributes", "attributes", "content"]);
    for (const item of attributes) {
      const externalId = string(item.attributeId ?? item.id);
      const name = string(item.attributeName ?? item.name);
      if (!externalId || !name) continue;
      await db.marketplaceAttributeCache.upsert({
        where: { marketplace_externalId_parentId: { marketplace: "trendyol", externalId, parentId: category.externalId } },
        update: { name, rawPayload: toInputJson(item) },
        create: { marketplace: "trendyol", externalId, name, parentId: category.externalId, rawPayload: toInputJson(item) },
      });
      count += 1;
    }
  }
  return { count };
}
