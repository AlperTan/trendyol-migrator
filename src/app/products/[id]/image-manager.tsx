"use client";

import { DragEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import ImageLightbox from "@/components/image-lightbox";

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

function reorderImages(
  items: ProductImage[],
  activeId: string,
  overId: string
): ProductImage[] {
  const current = [...items];
  const fromIndex = current.findIndex((img) => img.id === activeId);
  const toIndex = current.findIndex((img) => img.id === overId);

  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
    return current;
  }

  const [moved] = current.splice(fromIndex, 1);
  current.splice(toIndex, 0, moved);

  return current.map((img, index) => ({
    ...img,
    sortOrder: index + 1,
  }));
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
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    setImages(sortImages(initialImages));
  }, [initialImages]);

  const orderedImages = useMemo(() => sortImages(images), [images]);

  const selectedImages = useMemo(
    () => orderedImages.filter((img) => img.isSelected),
    [orderedImages]
  );

  const coverImageId = selectedImages[0]?.id ?? null;

  const lightboxImages = useMemo(
    () =>
      orderedImages.map((img) => ({
        src: img.localPath ?? img.sourceUrl,
        alt: "Ürün görseli",
      })),
    [orderedImages]
  );

  function toggleSelected(imageId: string) {
    setImages((prev) =>
      prev.map((img) =>
        img.id === imageId ? { ...img, isSelected: !img.isSelected } : img
      )
    );
  }

  function openLightbox(index: number) {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }

  function onDragStart(event: DragEvent<HTMLDivElement>, imageId: string) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", imageId);
    setDraggingId(imageId);
  }

  function onDragOver(event: DragEvent<HTMLDivElement>, imageId: string) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    if (dragOverId !== imageId) {
      setDragOverId(imageId);
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>, overId: string) {
    event.preventDefault();
    const activeId = event.dataTransfer.getData("text/plain") || draggingId;

    if (!activeId || activeId === overId) {
      setDraggingId(null);
      setDragOverId(null);
      return;
    }

    setImages((prev) => reorderImages(sortImages(prev), activeId, overId));
    setDraggingId(null);
    setDragOverId(null);
  }

  function onDragEnd() {
    setDraggingId(null);
    setDragOverId(null);
  }

  function goPrev() {
    setLightboxIndex((prev) =>
      prev === 0 ? lightboxImages.length - 1 : prev - 1
    );
  }

  function goNext() {
    setLightboxIndex((prev) =>
      prev === lightboxImages.length - 1 ? 0 : prev + 1
    );
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
        toast.error(data?.error ?? "Görsel ayarları kaydedilemedi");
        setSaving(false);
        return;
      }

      setImages(sortImages(data.images ?? []));
      router.refresh();
      toast.success("Görsel ayarları kaydedildi");
    } catch (error) {
      console.error(error);
      toast.error("Beklenmeyen hata oluştu");
    }

    setSaving(false);
  }

  return (
    <section className="rounded-[30px] border border-gray-200 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-5 flex flex-col gap-4 border-b border-gray-100 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
            Görsel Yönetimi
          </p>
          <h2 className="mt-1 text-xl font-semibold text-gray-900">
            Kompakt görsel sıralama alanı
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Görseller kare kartlar halinde listelenir. Sürükleyip bırakarak
            sırayı değiştir, tıklayarak büyük önizlemeyi aç, export için
            seçilecek görselleri işaretle.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700">
            {selectedImages.length} seçili / {orderedImages.length} toplam
          </span>

          <button
            type="button"
            onClick={saveChanges}
            disabled={saving}
            className="rounded-2xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Kaydediliyor..." : "Görsel Ayarlarını Kaydet"}
          </button>
        </div>
      </div>

      {orderedImages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <div className="text-3xl">🖼️</div>
          <div className="mt-3 text-base font-semibold text-gray-700">
            Bu ürün için görsel yok
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Görseller indirildiğinde burada listelenecek.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {orderedImages.map((image, index) => {
            const src = image.localPath ?? image.sourceUrl;
            const isCover = image.isSelected && image.id === coverImageId;
            const isDragging = draggingId === image.id;
            const isDragOver = dragOverId === image.id;

            return (
              <div
                key={image.id}
                draggable
                onDragStart={(event) => onDragStart(event, image.id)}
                onDragOver={(event) => onDragOver(event, image.id)}
                onDrop={(event) => onDrop(event, image.id)}
                onDragEnd={onDragEnd}
                className={`group overflow-hidden rounded-[24px] border bg-white transition ${
                  isDragging
                    ? "scale-[0.98] opacity-60"
                    : "hover:-translate-y-0.5 hover:shadow-sm"
                } ${
                  isDragOver
                    ? "border-gray-900 ring-2 ring-gray-900/10"
                    : "border-gray-200"
                }`}
              >
                <button
                  type="button"
                  onClick={() => openLightbox(index)}
                  className="relative block aspect-square w-full overflow-hidden bg-gray-100"
                >
                  <img
                    src={src}
                    alt=""
                    className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                  />

                  <div className="absolute left-2 top-2 flex flex-wrap gap-1">
                    <span className="rounded-full bg-white/90 px-2 py-1 text-[10px] font-semibold text-gray-800 shadow-sm">
                      #{index + 1}
                    </span>

                    {isCover ? (
                      <span className="rounded-full bg-gray-900 px-2 py-1 text-[10px] font-semibold text-white shadow-sm">
                        Kapak
                      </span>
                    ) : null}
                  </div>

                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-3 pb-3 pt-8 text-left">
                    <div className="text-[11px] font-medium text-white/85">
                      Görseli büyüt
                    </div>
                  </div>
                </button>

                <div className="space-y-3 p-3">
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-1 text-[10px] font-semibold text-gray-700">
                      {getImageSourceLabel(image)}
                    </span>

                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                        image.isSelected
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {image.isSelected ? "Seçili" : "Pasif"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleSelected(image.id)}
                      className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                        image.isSelected
                          ? "bg-gray-900 text-white hover:bg-gray-800"
                          : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {image.isSelected ? "Seçimi Kaldır" : "Seç"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ImageLightbox
        images={lightboxImages}
        currentIndex={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onPrev={lightboxImages.length > 1 ? goPrev : undefined}
        onNext={lightboxImages.length > 1 ? goNext : undefined}
      />
    </section>
  );
}