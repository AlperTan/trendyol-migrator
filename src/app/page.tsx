"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import ImageLightbox from "@/components/image-lightbox";

type Product = {
  id: string;
  titleSource: string;
  titleEdited: string | null;
  brand: string | null;
  sku: string | null;
  barcode: string | null;
  salePriceSource: number | null;
  salePriceEdited: number | null;
  listPriceSource: number | null;
  sourceStatus: string | null;
  categorySource: string | null;
  status: string;
  images: {
    id: string;
    sourceUrl: string;
    localPath: string | null;
    downloadStatus: string | null;
    sortOrder: number;
    isSelected: boolean;
  }[];
};

type ProductsResponse = {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  selectedStatuses: string[];
  filters: {
    search: string;
    brand: string;
    category: string;
  };
  options: {
    brands: string[];
    categories: string[];
  };
};

const STATUS_OPTIONS = [
  { key: "approved", label: "Approved", emoji: "✅" },
  { key: "archived", label: "Archived", emoji: "📦" },
  { key: "blacklisted", label: "Blacklisted", emoji: "⛔" },
];

function getStatusEmoji(status: string | null) {
  switch (status) {
    case "approved":
      return "✅";
    case "archived":
      return "📦";
    case "blacklisted":
      return "⛔";
    default:
      return "❔";
  }
}

