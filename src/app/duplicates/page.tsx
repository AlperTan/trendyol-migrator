import { PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { detectDuplicatePairs } from "@/lib/duplicates";
import DuplicateList from "./duplicate-list";
export const dynamic = "force-dynamic";
export default async function DuplicatesPage() {
  const [products, exclusions] = await Promise.all([db.product.findMany({ select: { id: true, titleSource: true, titleEdited: true, barcode: true, sku: true, sourceProductId: true } }), db.duplicateExclusion.findMany({ select: { pairKey: true } })]);
  const pairs = detectDuplicatePairs(products, new Set(exclusions.map((i) => i.pairKey)));
  return <main className="px-4 py-8 md:px-8"><div className="mx-auto max-w-7xl space-y-6"><PageHeader title="Yinelenen Ürünler" description={`Barkod, stok kodu, kaynak ürün kimliği veya benzer başlığa göre ${pairs.length} olası eşleşme bulundu.`} /><DuplicateList pairs={pairs} /></div></main>;
}
