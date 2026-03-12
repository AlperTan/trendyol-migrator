import Link from "next/link";
import ProductForm from "./product-form";
import DownloadImagesButton from "./download-images-button";
import ImageManager from "./image-manager";
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
      return "✅ Approved";
    case "archived":
      return "📦 Archived";
    case "blacklisted":
      return "⛔ Blacklisted";
    default:
      return "❔ Unknown";
  }
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

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded-xl border bg-white px-4 py-2 text-sm hover:bg-gray-100"
          >
            ← Listeye dön
          </Link>
        </div>

        <div className="rounded-3xl border bg-white p-6 shadow-sm">
          <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
            <div>
              <ProductGallery
                images={product.images}
                title={displayTitle}
              />
            </div>

            <div className="space-y-4">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border px-3 py-1 text-xs font-medium">
                    {getStatusBadge(product.sourceStatus)}
                  </span>

                  <span className="rounded-full border px-3 py-1 text-xs font-medium">
                    Uygulama: {product.status}
                  </span>

                  {product.brand ? (
                    <span className="rounded-full border px-3 py-1 text-xs font-medium">
                      Marka: {product.brand}
                    </span>
                  ) : null}
                </div>

                <h1 className="text-3xl font-bold tracking-tight">
                  {displayTitle}
                </h1>

                <p className="mt-2 text-sm text-gray-500">
                  Trendyol kaynak ürünü üzerinde lokal düzenleme yapıyorsun.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-2xl border bg-gray-50 p-4">
                  <div className="text-xs text-gray-500">Kaynak Fiyat</div>
                  <div className="mt-1 text-lg font-semibold">
                    {formatPrice(product.salePriceSource)}
                  </div>
                </div>

                <div className="rounded-2xl border bg-gray-50 p-4">
                  <div className="text-xs text-gray-500">Düzenlenmiş Fiyat</div>
                  <div className="mt-1 text-lg font-semibold">
                    {formatPrice(product.salePriceEdited)}
                  </div>
                </div>

                <div className="rounded-2xl border bg-gray-50 p-4">
                  <div className="text-xs text-gray-500">SKU</div>
                  <div className="mt-1 text-sm font-medium">
                    {product.sku ?? "-"}
                  </div>
                </div>

                <div className="rounded-2xl border bg-gray-50 p-4">
                  <div className="text-xs text-gray-500">Barcode</div>
                  <div className="mt-1 text-sm font-medium">
                    {product.barcode ?? "-"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-3xl border bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold">Ürün Düzenleme</h2>
              <p className="mt-1 text-sm text-gray-500">
                Başlık, açıklama, fiyat ve temel alanları düzenleyebilirsin.
              </p>
            </div>

            <ProductForm product={product} />
          </section>

          <section className="space-y-6">
            <div className="rounded-3xl border bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold">Görsel Yönetimi</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Görselleri sırala, seç ve istersen lokalde sakla.
                  </p>
                </div>

                <DownloadImagesButton productId={product.id} />
              </div>

              <ImageManager productId={product.id} initialImages={product.images} />
            </div>

            <div className="rounded-3xl border bg-white p-6 shadow-sm">
              <h2 className="mb-5 text-2xl font-semibold">Kaynak Bilgiler</h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border bg-gray-50 p-4">
                  <div className="text-xs text-gray-500">Kaynak Platform</div>
                  <div className="mt-1 text-sm font-medium">
                    {product.sourcePlatform}
                  </div>
                </div>

                <div className="rounded-2xl border bg-gray-50 p-4">
                  <div className="text-xs text-gray-500">Kaynak Ürün ID</div>
                  <div className="mt-1 break-all text-sm font-medium">
                    {product.sourceProductId}
                  </div>
                </div>

                <div className="rounded-2xl border bg-gray-50 p-4">
                  <div className="text-xs text-gray-500">Kategori</div>
                  <div className="mt-1 text-sm font-medium">
                    {product.categorySource ?? "-"}
                  </div>
                </div>

                <div className="rounded-2xl border bg-gray-50 p-4">
                  <div className="text-xs text-gray-500">Kaynak Durum</div>
                  <div className="mt-1 text-sm font-medium">
                    {getStatusBadge(product.sourceStatus)}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border bg-gray-50 p-4">
                <div className="text-xs text-gray-500">Kaynak Başlık</div>
                <div className="mt-1 text-sm font-medium">
                  {product.titleSource}
                </div>
              </div>

              <div className="mt-4 rounded-2xl border bg-gray-50 p-4">
                <div className="text-xs text-gray-500">Kaynak Açıklama</div>
                <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                  {product.descriptionSource ?? "-"}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}