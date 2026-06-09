import { PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import ReviewQueue from "./review-queue";
export const dynamic = "force-dynamic";
export default async function ReviewPage() {
  const products = await db.product.findMany({ where: { status: "needs_review" }, orderBy: { updatedAt: "desc" }, select: { id: true, titleSource: true, titleEdited: true, brand: true, categoryName: true, categorySource: true, sku: true } });
  return <main className="px-4 py-8 md:px-8"><div className="mx-auto max-w-7xl space-y-6"><PageHeader title="İnceleme Kuyruğu" description={`${products.length} ürün incelenmeyi bekliyor. Ürünleri seçip hızlı işlemleri uygulayın.`} /><ReviewQueue products={products.map((p) => ({ ...p, title: p.titleEdited ?? p.titleSource, category: p.categoryName ?? p.categorySource }))} /></div></main>;
}
