import Link from "next/link";

import DownloadImagesButton from "./download-images-button";
import ImageManager from "./image-manager";
import ProductForm from "./product-form";
import ProductGallery from "./product-gallery";

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
  barcode: string | null;
  categorySource: string | null;
  sourceStatus: string | null;
  status: string;
  sourcePlatform: string;
  sourceProductId: string;
  images: {
    id: string;
    sourceUrl: string;
    localPath: string | null;
    downloadStatus: string | null;
    sortOrder: number;
    isSelected: boolean;
  }[];
};

async function getProduct(id: string): Promise<Product> {
  const res = await fetch(`http://localhost:3000/api/products/${id}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Ürün alınamadı");
  }

  return res.json();
}

function formatPrice(value: number | null) {
  if (value == null) return "-";

  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function getStatusBadge(status: string | null) {
  switch (status) {
    case "approved":
      return {
        label: "Approved",
        className: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    case "archived":
      return {
        label: "Archived",
        className: "bg-amber-50 text-amber-700 border-amber-200",
      };
    case "blacklisted":
      return {
        label: "Blacklisted",
        className: "bg-rose-50 text-rose-700 border-rose-200",
      };
    case "ready":
      return {
        label: "Ready",
        className: "bg-blue-50 text-blue-700 border-blue-200",
      };
    case "exported":
      return {
        label: "Exported",
        className: "bg-indigo-50 text-indigo-700 border-indigo-200",
      };
    case "draft":
      return {
        label: "Draft",
        className: "bg-gray-100 text-gray-700 border-gray-200",
      };
    default:
      return {
        label: "Unknown",
        className: "bg-gray-100 text-gray-700 border-gray-200",
      };
  }
}

function getDeltaLabel(source: number | null, edited: number | null) {
  if (source == null || edited == null) return null;

  const delta = edited - source;
  if (delta === 0) return "Değişiklik yok";

  const sign = delta > 0 ? "+" : "";
  return `${sign}${formatPrice(delta)} ₺`;
}

function getSourceProductUrl(
  sourcePlatform: string,
  sourceProductId: string
): string | null {
  if (sourcePlatform === "trendyol" && sourceProductId) {
    return `https://www.trendyol.com/product-p-${sourceProductId}`;
  }

  return null;
}

type ActionBadgeProps = {
  label: string;
  value: string;
  className?: string;
};

