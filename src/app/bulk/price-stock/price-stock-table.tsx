"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type Product = { id: string; title: string; sku: string | null; barcode: string | null; price: number | null; stock: number };
type Draft = { price: string; stock: string };
export default function PriceStockTable({ products }: { products: Product[] }) {
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => Object.fromEntries(products.map((p) => [p.id, { price: String(p.price ?? ""), stock: String(p.stock) }])));
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const visible = useMemo(() => products.filter((p) => [p.title, p.sku, p.barcode].some((value) => value?.toLowerCase().includes(search.toLowerCase()))), [products, search]);
  async function save() {
    setSaving(true);
    const changes = selected.map((productId) => ({ productId, price: drafts[productId].price === "" ? null : Number(drafts[productId].price), stock: Number(drafts[productId].stock) }));
    const response = await fetch("/api/products/bulk", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productIds: selected, action: "price-stock", changes }) });
    const data = await response.json(); setSaving(false);
    if (!response.ok) return toast.error(data?.error ?? "Değişiklikler kaydedilemedi");
    toast.success(`${data.updated} ürün kaydedildi`); setSelected([]);
  }
  return <section className="rounded-[28px] border bg-white shadow-sm"><div className="flex flex-col gap-3 border-b p-4 sm:flex-row"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ürün adı, stok kodu veya barkod ara" className="min-w-0 flex-1 rounded-xl border px-4 py-2 text-sm" /><button disabled={!selected.length || saving} onClick={() => void save()} className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{saving ? "Kaydediliyor..." : `Seçili Değişiklikleri Kaydet (${selected.length})`}</button><button disabled title="Pazaryeri eşitlemesi sonraki bir aşamada eklenecek" className="rounded-xl border px-4 py-2 text-sm text-gray-400">Daha Sonra Eşitle</button></div><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-gray-50 text-left"><tr><th className="p-4">Seç</th><th className="p-4">Ürün</th><th className="p-4">Stok Kodu / Barkod</th><th className="p-4">Fiyat</th><th className="p-4">Stok</th></tr></thead><tbody>{visible.map((product) => <tr key={product.id} className="border-t"><td className="p-4"><input type="checkbox" checked={selected.includes(product.id)} onChange={() => setSelected((current) => current.includes(product.id) ? current.filter((id) => id !== product.id) : [...current, product.id])} /></td><td className="p-4 font-medium"><Link href={`/products/${product.id}`} className="hover:underline">{product.title}</Link></td><td className="p-4 text-gray-600">{product.sku ?? "-"}<br />{product.barcode ?? "-"}</td><td className="p-4"><input type="number" min="0" step="0.01" value={drafts[product.id].price} onChange={(e) => setDrafts({ ...drafts, [product.id]: { ...drafts[product.id], price: e.target.value } })} className="w-28 rounded-xl border px-3 py-2" /></td><td className="p-4"><input type="number" min="0" step="1" value={drafts[product.id].stock} onChange={(e) => setDrafts({ ...drafts, [product.id]: { ...drafts[product.id], stock: e.target.value } })} className="w-24 rounded-xl border px-3 py-2" /></td></tr>)}</tbody></table></div></section>;
}
