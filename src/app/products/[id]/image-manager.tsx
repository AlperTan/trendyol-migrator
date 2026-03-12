"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type ProductImage = {
  id: string;
  sourceUrl: string;
  localPath: string | null;
  downloadStatus: string | null;
  sortOrder: number;
  isSelected: boolean;
};

function sortImages(images: ProductImage[]) {
  return [...images].sort((a, b) => a.sortOrder - b.sortOrder);
}

function getImageSourceLabel(image: ProductImage) {
  return image.downloadStatus === "downloaded" ? "Local" : "Remote";
}

function truncateMiddle(value: string, start = 28, end = 18) {
  if (value.length <= start + end) return value;
  return `${value.slice(0, start)}...${value.slice(-end)}`;
}

export default function ImageManager({
  productId,
  initialImages,
}: {
  productId: string;
  initialImages: ProductImage[];
}) {
  const router = useRouter();

  const [images, setImages] = useState<ProductImage[]>(sortImages(initialImages));
  const [saving, setSaving] = useState(false);

  const selectedImages = useMemo(
    () =>
      sortImages(images).filter((img) => img.isSelected),
    [images]
  );

  const orderedImages = useMemo(() => sortImages(images), [images]);

  const coverImageId = selectedImages[0]?.id ?? null;

  function toggleSelected(imageId: string) {
    setImages((prev) =>
      prev.map((img) =>
        img.id === imageId ? { ...img, isSelected: !img.isSelected } : img
      )
    );
  }

  function moveImage(imageId: string, direction: "up" | "down") {
    const current = sortImages(images);
    const index = current.findIndex((img) => img.id === imageId);

    if (index === -1) return;
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === current.length - 1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const swapped = [...current];

    [swapped[index], swapped[targetIndex]] = [swapped[targetIndex], swapped[index]];

    const normalized = swapped.map((img, i) => ({
      ...img,
      sortOrder: i + 1,
    }));

    setImages(normalized);
  }

  async function copyPath(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Path kopyalandı");
    } catch (error) {
      console.error(error);
      toast.error("Path kopyalanamadı");
    }
  }

  async function saveChanges() {
    setSaving(true);

    try {
      const payload = {
        images: orderedImages.map((img, index) => ({
          id: img.id,
          isSelected: img.isSelected,
          sortOrder: index + 1,
        })),
      };

      const res = await fetch(`/api/products/${productId}/images`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.error ?? "Görseller kaydedilemedi");
        setSaving(false);
        return;
      }

      const nextImages = sortImages(data.images ?? []);
      setImages(nextImages);
      router.refresh();
      toast.success("Görsel ayarları kaydedildi");
    } catch (error) {
      console.error(error);
      toast.error("Beklenmeyen hata oluştu");
    }

    setSaving(false);
  }

  return (
    <section className="rounded-[30px] border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 border-b border-gray-100 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
            Görsel Yönetimi
          </p>
          <h3 className="mt-1 text-xl font-semibold text-gray-900">
            Export görsellerini düzenle
          </h3>
          <p className="mt-2 max-w-2xl text-sm text-gray-500">
            Seçili görseller export edilir. İlk seçili görsel kapak kabul edilir.
            Sıralamayı değiştirerek kapak görseli de belirleyebilirsin.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
            <span className="font-semibold text-gray-900">
              {selectedImages.length}
            </span>{" "}
            seçili / {images.length} toplam
          </div>

          <button
            onClick={saveChanges}
            disabled={saving}
            className="rounded-2xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Kaydediliyor..." : "Görsel Ayarlarını Kaydet"}
          </button>
        </div>
      </div>

      {images.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <div className="text-3xl">🖼️</div>
          <div className="mt-3 text-base font-semibold text-gray-700">
            Bu ürün için görsel yok
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Görseller indirildiğinde veya eşleştiğinde burada listelenecek.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
          {orderedImages.map((image, index) => {
            const isCover = image.isSelected && image.id === coverImageId;
            const src = image.localPath ?? image.sourceUrl;
            const pathValue = image.localPath ?? image.sourceUrl;

            return (
              <article
                key={image.id}
                className={`overflow-hidden rounded-[26px] border transition ${
                  image.isSelected
                    ? "border-gray-900/20 bg-gray-50 shadow-sm"
                    : "border-gray-200 bg-white"
                }`}
              >
                <div className="grid gap-4 p-4 md:grid-cols-[148px_minmax(0,1fr)] md:p-5">
                  <div className="relative overflow-hidden rounded-[22px] bg-gray-100">
                    <img
                      src={src}
                      alt=""
                      className="h-40 w-full object-cover md:h-full"
                    />

                    <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-gray-800 shadow-sm">
                        Sıra {index + 1}
                      </span>

                      {isCover ? (
                        <span className="rounded-full bg-gray-900 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
                          Kapak
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="min-w-0 space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700">
                        {getImageSourceLabel(image)}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          image.isSelected
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {image.isSelected ? "Export’a dahil" : "Pasif"}
                      </span>

                      {image.downloadStatus ? (
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                          {image.downloadStatus}
                        </span>
                      ) : null}
                    </div>

                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
                        Kaynak / Path
                      </div>
                      <div className="mt-2 rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-600">
                        <div className="break-all font-mono text-xs leading-5">
                          {truncateMiddle(pathValue)}
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => copyPath(pathValue)}
                            className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
                          >
                            Path Kopyala
                          </button>

                          <a
                            href={image.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
                          >
                            Kaynağı Aç
                          </a>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleSelected(image.id)}
                        className={`rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                          image.isSelected
                            ? "bg-gray-900 text-white hover:bg-gray-800"
                            : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {image.isSelected ? "Seçimi Kaldır" : "Export’a Dahil Et"}
                      </button>

                      <button
                        type="button"
                        onClick={() => moveImage(image.id, "up")}
                        disabled={index === 0}
                        className="rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        ↑ Yukarı
                      </button>

                      <button
                        type="button"
                        onClick={() => moveImage(image.id, "down")}
                        disabled={index === orderedImages.length - 1}
                        className="rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        ↓ Aşağı
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}