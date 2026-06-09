"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
type Item = { id: string; titleSource: string; titleEdited: string | null; barcode: string | null; sku: string | null; sourceProductId: string | null };
type Pair = { pairKey: string; reasons: string[]; similarity: number; first: Item; second: Item };
const reasonLabels: Record<string, string> = { barcode: "barkod", SKU: "stok kodu", "source external ID": "kaynak ürün kimliği", "similar title": "benzer başlık" };
export default function DuplicateList({ pairs }: { pairs: Pair[] }) {
  const router = useRouter();
  async function dismiss(pairKey: string) {
    const response = await fetch("/api/duplicates/exclusions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pairKey }) });
    if (!response.ok) return toast.error("Eşleşme reddedilemedi");
    toast.success("Yinelenen ürün değil olarak işaretlendi"); router.refresh();
  }
  return <div className="space-y-4">{pairs.length ? pairs.map((pair) => <section key={pair.pairKey} className="rounded-[28px] border bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2">{pair.reasons.map((reason) => <span key={reason} className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">{reasonLabels[reason] ?? reason}</span>)}</div><div className="flex gap-2"><button disabled title="Birleştirme sonraki bir aşamada eklenecek" className="rounded-xl border px-4 py-2 text-sm text-gray-400">Daha Sonra Birleştir</button><button onClick={() => void dismiss(pair.pairKey)} className="rounded-xl border px-4 py-2 text-sm font-medium">Yinelenen Değil</button></div></div><div className="mt-4 grid gap-4 md:grid-cols-2"><ProductCard item={pair.first} /><ProductCard item={pair.second} /></div></section>) : <section className="rounded-[28px] border bg-white p-8 text-center text-sm text-gray-500">Olası yinelenen ürün bulunamadı.</section>}</div>;
}
function ProductCard({ item }: { item: Item }) { return <Link href={`/products/${item.id}`} className="rounded-2xl bg-gray-50 p-4 hover:bg-gray-100"><div className="font-semibold">{item.titleEdited ?? item.titleSource}</div><div className="mt-2 text-xs text-gray-500">Stok Kodu: {item.sku ?? "-"} · Barkod: {item.barcode ?? "-"} · Kaynak Kimliği: {item.sourceProductId ?? "-"}</div></Link>; }
