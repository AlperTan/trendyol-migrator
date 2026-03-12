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
  brand: string | null;
  sku: string | null;
  status: string;
};

type FormState = {
  titleEdited: string;
  descriptionEdited: string;
  salePriceEdited: string;
  brand: string;
  sku: string;
  status: string;
};

function formatPrice(value: number | null) {
  if (value == null) return "-";

  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim();
}

export default function ProductForm({ product }: { product: Product }) {
  const router = useRouter();

  const initialForm = useMemo<FormState>(
    () => ({
      titleEdited: product.titleEdited ?? "",
      descriptionEdited: product.descriptionEdited ?? "",
      salePriceEdited:
        product.salePriceEdited != null ? String(product.salePriceEdited) : "",
      brand: product.brand ?? "",
      sku: product.sku ?? "",
      status: product.status ?? "draft",
    }),
    [product]
  );

  const [form, setForm] = useState<FormState>(initialForm);
  const [saving, setSaving] = useState(false);

  const dirty =
    normalizeText(form.titleEdited) !==
      normalizeText(product.titleEdited ?? "") ||
    normalizeText(form.descriptionEdited) !==
      normalizeText(product.descriptionEdited ?? "") ||
    normalizeText(form.salePriceEdited) !==
      normalizeText(
        product.salePriceEdited != null ? String(product.salePriceEdited) : ""
      ) ||
    normalizeText(form.brand) !== normalizeText(product.brand ?? "") ||
    normalizeText(form.sku) !== normalizeText(product.sku ?? "") ||
    normalizeText(form.status) !== normalizeText(product.status ?? "draft");

  const parsedEditedPrice =
    normalizeText(form.salePriceEdited) === ""
      ? null
      : Number(form.salePriceEdited);

  const priceDelta =
    parsedEditedPrice != null && product.salePriceSource != null
      ? parsedEditedPrice - product.salePriceSource
      : null;

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function resetAll() {
    setForm(initialForm);
    toast.success("Form son kayıtlı haline döndürüldü");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        ...form,
        titleEdited: form.titleEdited.trim(),
        descriptionEdited: form.descriptionEdited.trim(),
        brand: form.brand.trim(),
        sku: form.sku.trim(),
        salePriceEdited: form.salePriceEdited.trim(),
      };

      const res = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
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
    <form onSubmit={onSubmit} className="space-y-5">
      <section className="rounded-[26px] border border-gray-200 bg-gray-50 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
              Düzenleme Özeti
            </p>
            <h3 className="mt-1 text-base font-semibold text-gray-900">
              Tam genişlikte edit deneyimi
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-2 text-xs font-semibold ${
                dirty
                  ? "bg-amber-50 text-amber-700"
                  : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {dirty ? "Kaydedilmemiş değişiklik var" : "Tüm değişiklikler kayıtlı"}
            </span>

            <button
              type="button"
              onClick={resetAll}
              disabled={saving || !dirty}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Geri Al
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="space-y-5">
          <section className="rounded-[26px] border border-gray-200 bg-white p-4">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
                Başlık
              </p>
              <h3 className="mt-1 text-base font-semibold text-gray-900">
                Ürün adı düzenleme
              </h3>
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                  Kaynak başlık
                </div>
                <p className="mt-2 text-sm leading-6 text-gray-700">
                  {product.titleSource || "-"}
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-800">
                  Düzenlenmiş başlık
                </label>
                <textarea
                  rows={4}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-gray-900"
                  value={form.titleEdited}
                  onChange={(e) => setField("titleEdited", e.target.value)}
                  placeholder={product.titleSource}
                />
              </div>
            </div>
          </section>

          <section className="rounded-[26px] border border-gray-200 bg-white p-4">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
                Açıklama
              </p>
              <h3 className="mt-1 text-base font-semibold text-gray-900">
                İçerik düzenleme
              </h3>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                  Kaynak açıklama
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                  {product.descriptionSource || "Kaynak açıklama yok"}
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-800">
                  Düzenlenmiş açıklama
                </label>
                <textarea
                  rows={12}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-gray-900"
                  value={form.descriptionEdited}
                  onChange={(e) => setField("descriptionEdited", e.target.value)}
                  placeholder={product.descriptionSource ?? ""}
                />
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <section className="rounded-[26px] border border-gray-200 bg-white p-4">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
                Ticari Alanlar
              </p>
              <h3 className="mt-1 text-base font-semibold text-gray-900">
                Fiyat, marka, SKU, durum
              </h3>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <label className="mb-2 block text-sm font-medium text-gray-800">
                  Düzenlenmiş fiyat
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-gray-900"
                  value={form.salePriceEdited}
                  onChange={(e) => setField("salePriceEdited", e.target.value)}
                  placeholder={
                    product.salePriceSource != null
                      ? String(product.salePriceSource)
                      : ""
                  }
                />

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-gray-200 bg-white p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                      Kaynak fiyat
                    </div>
                    <div className="mt-2 text-sm font-semibold text-gray-900">
                      {product.salePriceSource != null
                        ? `${formatPrice(product.salePriceSource)} ₺`
                        : "-"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                      Fark
                    </div>
                    <div
                      className={`mt-2 text-sm font-semibold ${
                        priceDelta == null
                          ? "text-gray-500"
                          : priceDelta === 0
                          ? "text-gray-500"
                          : priceDelta > 0
                          ? "text-amber-600"
                          : "text-emerald-600"
                      }`}
                    >
                      {priceDelta == null
                        ? "-"
                        : priceDelta === 0
                        ? "Değişiklik yok"
                        : `${priceDelta > 0 ? "+" : ""}${formatPrice(
                            priceDelta
                          )} ₺`}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <label className="mb-2 block text-sm font-medium text-gray-800">
                    Marka
                  </label>
                  <input
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-gray-900"
                    value={form.brand}
                    onChange={(e) => setField("brand", e.target.value)}
                    placeholder="Marka gir"
                  />
                </div>

                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <label className="mb-2 block text-sm font-medium text-gray-800">
                    SKU
                  </label>
                  <input
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-gray-900"
                    value={form.sku}
                    onChange={(e) => setField("sku", e.target.value)}
                    placeholder="SKU gir"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <label className="mb-2 block text-sm font-medium text-gray-800">
                  Durum
                </label>
                <select
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-gray-900"
                  value={form.status}
                  onChange={(e) => setField("status", e.target.value)}
                >
                  <option value="draft">draft</option>
                  <option value="ready">ready</option>
                  <option value="exported">exported</option>
                </select>
              </div>
            </div>
          </section>
        </div>
      </div>
    </form>
  );
}