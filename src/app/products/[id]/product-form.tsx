"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Product = {
  id: string;
  titleSource: string;
  titleEdited: string | null;
  descriptionSource: string | null;
  descriptionEdited: string | null;
  salePriceSource: number | null;
  salePriceEdited: number | null;
  stock: number;
  currency: string;
  vatRateSource: number | null;
  vatRateEdited: number | null;
  brand: string | null;
  sku: string | null;
  barcode: string | null;
  categorySource: string | null;
  categoryName: string | null;
  localCategoryId: string | null;
  status: string;
};

type FormState = {
  titleEdited: string; descriptionEdited: string; salePriceEdited: string;
  stock: string; currency: string; vatRateEdited: string; brand: string;
  sku: string; barcode: string; categoryName: string; localCategoryId: string;
  status: string;
};

const inputClass = "mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-900";

export default function ProductForm({ product }: { product: Product }) {
  const router = useRouter();
  const initialForm = useMemo<FormState>(() => ({
    titleEdited: product.titleEdited ?? product.titleSource ?? "",
    descriptionEdited: product.descriptionEdited ?? product.descriptionSource ?? "",
    salePriceEdited: String(product.salePriceEdited ?? product.salePriceSource ?? ""),
    stock: String(product.stock ?? 0),
    currency: product.currency ?? "TRY",
    vatRateEdited: String(product.vatRateEdited ?? product.vatRateSource ?? ""),
    brand: product.brand ?? "",
    sku: product.sku ?? "",
    barcode: product.barcode ?? "",
    categoryName: product.categoryName ?? product.categorySource ?? "",
    localCategoryId: product.localCategoryId ?? "",
    status: product.status ?? "draft",
  }), [product]);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.titleEdited.trim()) return toast.error("Ürün adı zorunludur");
    setSaving(true);
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Ürün kaydedilemedi");
      toast.success("Ürün kaydedildi");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ürün kaydedilemedi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setForm(initialForm)} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700">Geri Al</button>
        <button disabled={saving} className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Kaydediliyor..." : "Kaydet"}</button>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="space-y-4 rounded-[26px] border border-gray-200 bg-gray-50 p-4">
          <h3 className="font-semibold text-gray-900">Ürün bilgileri</h3>
          <label className="block text-sm font-medium text-gray-800">Ürün adı<input className={inputClass} value={form.titleEdited} onChange={(e) => setField("titleEdited", e.target.value)} /></label>
          <label className="block text-sm font-medium text-gray-800">Açıklama<textarea rows={10} className={inputClass} value={form.descriptionEdited} onChange={(e) => setField("descriptionEdited", e.target.value)} /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-gray-800">Marka<input className={inputClass} value={form.brand} onChange={(e) => setField("brand", e.target.value)} /></label>
            <label className="text-sm font-medium text-gray-800">Kategori<input className={inputClass} value={form.categoryName} onChange={(e) => setField("categoryName", e.target.value)} /></label>
          </div>
          <label className="block text-sm font-medium text-gray-800">Yerel kategori ID<input className={inputClass} value={form.localCategoryId} onChange={(e) => setField("localCategoryId", e.target.value)} /></label>
        </section>
        <section className="space-y-4 rounded-[26px] border border-gray-200 bg-gray-50 p-4">
          <h3 className="font-semibold text-gray-900">Stok ve ticari bilgiler</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-gray-800">SKU<input className={inputClass} value={form.sku} onChange={(e) => setField("sku", e.target.value)} /></label>
            <label className="text-sm font-medium text-gray-800">Barkod<input className={inputClass} value={form.barcode} onChange={(e) => setField("barcode", e.target.value)} /></label>
            <label className="text-sm font-medium text-gray-800">Stok<input type="number" min="0" className={inputClass} value={form.stock} onChange={(e) => setField("stock", e.target.value)} /></label>
            <label className="text-sm font-medium text-gray-800">Fiyat<input type="number" min="0" step="0.01" className={inputClass} value={form.salePriceEdited} onChange={(e) => setField("salePriceEdited", e.target.value)} /></label>
            <label className="text-sm font-medium text-gray-800">Para birimi<input className={inputClass} value={form.currency} onChange={(e) => setField("currency", e.target.value.toUpperCase())} /></label>
            <label className="text-sm font-medium text-gray-800">KDV oranı<input type="number" min="0" step="0.01" className={inputClass} value={form.vatRateEdited} onChange={(e) => setField("vatRateEdited", e.target.value)} /></label>
          </div>
          <label className="block text-sm font-medium text-gray-800">Durum<select className={inputClass} value={form.status} onChange={(e) => setField("status", e.target.value)}><option value="draft">Taslak</option><option value="ready">Hazır</option><option value="exported">Dışa aktarıldı</option><option value="needs_review">İnceleme gerekli</option><option value="archived">Arşivlendi</option></select></label>
        </section>
      </div>
    </form>
  );
}
