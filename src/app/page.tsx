"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import ImageLightbox from "@/components/image-lightbox";

type Product = {
  id: string;
  contentId: string | null;
  titleSource: string;
  titleEdited: string | null;
  brand: string | null;
  sku: string | null;
  barcode: string | null;
  salePriceSource: number | null;
  salePriceEdited: number | null;
  listPriceSource: number | null;
  deliveryDurationSource: number | null;
  deliveryDurationEdited: number | null;
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

type BatchCheckResponse = {
  batchRequestId?: string;
  status?: string;
  batchRequestType?: string;
  failedItemCount?: number;
  items?: Array<{
    status?: string;
    requestItem?: {
      barcode?: string;
      deliveryDuration?: number;
    };
    failureReasons?: Array<{
      code?: string;
      message?: string;
    }>;
  }>;
};

const STATUS_OPTIONS = [
  { key: "approved", label: "Approved", emoji: "✅" },
  { key: "archived", label: "Archived", emoji: "📦" },
  { key: "blacklisted", label: "Blacklisted", emoji: "⛔" },
  { key: "unknown", label: "Unknown", emoji: "❔" },
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deliveryDrafts, setDeliveryDrafts] = useState<Record<string, string>>({});
  const [bulkDuration, setBulkDuration] = useState("");
  const [sendingDelivery, setSendingDelivery] = useState(false);

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

      setSelectedIds((prev) =>
        prev.filter((id) => data.items.some((item) => item.id === id))
      );

      setDeliveryDrafts((prev) => {
        const next = { ...prev };

        for (const product of data.items) {
          next[product.id] = String(
            product.deliveryDurationEdited ??
              product.deliveryDurationSource ??
              ""
          );
        }

        return next;
      });
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

  function toggleRowSelection(productId: string) {
    setSelectedIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  }

  function toggleSelectAllVisible() {
    const visibleIds = products.map((product) => product.id);
    const allVisibleSelected = visibleIds.every((id) => selectedIds.includes(id));

    if (allVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
      return;
    }

    setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
  }

  function setDraft(productId: string, value: string) {
    setDeliveryDrafts((prev) => ({
      ...prev,
      [productId]: value,
    }));
  }

  function applyBulkDurationToSelected() {
    const parsed = Number(bulkDuration);

    if (!Number.isFinite(parsed) || parsed < 1) {
      toast.error("Toplu sevk süresi için 1 veya daha büyük sayı gir.");
      return;
    }

    if (selectedIds.length === 0) {
      toast.error("Önce en az bir ürün seç.");
      return;
    }

    setDeliveryDrafts((prev) => {
      const next = { ...prev };

      for (const id of selectedIds) {
        next[id] = String(Math.trunc(parsed));
      }

      return next;
    });

    toast.success(`${selectedIds.length} ürün için sevk süresi hazırlandı`);
  }

  async function pollBatch(batchRequestId: string): Promise<BatchCheckResponse> {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await sleep(3000);

      const res = await fetch(
        `/api/trendyol/delivery-duration?batchRequestId=${batchRequestId}`,
        { cache: "no-store" }
      );

      const data: BatchCheckResponse | { error?: string } = await res.json();

      if (!res.ok) {
        throw new Error("Batch sonucu alınamadı");
      }

      if ("status" in data && (data.status === "COMPLETED" || data.status === "FAILED")) {
        return data;
      }
    }

    throw new Error("Batch sonucu zamanında tamamlanmadı");
  }

  async function pushSelectedDeliveryDurations() {
    if (selectedIds.length === 0) {
      toast.error("Önce en az bir ürün seç.");
      return;
    }

    const selectedProducts = products.filter((product) =>
      selectedIds.includes(product.id)
    );

    const items = selectedProducts.map((product) => {
      const draft = deliveryDrafts[product.id];
      const parsed = Number(draft);

      return {
        product,
        deliveryDuration: Number.isFinite(parsed) ? Math.trunc(parsed) : NaN,
      };
    });

    const invalid = items.find(
      (item) =>
        !item.product.barcode ||
        !Number.isFinite(item.deliveryDuration) ||
        item.deliveryDuration < 1
    );

    if (invalid) {
      toast.error("Seçili ürünlerde barcode eksik ya da sevk süresi hatalı.");
      return;
    }

    setSendingDelivery(true);

    try {
      const res = await fetch("/api/trendyol/delivery-duration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.product.id,
            deliveryDuration: item.deliveryDuration,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.error ?? "Trendyol güncellemesi başarısız");
        setSendingDelivery(false);
        return;
      }

      const batchRequestId = data?.batchRequestId;

      if (!batchRequestId) {
        toast.success("İstek gönderildi");
        setSendingDelivery(false);
        return;
      }

      toast.success(`İstek gönderildi. Batch: ${batchRequestId}`);

      const result = await pollBatch(batchRequestId);
      console.log("DELIVERY BATCH RESULT", JSON.stringify(result, null, 2));

      const failedItems =
        result.items?.filter((item) => item.status !== "SUCCESS") ?? [];
      console.log("FAILED DELIVERY ITEMS", failedItems);

      if (failedItems.length > 0) {
        const firstReason =
          failedItems[0]?.failureReasons?.[0]?.message ??
          "Bazı ürünlerde hata var";

        toast.error(
          `${failedItems.length} ürün başarısız oldu: ${firstReason}`
        );
      } else {
        await fetch("/api/products/delivery-duration", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            items: items.map((item) => ({
              productId: item.product.id,
              deliveryDuration: item.deliveryDuration,
            })),
          }),
        });

        toast.success("Seçili ürünlerin sevk süreleri güncellendi");
      }

      await loadProducts();
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Sevk süresi güncellemesi sırasında hata oluştu"
      );
    }

    setSendingDelivery(false);
  }

  const allVisibleSelected =
    products.length > 0 && products.every((product) => selectedIds.includes(product.id));

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                Ürünler
              </h1>
              <p className="mt-2 text-sm text-gray-500">
                Trendyol’dan çekilen ürünleri filtrele, sevk süresini toplu düzenle
                ve Trendyol’a geri gönder.
              </p>
            </div>

            <button
              type="button"
              onClick={importProducts}
              className="rounded-2xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              Trendyol’dan Ürün Çek
            </button>
          </div>
        </section>

        <section className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-4">
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
                  Kaynak Durum Filtreleri
                </div>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map((status) => {
                    const active = selectedStatuses.includes(status.key);

                    return (
                      <button
                        key={status.key}
                        type="button"
                        onClick={() => toggleStatus(status.key)}
                        className={[
                          "rounded-full border px-4 py-2 text-sm transition",
                          active
                            ? "border-black bg-black text-white"
                            : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100",
                        ].join(" ")}
                      >
                        {status.emoji} {status.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Arama
                  </label>
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
                      type="button"
                      onClick={applySearch}
                      className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-100"
                    >
                      Ara
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Marka
                  </label>
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

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Kategori
                  </label>
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

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Sayfa Boyutu
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[20, 50, 100].map((size) => {
                      const active = pageSize === size;

                      return (
                        <button
                          key={size}
                          type="button"
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
              </div>
            </div>

            <div className="rounded-[24px] border border-gray-200 bg-gray-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
                Toplu Sevk Süresi İşlemi
              </div>
              <h2 className="mt-1 text-base font-semibold text-gray-900">
                Seçili ürünleri Trendyol’a gönder
              </h2>

              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-gray-200 bg-white p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                    Seçili Ürün
                  </div>
                  <div className="mt-2 text-lg font-bold text-gray-900">
                    {selectedIds.length}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Toplu Sevk Süresi
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={bulkDuration}
                    onChange={(e) => setBulkDuration(e.target.value)}
                    placeholder="örn: 3"
                    className="w-full rounded-xl border bg-white px-4 py-2 text-sm outline-none focus:border-black"
                  />
                </div>

                <div className="grid gap-2">
                  <button
                    type="button"
                    onClick={applyBulkDurationToSelected}
                    className="rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
                  >
                    Seçili Satırlara Uygula
                  </button>

                  <button
                    type="button"
                    onClick={pushSelectedDeliveryDurations}
                    disabled={sendingDelivery}
                    className="rounded-2xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {sendingDelivery
                      ? "Trendyol’a gönderiliyor..."
                      : "Trendyol’a Gönder"}
                  </button>

                  <button
                    type="button"
                    onClick={resetFilters}
                    className="rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
                  >
                    Filtreleri Sıfırla
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-gray-100 px-6 py-4 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-gray-500">
              Toplam <span className="font-semibold text-gray-900">{total}</span> ürün
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleSelectAllVisible}
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                {allVisibleSelected ? "Sayfadaki Seçimi Kaldır" : "Sayfadakileri Seç"}
              </button>

              <div className="text-sm text-gray-500">
                Sayfa {page} / {totalPages}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Seç</th>
                  <th className="px-4 py-3 font-medium">Görsel</th>
                  <th className="px-4 py-3 font-medium">Durum</th>
                  <th className="px-4 py-3 font-medium">Başlık</th>
                  <th className="px-4 py-3 font-medium">Marka</th>
                  <th className="px-4 py-3 font-medium">SKU</th>
                  <th className="px-4 py-3 font-medium">Barcode</th>
                  <th className="px-4 py-3 font-medium">Liste Fiyatı</th>
                  <th className="px-4 py-3 font-medium">Satış Fiyatı</th>
                  <th className="px-4 py-3 font-medium">Kaynak Sevk</th>
                  <th className="px-4 py-3 font-medium">Yeni Sevk</th>
                  <th className="px-4 py-3 font-medium">Detay</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-10 text-center text-gray-500">
                      Yükleniyor...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-10 text-center text-gray-500">
                      Bu filtrede ürün bulunamadı.
                    </td>
                  </tr>
                ) : (
                  products.map((product) => {
                    const thumb = product.images?.[0];
                    const thumbSrc = thumb?.localPath ?? thumb?.sourceUrl ?? null;

                    return (
                      <tr
                        key={product.id}
                        className="border-t border-gray-100 align-middle"
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(product.id)}
                            onChange={() => toggleRowSelection(product.id)}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </td>

                        <td className="px-4 py-3">
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
                              className="block overflow-hidden rounded-xl border border-gray-200"
                            >
                              <img
                                src={thumbSrc}
                                alt=""
                                className="h-14 w-14 object-cover"
                              />
                            </button>
                          ) : (
                            <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-gray-300 text-xs text-gray-400">
                              Yok
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3 text-lg">
                          {getStatusEmoji(product.sourceStatus)}
                        </td>

                        <td className="px-4 py-3">
                          <div className="max-w-[280px]">
                            <div className="font-medium text-gray-900">
                              {product.titleEdited ?? product.titleSource}
                            </div>
                            <div className="mt-1 text-xs text-gray-500">
                              {product.categorySource ?? "-"}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-gray-700">
                          {product.brand ?? "-"}
                        </td>

                        <td className="px-4 py-3 text-gray-700">
                          {product.sku ?? "-"}
                        </td>

                        <td className="px-4 py-3 text-gray-700">
                          {product.barcode ?? "-"}
                        </td>

                        <td className="px-4 py-3 text-gray-700">
                          {formatPrice(product.listPriceSource)}
                        </td>

                        <td className="px-4 py-3 text-gray-700">
                          {formatPrice(product.salePriceSource)}
                        </td>

                        <td className="px-4 py-3 text-gray-700">
                          {product.deliveryDurationSource != null
                            ? `${product.deliveryDurationSource} gün`
                            : "-"}
                        </td>

                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min={1}
                            value={deliveryDrafts[product.id] ?? ""}
                            onChange={(e) => setDraft(product.id, e.target.value)}
                            className="w-24 rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:border-black"
                          />
                        </td>

                        <td className="px-4 py-3">
                          <Link
                            href={`/products/${product.id}`}
                            className="inline-flex rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                          >
                            Aç
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
            <div className="text-sm text-gray-500">
              {products.length} kayıt gösteriliyor
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goPrev}
                disabled={page <= 1}
                className="rounded-xl border px-4 py-2 text-sm transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Önceki
              </button>

              <div className="text-sm text-gray-500">
                {page} / {totalPages}
              </div>

              <button
                type="button"
                onClick={goNext}
                disabled={page >= totalPages}
                className="rounded-xl border px-4 py-2 text-sm transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Sonraki
              </button>
            </div>
          </div>
        </section>
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