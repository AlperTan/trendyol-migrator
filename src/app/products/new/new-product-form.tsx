"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const fields = [
  ["title", "Ürün adı", "text"], ["brand", "Marka", "text"],
  ["sku", "SKU", "text"], ["barcode", "Barkod", "text"],
  ["stock", "Stok", "number"], ["price", "Fiyat", "number"],
  ["currency", "Para birimi", "text"], ["vatRate", "KDV oranı", "number"],
  ["categoryName", "Kategori", "text"], ["localCategoryId", "Yerel kategori ID", "text"],
] as const;

export default function NewProductForm() {
  const router = useRouter();
  const [form, setForm] = useState<Record<string, string>>({ currency: "TRY", stock: "0", status: "draft" });
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Ürün oluşturulamadı");
      toast.success("Ürün oluşturuldu");
      router.push(`/products/${data.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ürün oluşturulamadı");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map(([name, label, type]) => <label key={name} className="text-sm font-medium text-gray-800">{label}<input required={name === "title"} type={type} min={type === "number" ? "0" : undefined} step={name === "price" || name === "vatRate" ? "0.01" : undefined} value={form[name] ?? ""} onChange={(e) => setForm((current) => ({ ...current, [name]: e.target.value }))} className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-gray-900" /></label>)}
      </div>
      <label className="block text-sm font-medium text-gray-800">Açıklama<textarea rows={8} value={form.description ?? ""} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-gray-900" /></label>
      <button disabled={saving} className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Oluşturuluyor..." : "Ürünü oluştur"}</button>
    </form>
  );
}
