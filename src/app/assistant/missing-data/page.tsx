import { PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { buildProductReadiness } from "@/lib/product-readiness";
import MissingDataClient from "./missing-data-client";
export default async function MissingDataPage() {
  const [products, mappings, categories, brands] = await Promise.all([db.product.findMany({ include: { images: true } }), db.categoryMapping.findMany({ where: { marketplace: "trendyol" } }), db.marketplaceCategoryCache.findMany({ where: { marketplace: "trendyol" }, select: { externalId: true, name: true } }), db.marketplaceBrandCache.findMany({ where: { marketplace: "trendyol" }, select: { externalId: true, name: true } })]);
  const blocked = products.map((product) => ({ product, readiness: buildProductReadiness(product, mappings, { categories, brands }).readiness.trendyol })).filter((i) => !i.readiness.ready).map(({ product, readiness }) => ({ id: product.id, title: product.titleEdited ?? product.titleSource, missingFields: readiness.missingFields, suggestions: { brandId: product.suggestedBrandId, brandConfidence: product.suggestedBrandConfidence, categoryId: product.suggestedCategoryId, categoryConfidence: product.suggestedCategoryConfidence } }));
  return <main className="px-4 py-8 md:px-8"><div className="mx-auto max-w-7xl space-y-6"><PageHeader title="Eksik Veri Asistanı" description={`${blocked.length} ürünün Trendyol dışa aktarımı için eksik bilgileri bulunuyor.`} /><MissingDataClient products={blocked} /></div></main>;
}
