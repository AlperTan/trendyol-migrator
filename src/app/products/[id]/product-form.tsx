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

function getStatusMeta(status: string) {
  switch (status) {
    case "ready":
      return {
        label: "Ready",
        className: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    case "exported":
      return {
        label: "Exported",
        className: "bg-blue-50 text-blue-700 border-blue-200",
      };
    default:
      return {
        label: "Draft",
        className: "bg-amber-50 text-amber-700 border-amber-200",
      };
  }
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

  const titleChanged =
    normalizeText(form.titleEdited) !== normalizeText(product.titleEdited ?? "");
  const descriptionChanged =
    normalizeText(form.descriptionEdited) !==
    normalizeText(product.descriptionEdited ?? "");
  const priceChanged =
    normalizeText(form.salePriceEdited) !==
    normalizeText(
      product.salePriceEdited != null ? String(product.salePriceEdited) : ""
    );
  const brandChanged =
    normalizeText(form.brand) !== normalizeText(product.brand ?? "");
  const skuChanged = normalizeText(form.sku) !== normalizeText(product.sku ?? "");
  const statusChanged =
    normalizeText(form.status) !== normalizeText(product.status ?? "draft");

  const dirty =
    titleChanged ||
    descriptionChanged ||
    priceChanged ||
    brandChanged ||
    skuChanged ||
    statusChanged;

  const editedTitlePreview =
    normalizeText(form.titleEdited) || product.titleSource || "-";

  const editedDescriptionPreview =
    normalizeText(form.descriptionEdited) ||
    product.descriptionSource ||
    "Açıklama yok";

  const parsedEditedPrice =
    normalizeText(form.salePriceEdited) === ""
      ? null
      : Number(form.salePriceEdited);

  const priceDelta =
    parsedEditedPrice != null && product.salePriceSource != null
      ? parsedEditedPrice - product.salePriceSource
      : null;

  const statusMeta = getStatusMeta(form.status);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function resetField(
    key: keyof FormState,
    sourceValue: string | number | null | undefined
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: sourceValue == null ? "" : String(sourceValue),
    }));
  }

  function resetAll() {
    setForm(initialForm);
    toast.success("Form alanları son kayıtlı haline döndürüldü");
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
              Düzenleme Özeti
            </p>
            <h3 className="mt-1 text-base font-semibold text-gray-900">
              Canlı önizleme ve kayıt durumu
            </h3>
          </div>

          <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusMeta.className}`}
          >
            {statusMeta.label}
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
              Durum
            </div>
            <div className="mt-2 text-sm font-semibold text-gray-900">
              {dirty ? "Kaydedilmemiş değişiklik var" : "Kaydedilmiş durumda"}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
              Başlık
            </div>
            <div className="mt-2 line-clamp-2 text-sm font-medium text-gray-900">
              {editedTitlePreview}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
              Fiyat
            </div>
            <div className="mt-2 text-sm font-semibold text-gray-900">
              {parsedEditedPrice != null
                ? `${formatPrice(parsedEditedPrice)} ₺`
                : product.salePriceSource != null
                ? `${formatPrice(product.salePriceSource)} ₺`
                : "-"}
            </div>
            {priceDelta != null ? (
              <div
                className={`mt-1 text-xs font-medium ${
                  priceDelta === 0
                    ? "text-gray-500"
                    : priceDelta > 0
                    ? "text-amber-600"
                    : "text-emerald-600"
                }`}
              >
                {priceDelta === 0
                  ? "Kaynak fiyat ile aynı"
                  : `${priceDelta > 0 ? "+" : ""}${formatPrice(priceDelta)} ₺`}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-[26px] border border-gray-200 bg-white p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
              Başlık
            </p>
            <h3 className="mt-1 text-base font-semibold text-gray-900">
              Ürün adı
            </h3>
          </div>

          <button
            type="button"
            onClick={() => resetField("titleEdited", product.titleEdited ?? "")}
            className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Düzenleneni sıfırla
          </button>
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
            <div className="mt-2 flex items-center justify-between text-xs">
              <span
                className={titleChanged ? "text-gray-900" : "text-gray-500"}
              >
                {titleChanged ? "Başlık düzenlendi" : "Başlık kaynakla aynı"}
              </span>
              <span className="text-gray-400">{form.titleEdited.length} karakter</span>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[26px] border border-gray-200 bg-white p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
              Açıklama
            </p>
            <h3 className="mt-1 text-base font-semibold text-gray-900">
              Ürün açıklaması
            </h3>
          </div>

          <button
            type="button"
            onClick={() =>
              resetField("descriptionEdited", product.descriptionEdited ?? "")
            }
            className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Düzenleneni sıfırla
          </button>
        </div>

        <div className="space-y-3">
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
              rows={8}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-gray-900"
              value={form.descriptionEdited}
              onChange={(e) => setField("descriptionEdited", e.target.value)}
              placeholder={product.descriptionSource ?? ""}
            />
            <div className="mt-2 flex items-center justify-between text-xs">
              <span
                className={
                  descriptionChanged ? "text-gray-900" : "text-gray-500"
                }
              >
                {descriptionChanged
                  ? "Açıklama düzenlendi"
                  : "Açıklama kaynakla aynı"}
              </span>
              <span className="text-gray-400">
                {form.descriptionEdited.length} karakter
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
              Canlı görünüm
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-800">
              {editedDescriptionPreview}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[26px] border border-gray-200 bg-white p-4">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
            Ticari Bilgiler
          </p>
          <h3 className="mt-1 text-base font-semibold text-gray-900">
            Fiyat, marka, SKU ve durum
          </h3>
        </div>

        <div className="grid gap-4">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <label className="block text-sm font-medium text-gray-800">
                Düzenlenmiş fiyat
              </label>

              <button
                type="button"
                onClick={() =>
                  resetField(
                    "salePriceEdited",
                    product.salePriceEdited != null
                      ? String(product.salePriceEdited)
                      : ""
                  )
                }
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Düzenleneni sıfırla
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
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

              <div>
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

                {priceDelta != null ? (
                  <div
                    className={`mt-2 text-xs font-medium ${
                      priceDelta === 0
                        ? "text-gray-500"
                        : priceDelta > 0
                        ? "text-amber-600"
                        : "text-emerald-600"
                    }`}
                  >
                    {priceDelta === 0
                      ? "Kaynak fiyat ile aynı"
                      : `Fark: ${priceDelta > 0 ? "+" : ""}${formatPrice(
                          priceDelta
                        )} ₺`}
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-gray-400">
                    Düzenlenmiş fiyat girildiğinde fark burada görünür.
                  </div>
                )}
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

            <div className="mt-2 text-xs text-gray-500">
              Export akışında ürünün işlem durumunu buradan yönetebilirsin.
            </div>
          </div>
        </div>
      </section>

      <div className="sticky bottom-3 z-10 rounded-[26px] border border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-900">
              {dirty ? "Kaydedilmemiş değişiklikler var" : "Tüm değişiklikler kayıtlı"}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Kaydetmeden önce alanları tekrar gözden geçirebilirsin.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={resetAll}
              disabled={saving || !dirty}
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Geri Al
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}