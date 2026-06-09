"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Option = { id: string; name: string; externalId?: string };
export default function BulkProductActions({ productIds, onDone }: { productIds: string[]; onDone?: () => void }) {
  const [action, setAction] = useState("template"); const [value, setValue] = useState(""); const [templates, setTemplates] = useState<Option[]>([]); const [categories, setCategories] = useState<Option[]>([]); const [brands, setBrands] = useState<Option[]>([]); const [saving, setSaving] = useState(false);
  useEffect(() => { void Promise.all([fetch("/api/product-templates").then((r) => r.json()), fetch("/api/marketplace-data?records=1").then((r) => r.json())]).then(([t, m]) => { setTemplates(t); setCategories(m.categoryRecords ?? []); setBrands(m.brandRecords ?? []); }); }, []);
  const options = action === "template" ? templates : action === "category" ? categories : action === "brand" ? brands : [];
  async function apply() {
    if (!productIds.length || !value) return toast.error("Ürünleri ve uygulanacak değeri seçin");
    setSaving(true); try { const response = await fetch("/api/products/bulk", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productIds, action, value: options.length ? (options.find((item) => item.id === value)?.externalId ?? value) : value }) }); const data = await response.json(); if (!response.ok) throw new Error(data?.error ?? "Toplu güncelleme başarısız"); toast.success(`${data.updated} ürün güncellendi`); onDone?.(); } catch (error) { toast.error(error instanceof Error ? error.message : "Toplu güncelleme başarısız"); } finally { setSaving(false); }
  }
  return <div className="grid gap-2 sm:grid-cols-[180px_1fr_auto]"><select value={action} onChange={(e) => { setAction(e.target.value); setValue(""); }} className="rounded-xl border bg-white px-3 py-2 text-sm"><option value="template">Şablon Uygula</option><option value="category">Kategori Ata</option><option value="brand">Marka Ata</option><option value="vat">KDV Ata</option><option value="cargo">Kargo Firması Ata</option></select>{options.length ? <select value={value} onChange={(e) => setValue(e.target.value)} className="rounded-xl border bg-white px-3 py-2 text-sm"><option value="">Seçin...</option>{options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select> : <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Değer" className="rounded-xl border bg-white px-3 py-2 text-sm" />}<button onClick={() => void apply()} disabled={saving || !productIds.length} className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Uygula ({productIds.length})</button></div>;
}
