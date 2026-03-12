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

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
        <div className="mb-6 flex flex-col gap-4 rounded-[30px] border border-gray-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <Link
                href="/"
                className="inline-flex items-center rounded-full border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
              >
                ← Ürünlere Dön
              </Link>

              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                Ürün Detayı
              </p>

              <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
                {displayTitle}
              </h1>

              <div className="mt-3 flex flex-wrap gap-2">
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

            <div className="flex flex-wrap items-center gap-2">
              <DownloadImagesButton productId={product.id} />

              <Link
                href={product.sourcePlatform === "trendyol" ? "#" : "#"}
                className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Source ID: {product.sourceProductId}
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-gray-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
                Kaynak Fiyat
              </div>
              <div className="mt-2 text-xl font-bold text-gray-900">
                {formatPrice(product.salePriceSource)} ₺
              </div>
            </div>

            <div className="rounded-2xl bg-gray-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
                Düzenlenen Fiyat
              </div>
              <div className="mt-2 text-xl font-bold text-gray-900">
                {formatPrice(product.salePriceEdited)} ₺
              </div>
              {priceDelta ? (
                <div className="mt-2 text-sm font-medium text-gray-500">
                  Fark: {priceDelta}
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl bg-gray-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
                SKU
              </div>
              <div className="mt-2 break-all text-sm font-medium text-gray-800">
                {product.sku ?? "-"}
              </div>
            </div>

            <div className="rounded-2xl bg-gray-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
                Barkod
              </div>
              <div className="mt-2 break-all text-sm font-medium text-gray-800">
                {product.barcode ?? "-"}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.15fr)_420px]">
          <div className="space-y-6">
            <ProductGallery images={product.images} title={displayTitle} />

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
                  Sağ paneli sticky tuttum; uzun sayfada form hep erişilebilir
                  kalıyor.
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