function formatPrice(value: number | null) {
  if (value == null) return "-";
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(["approved"]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");

  const [brandOptions, setBrandOptions] = useState<string[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<{ src: string; alt?: string }[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  function openLightbox(images: { src: string; alt?: string }[], index = 0) {
    setLightboxImages(images);
    setLightboxIndex(index);
    setLightboxOpen(true);
  }

  function closeLightbox() {
    setLightboxOpen(false);
  }

  function prevLightbox() {
    setLightboxIndex((prev) =>
      prev === 0 ? lightboxImages.length - 1 : prev - 1
    );
  }

  function nextLightbox() {
    setLightboxIndex((prev) =>
      prev === lightboxImages.length - 1 ? 0 : prev + 1
    );
  }

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    params.set("status", selectedStatuses.join(","));

    if (searchTerm) {
      params.set("search", searchTerm);
    }

    if (brand) {
      params.set("brand", brand);
    }

    if (category) {
      params.set("category", category);
    }

    return params.toString();
  }, [page, pageSize, selectedStatuses, searchTerm, brand, category]);

  async function loadProducts() {
    setLoading(true);

    try {
      const res = await fetch(`/api/products?${queryString}`, {
        cache: "no-store",
      });

      const data: ProductsResponse = await res.json();

      if (!res.ok) {
        toast.error("Ürünler alınamadı");
        setLoading(false);
        return;
      }

      setProducts(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setBrandOptions(data.options.brands);
      setCategoryOptions(data.options.categories);
    } catch (error) {
      console.error(error);
      toast.error("Ürünler yüklenirken hata oluştu");
    }

    setLoading(false);
  }

  useEffect(() => {
    loadProducts();
  }, [queryString]);

  async function importProducts() {
    const promise = fetch("/api/import/trendyol", {
      method: "POST",
    }).then(async (res) => {
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error ?? "Import sırasında hata oluştu");
      }

      return data;
    });

    toast.promise(promise, {
      loading: "Trendyol ürünleri içeri aktarılıyor...",
      success: (data) => {
        loadProducts();
        return `Toplam ${data.imported} kayıt işlendi`;
      },
      error: (error) => error.message || "Import sırasında hata oluştu",
    });
  }

  function toggleStatus(statusKey: string) {
    setPage(1);

    setSelectedStatuses((prev) => {
      if (prev.includes(statusKey)) {
        const next = prev.filter((item) => item !== statusKey);
        return next.length === 0 ? ["approved"] : next;
      }

      return [...prev, statusKey];
    });
  }

  function handlePageSizeChange(nextPageSize: number) {
    setPageSize(nextPageSize);
    setPage(1);
  }

  function goPrev() {
    setPage((prev) => Math.max(prev - 1, 1));
  }

  function goNext() {
    setPage((prev) => Math.min(prev + 1, totalPages));
  }

  function applySearch() {
    setPage(1);
    setSearchTerm(searchInput.trim());
  }

  function resetFilters() {
    setSelectedStatuses(["approved"]);
    setSearchInput("");
    setSearchTerm("");
    setBrand("");
    setCategory("");
    setPage(1);
    setPageSize(20);
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Ürünler</h1>
              <p className="mt-1 text-sm text-gray-500">
                Trendyol’dan çekilen ürünleri filtrele, düzenle ve yönet.
              </p>
            </div>

            <button
              onClick={importProducts}
              className="rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Trendyol’dan Ürün Çek
            </button>
          </div>

          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border bg-gray-50 p-4">
              <div className="mb-3 text-sm font-semibold text-gray-700">
                Kaynak Durum Filtreleri
              </div>

              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((status) => {
                  const active = selectedStatuses.includes(status.key);

                  return (
                    <button
                      key={status.key}
                      onClick={() => toggleStatus(status.key)}
                      className={[
                        "rounded-full border px-4 py-2 text-sm transition",
                        active
                          ? "border-black bg-black text-white"
                          : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100",
                      ].join(" ")}
                    >
                      <span className="mr-2">{status.emoji}</span>
                      {status.label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500">
                <span>✅ Approved</span>
                <span>📦 Archived</span>
                <span>⛔ Blacklisted</span>
                <span>❔ Unknown</span>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[2fr_1fr_1fr_auto_auto]">
              <div className="rounded-2xl border bg-gray-50 p-4">
                <div className="mb-2 text-sm font-semibold text-gray-700">
                  Arama
                </div>

                <div className="flex gap-2">
                  <input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        applySearch();
                      }
                    }}
                    placeholder="Başlık, SKU veya barcode ara..."
                    className="w-full rounded-xl border bg-white px-4 py-2 text-sm outline-none focus:border-black"
                  />

                  <button
                    onClick={applySearch}
                    className="rounded-xl border bg-white px-4 py-2 text-sm hover:bg-gray-100"
                  >
                    Ara
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border bg-gray-50 p-4">
                <div className="mb-2 text-sm font-semibold text-gray-700">
                  Marka
                </div>

                <select
                  value={brand}
                  onChange={(e) => {
                    setBrand(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-xl border bg-white px-4 py-2 text-sm outline-none focus:border-black"
                >
                  <option value="">Tümü</option>
                  {brandOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-2xl border bg-gray-50 p-4">
                <div className="mb-2 text-sm font-semibold text-gray-700">
                  Kategori
                </div>

                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-xl border bg-white px-4 py-2 text-sm outline-none focus:border-black"
                >
                  <option value="">Tümü</option>
                  {categoryOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-2xl border bg-gray-50 p-4">
                <div className="mb-2 text-sm font-semibold text-gray-700">
                  Sayfa Boyutu
                </div>

                <div className="flex gap-2">
                  {[20, 50, 100].map((size) => {
                    const active = pageSize === size;

                    return (
                      <button
                        key={size}
                        onClick={() => handlePageSizeChange(size)}
                        className={[
                          "rounded-xl border px-4 py-2 text-sm transition",
                          active
                            ? "border-black bg-black text-white"
                            : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100",
                        ].join(" ")}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border bg-gray-50 p-4 flex items-end">
                <button
                  onClick={resetFilters}
                  className="w-full rounded-xl border bg-white px-4 py-2 text-sm hover:bg-gray-100"
                >
                  Filtreleri Sıfırla
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b p-5 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-gray-600">
              Toplam <span className="font-semibold text-black">{total}</span> ürün
            </div>

            <div className="text-sm text-gray-500">
              Sayfa {page} / {totalPages}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-4 text-left font-semibold text-gray-600">Görsel</th>
                  <th className="p-4 text-left font-semibold text-gray-600">Durum</th>
                  <th className="p-4 text-left font-semibold text-gray-600">Başlık</th>
                  <th className="p-4 text-left font-semibold text-gray-600">Marka</th>
                  <th className="p-4 text-left font-semibold text-gray-600">SKU</th>
                  <th className="p-4 text-left font-semibold text-gray-600">Barcode</th>
                  <th className="p-4 text-left font-semibold text-gray-600">Kategori</th>
                  <th className="p-4 text-left font-semibold text-gray-600">Liste Fiyatı</th>
                  <th className="p-4 text-left font-semibold text-gray-600">Satış Fiyatı</th>
                  <th className="p-4 text-left font-semibold text-gray-600">Düzenlenmiş Fiyat</th>
                  <th className="p-4 text-left font-semibold text-gray-600">Uygulama Durumu</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={11} className="p-10 text-center text-gray-500">
                      Yükleniyor...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-10 text-center text-gray-500">
                      Bu filtrede ürün bulunamadı.
                    </td>
                  </tr>
                ) : (
                  products.map((product) => {
                    const thumb = product.images?.[0];
                    const thumbSrc = thumb?.localPath ?? thumb?.sourceUrl ?? null;

                    return (
                      <tr key={product.id} className="border-t hover:bg-gray-50/80">
                        <td className="p-4">
                          {thumbSrc ? (
                            <button
                              type="button"
                              onClick={() =>
                                openLightbox(
                                  product.images.map((img) => ({
                                    src: img.localPath ?? img.sourceUrl,
                                    alt: product.titleEdited ?? product.titleSource,
                                  })),
                                  0
                                )
                              }
                              className="block"
                            >
                              <img
                                src={thumbSrc}
                                alt=""
                                className="h-14 w-14 rounded-xl border object-cover transition hover:scale-105"
                              />
                            </button>
                          ) : (
                            <div className="flex h-14 w-14 items-center justify-center rounded-xl border text-xs text-gray-400">
                              Yok
                            </div>
                          )}
                        </td>

                        <td className="p-4 text-lg">
                          <span title={product.sourceStatus ?? "unknown"}>
                            {getStatusEmoji(product.sourceStatus)}
                          </span>
                        </td>

                        <td className="p-4">
                          <Link
                            href={`/products/${product.id}`}
                            className="font-medium text-blue-600 hover:underline"
                          >
                            {product.titleEdited ?? product.titleSource}
                          </Link>
                        </td>

                        <td className="p-4">{product.brand ?? "-"}</td>
                        <td className="p-4">{product.sku ?? "-"}</td>
                        <td className="p-4">{product.barcode ?? "-"}</td>
                        <td className="p-4">{product.categorySource ?? "-"}</td>
                        <td className="p-4">{formatPrice(product.listPriceSource)}</td>
                        <td className="p-4">{formatPrice(product.salePriceSource)}</td>
                        <td className="p-4">{formatPrice(product.salePriceEdited)}</td>
                        <td className="p-4">{product.status}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t p-5 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-gray-500">
              {products.length} kayıt gösteriliyor
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={goPrev}
                disabled={page <= 1}
                className="rounded-xl border px-4 py-2 text-sm transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Önceki
              </button>

              <div className="rounded-xl border px-4 py-2 text-sm">
                {page} / {totalPages}
              </div>

              <button
                onClick={goNext}
                disabled={page >= totalPages}
                className="rounded-xl border px-4 py-2 text-sm transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Sonraki
              </button>
            </div>
          </div>
        </div>
      </div>
      <ImageLightbox
        images={lightboxImages}
        currentIndex={lightboxIndex}
        open={lightboxOpen}
        onClose={closeLightbox}
        onPrev={lightboxImages.length > 1 ? prevLightbox : undefined}
        onNext={lightboxImages.length > 1 ? nextLightbox : undefined}
      />
    </main>
  );
}