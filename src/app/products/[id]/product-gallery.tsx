"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import ImageLightbox from "@/components/image-lightbox";

type ProductImage = {
  id: string;
  sourceUrl: string;
  localPath: string | null;
  downloadStatus: string | null;
  sortOrder: number;
  isSelected: boolean;
};

export default function ProductGallery({
  images,
  title,
}: {
  images: ProductImage[];
  title: string;
}) {
  const ordered = useMemo(
    () => [...images].sort((a, b) => a.sortOrder - b.sortOrder),
    [images]
  );

  const selected = ordered.filter((img) => img.isSelected);
  const gallery = selected.length > 0 ? selected : ordered;

  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const thumbRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (activeIndex > gallery.length - 1) {
      setActiveIndex(0);
    }
  }, [activeIndex, gallery.length]);

  useEffect(() => {
    const activeThumb = thumbRefs.current[activeIndex];
    activeThumb?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [activeIndex]);

  if (gallery.length === 0) {
    return (
      <div className="rounded-[28px] border border-dashed border-gray-300 bg-white p-8 shadow-sm">
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[24px] bg-gray-50 text-center">
          <div className="mb-3 text-4xl">🖼️</div>
          <div className="text-base font-semibold text-gray-700">
            Görsel bulunamadı
          </div>
          <p className="mt-2 max-w-sm text-sm text-gray-500">
            Bu ürün için henüz görüntülenebilir bir görsel yok. İndirilen veya
            seçili görseller burada görünecek.
          </p>
        </div>
      </div>
    );
  }

  const active = gallery[activeIndex];
  const activeSrc = active.localPath ?? active.sourceUrl;

  function goPrev() {
    setActiveIndex((prev) => (prev === 0 ? gallery.length - 1 : prev - 1));
  }

  function goNext() {
    setActiveIndex((prev) => (prev === gallery.length - 1 ? 0 : prev + 1));
  }

  const lightboxImages = gallery.map((img) => ({
    src: img.localPath ?? img.sourceUrl,
    alt: title,
  }));

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[30px] border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 md:px-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
              Ürün Galerisi
            </p>
            <h2 className="mt-1 text-sm font-medium text-gray-700">
              {selected.length > 0
                ? "Seçili görseller gösteriliyor"
                : "Tüm görseller gösteriliyor"}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
              {activeIndex + 1} / {gallery.length}
            </span>

            {activeIndex === 0 ? (
              <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold text-white">
                Kapak
              </span>
            ) : null}
          </div>
        </div>

        <div className="p-3 md:p-4">
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="group relative block w-full overflow-hidden rounded-[24px] bg-gray-100"
          >
            <div className="aspect-square w-full md:aspect-[4/4.2]">
              <img
                src={activeSrc}
                alt={title}
                className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.015]"
              />
            </div>

            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/60 via-black/20 to-transparent px-4 pb-4 pt-12 text-left">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-white/75">
                  Önizleme
                </div>
                <div className="mt-1 text-sm font-medium text-white">
                  Görseli büyüt
                </div>
              </div>

              <div className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-gray-800 shadow-sm">
                Yakınlaştır
              </div>
            </div>
          </button>

          {gallery.length > 1 ? (
            <div className="relative mt-4">
              <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-white to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-white to-transparent" />

              <div className="flex gap-3 overflow-x-auto px-1 pb-1">
                {gallery.map((image, index) => {
                  const src = image.localPath ?? image.sourceUrl;
                  const isActive = index === activeIndex;

                  return (
                    <button
                      key={image.id}
                      ref={(element) => {
                        thumbRefs.current[index] = element;
                      }}
                      type="button"
                      onClick={() => setActiveIndex(index)}
                      className={`group relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border bg-gray-100 transition md:h-24 md:w-24 ${
                        isActive
                          ? "border-gray-900 ring-2 ring-gray-900/10"
                          : "border-gray-200 hover:-translate-y-0.5 hover:border-gray-400"
                      }`}
                      aria-label={`Görsel ${index + 1}`}
                    >
                      <img
                        src={src}
                        alt={title}
                        className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                      />

                      {isActive ? (
                        <span className="absolute left-2 top-2 rounded-full bg-gray-900 px-2 py-0.5 text-[10px] font-semibold text-white">
                          Aktif
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {gallery.length > 1 ? (
            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={goPrev}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                ← Önceki
              </button>

              <p className="text-center text-xs text-gray-500">
                Thumbnail’lara tıklayabilir veya lightbox içinde yön tuşlarını
                kullanabilirsin.
              </p>

              <button
                type="button"
                onClick={goNext}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Sonraki →
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <ImageLightbox
        images={lightboxImages}
        currentIndex={activeIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onPrev={gallery.length > 1 ? goPrev : undefined}
        onNext={gallery.length > 1 ? goNext : undefined}
      />
    </div>
  );
}