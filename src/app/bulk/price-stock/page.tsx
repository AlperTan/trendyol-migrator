import { PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import PriceStockTable from "./price-stock-table";
export const dynamic = "force-dynamic";
export default async function PriceStockPage() {
  const products = await db.product.findMany({ orderBy: { titleSource: "asc" }, select: { id: true, titleSource: true, titleEdited: true, sku: true, barcode: true, salePriceSource: true, salePriceEdited: true, stock: true } });
  return <main className="px-4 py-8 md:px-8"><div className="mx-auto max-w-7xl space-y-6"><PageHeader title="Toplu Fiyat ve Stok" description="Yerel fiyat ve stok değerlerini düzenleyin, yalnızca seçtiğiniz değişiklikleri kaydedin." /><PriceStockTable products={products.map((p) => ({ ...p, title: p.titleEdited ?? p.titleSource, price: p.salePriceEdited ?? p.salePriceSource }))} /></div></main>;
}