function ActionBadge({ label, value, className = "" }: ActionBadgeProps) {
  return (
    <div
      className={`rounded-2xl border px-3 py-2 text-xs font-medium ${className}`}
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-60">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

type StatCardProps = {
  label: string;
  value: string;
  hint?: string | null;
};

function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <div className="rounded-2xl bg-gray-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
        {label}
      </div>
      <div className="mt-2 text-xl font-bold text-gray-900">{value}</div>
      {hint ? (
        <div className="mt-2 text-sm font-medium text-gray-500">{hint}</div>
      ) : null}
    </div>
  );
}

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ProductDetailPage({ params }: PageProps) {
  const { id } = await params;
  const product = await getProduct(id);

  const displayTitle = product.titleEdited ?? product.titleSource;
  const selectedImageCount = product.images.filter((img) => img.isSelected).length;
  const statusBadge = getStatusBadge(product.status);
  const sourceBadge = getStatusBadge(product.sourceStatus);
  const priceDelta = getDeltaLabel(
    product.salePriceSource,
    product.salePriceEdited
  );
  const sourceProductUrl = getSourceProductUrl(
    product.sourcePlatform,
    product.sourceProductId
  );

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
        <div className="mb-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/"
              className="inline-flex items-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
            >
              ← Ürünlere Dön
            </Link>

            <div className="hidden text-xs font-medium text-gray-400 md:block">
              Product ID: {product.id}
            </div>
          </div>

          <section className="overflow-hidden rounded-[30px] border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-5 md:px-6 md:py-6">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                    Ürün Detayı
                  </p>

                  <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
                    {displayTitle}
                  </h1>

                  <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
                    Ürün düzenleme, görsel seçimi ve export öncesi kalite kontrol
                    işlemlerini bu ekran üzerinden yönetiyorsun.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusBadge.className}`}
                    >
                      Panel: {statusBadge.label}
                    </span>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${sourceBadge.className}`}
                    >
                      Kaynak: {sourceBadge.label}
                    </span>

                    {product.brand ? (
                      <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700">
                        Marka: {product.brand}
                      </span>
                    ) : null}

                    <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700">
                      Seçili Görsel: {selectedImageCount}
                    </span>
                  </div>
                </div>

                <div className="w-full max-w-xl rounded-[26px] border border-gray-200 bg-gray-50 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
                        Hızlı Aksiyonlar
                      </div>
                      <div className="mt-1 text-sm font-semibold text-gray-900">
                        Export öncesi kontrol paneli
                      </div>
                    </div>

                    <div className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-500">
                      {product.sourcePlatform}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-gray-200 bg-white p-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                        Source Product ID
                      </div>
                      <div className="mt-2 break-all text-sm font-semibold text-gray-900">
                        {product.sourceProductId}
                      </div>

                      {sourceProductUrl ? (
                        <a
                          href={sourceProductUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
                        >
                          Kaynak Ürünü Aç
                        </a>
                      ) : null}
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-white p-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                        Hızlı Durum
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2">
                        <ActionBadge
                          label="Panel"
                          value={statusBadge.label}
                          className={statusBadge.className}
                        />
                        <ActionBadge
                          label="Kaynak"
                          value={sourceBadge.label}
                          className={sourceBadge.className}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0 rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                        Workflow notu
                      </div>
                      <div className="mt-1 text-sm text-gray-600">
                        Önce görselleri indir, sonra seçim ve sıralamayı netleştir,
                        ardından içerik düzenlemesini kaydet.
                      </div>
                    </div>

                    <DownloadImagesButton productId={product.id} />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 px-5 py-5 md:grid-cols-2 md:px-6 xl:grid-cols-4">
              <StatCard
                label="Kaynak Fiyat"
                value={`${formatPrice(product.salePriceSource)} ₺`}
              />

              <StatCard
                label="Düzenlenen Fiyat"
                value={`${formatPrice(product.salePriceEdited)} ₺`}
                hint={priceDelta ? `Fark: ${priceDelta}` : null}
              />

              <StatCard label="SKU" value={product.sku ?? "-"} />

              <StatCard label="Barkod" value={product.barcode ?? "-"} />
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.15fr)_420px]">
          <div className="space-y-6">
            
            <section className="rounded-[30px] border border-gray-200 bg-white p-5 shadow-sm md:p-6">
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                  İçerik Karşılaştırması
                </p>
                <h2 className="mt-1 text-xl font-semibold text-gray-900">
                  Source vs Edited
                </h2>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-[24px] border border-gray-200 bg-gray-50 p-4">
                  <div className="mb-3 text-sm font-semibold text-gray-900">
                    Kaynak Veri
                  </div>

                  <div className="space-y-4 text-sm text-gray-600">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
                        Başlık
                      </div>
                      <p className="mt-1 leading-6 text-gray-800">
                        {product.titleSource || "-"}
                      </p>
                    </div>

                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
                        Açıklama
                      </div>
                      <p className="mt-1 whitespace-pre-wrap leading-6 text-gray-800">
                        {product.descriptionSource || "-"}
                      </p>
                    </div>

                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
                        Kategori
                      </div>
                      <p className="mt-1 text-gray-800">
                        {product.categorySource || "-"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-gray-200 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-gray-900">
                      Düzenlenen Veri
                    </div>

                    <span className="rounded-full bg-gray-900 px-3 py-1 text-[11px] font-semibold text-white">
                      Aktif görünüm
                    </span>
                  </div>

                  <div className="space-y-4 text-sm text-gray-600">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
                        Başlık
                      </div>
                      <p className="mt-1 leading-6 text-gray-800">
                        {product.titleEdited ?? product.titleSource}
                      </p>
                    </div>

                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
                        Açıklama
                      </div>
                      <p className="mt-1 whitespace-pre-wrap leading-6 text-gray-800">
                        {product.descriptionEdited ??
                          product.descriptionSource ??
                          "-"}
                      </p>
                    </div>

                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
                        Kategori
                      </div>
                      <p className="mt-1 text-gray-800">
                        {product.categorySource || "-"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <ImageManager productId={product.id} initialImages={product.images} />
          </div>

          <aside className="xl:sticky xl:top-6 xl:self-start">
            <div className="rounded-[30px] border border-gray-200 bg-white p-5 shadow-sm md:p-6">
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                  Ürün Düzenleme
                </p>
                <h2 className="mt-1 text-xl font-semibold text-gray-900">
                  Edit Paneli
                </h2>
                <p className="mt-2 text-sm text-gray-500">
                  Sağ panel uzun sayfada sabit kalır; bu yüzden görselleri
                  incelerken form alanları hep erişilebilir olur.
                </p>
              </div>

              <ProductForm product={product} />
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}