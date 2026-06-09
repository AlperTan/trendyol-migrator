"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import BulkProductActions from "@/components/bulk-product-actions";

type Product = { id: string; title: string; brand: string | null; category: string | null; sku: string | null };
export default function ReviewQueue({ products }: { products: Product[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  async function markReady() {
    const response = await fetch("/api/products/bulk", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productIds: selected, action: "status", value: "ready" }) });
    if (!response.ok) return toast.error("Ürünler hazır olarak işaretlenemedi");
    toast.success(`${selected.length} ürün hazır olarak işaretlendi`); setSelected([]); router.refresh();
  }
  return <section className="rounded-[28px] border bg-white shadow-sm"><div className="grid gap-3 border-b p-4 lg:grid-cols-[1fr_auto]"><BulkProductActions productIds={selected} onDone={() => router.refresh()} /><button disabled={!selected.length} onClick={() => void markReady()} className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Hazır Olarak İşaretle ({selected.length})</button></div><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-gray-50 text-left text-gray-500"><tr><th className="p-4">Seç</th><th className="p-4">Ürün</th><th className="p-4">Stok Kodu</th><th className="p-4">Marka</th><th className="p-4">Kategori</th></tr></thead><tbody>{products.map((product) => <tr key={product.id} className="border-t"><td className="p-4"><input type="checkbox" checked={selected.includes(product.id)} onChange={() => setSelected((current) => current.includes(product.id) ? current.filter((id) => id !== product.id) : [...current, product.id])} /></td><td className="p-4 font-medium"><Link href={`/products/${product.id}`} className="hover:underline">{product.title}</Link></td><td className="p-4">{product.sku ?? "-"}</td><td className="p-4">{product.brand ?? "-"}</td><td className="p-4">{product.category ?? "-"}</td></tr>)}</tbody></table></div></section>;
}
