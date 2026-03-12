"use client";

import { useState } from "react";
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
  brand: string | null;
  sku: string | null;
  status: string;
};

export default function ProductForm({ product }: { product: Product }) {
  const router = useRouter();

  const [form, setForm] = useState({
    titleEdited: product.titleEdited ?? "",
    descriptionEdited: product.descriptionEdited ?? "",
    salePriceEdited:
      product.salePriceEdited != null ? String(product.salePriceEdited) : "",
    brand: product.brand ?? "",
    sku: product.sku ?? "",
    status: product.status ?? "draft",
  });

  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.error ?? "Kaydetme sırasında hata oluştu");
        setSaving(false);
        return;
      }

      toast.success("Ürün başarıyla kaydedildi");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Beklenmeyen bir hata oluştu");
    }

    setSaving(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="rounded-2xl border bg-gray-50 p-4">
        <label className="mb-2 block text-sm font-medium">Başlık</label>
        <input
          className="w-full rounded-xl border bg-white p-3 outline-none focus:border-black"
          value={form.titleEdited}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, titleEdited: e.target.value }))
          }
          placeholder={product.titleSource}
        />
      </div>

      <div className="rounded-2xl border bg-gray-50 p-4">
        <label className="mb-2 block text-sm font-medium">Açıklama</label>
        <textarea
          className="min-h-[220px] w-full rounded-xl border bg-white p-3 outline-none focus:border-black"
          value={form.descriptionEdited}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              descriptionEdited: e.target.value,
            }))
          }
          placeholder={product.descriptionSource ?? ""}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border bg-gray-50 p-4">
          <label className="mb-2 block text-sm font-medium">
            Düzenlenmiş Fiyat
          </label>
          <input
            type="number"
            step="0.01"
            className="w-full rounded-xl border bg-white p-3 outline-none focus:border-black"
            value={form.salePriceEdited}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                salePriceEdited: e.target.value,
              }))
            }
            placeholder={
              product.salePriceSource != null
                ? String(product.salePriceSource)
                : ""
            }
          />
        </div>

        <div className="rounded-2xl border bg-gray-50 p-4">
          <label className="mb-2 block text-sm font-medium">Durum</label>
          <select
            className="w-full rounded-xl border bg-white p-3 outline-none focus:border-black"
            value={form.status}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, status: e.target.value }))
            }
          >
            <option value="draft">draft</option>
            <option value="ready">ready</option>
            <option value="exported">exported</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border bg-gray-50 p-4">
          <label className="mb-2 block text-sm font-medium">Marka</label>
          <input
            className="w-full rounded-xl border bg-white p-3 outline-none focus:border-black"
            value={form.brand}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, brand: e.target.value }))
            }
          />
        </div>

        <div className="rounded-2xl border bg-gray-50 p-4">
          <label className="mb-2 block text-sm font-medium">SKU</label>
          <input
            className="w-full rounded-xl border bg-white p-3 outline-none focus:border-black"
            value={form.sku}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, sku: e.target.value }))
            }
          />
        </div>
      </div>

      <div className="flex items-center justify-end">
        <button
          type="submit"
          disabled={saving}
          className="rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Kaydediliyor..." : "Kaydet"}
        </button>
      </div>
    </form>
  );
}