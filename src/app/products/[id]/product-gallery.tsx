"use client";

import { useMemo, useState } from "react";
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

  if (gallery.length === 0) {
    return (
      <div className="flex h-40 w-40 items-center justify-center rounded-2xl border text-sm text-gray-400">
        Görsel Yok
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
    <div className="space-y-3">
      <div className="relative">
        <button type="button" onClick={() => setLightboxOpen(true)} className="block">
          <img
            src={activeSrc}
            alt={title}
            className="h-52 w-52 rounded-2xl border object-cover transition hover:scale-[1.02]"
          />
        </button>

        {gallery.length > 1 ? (
          <>
            <button
              onClick={goPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-sm shadow hover:bg-white"
            >
              ←
            </button>
            <button
              onClick={goNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-sm shadow hover:bg-white"
            >
              →
            </button>
          </>
        ) : null}
      </div>

      {gallery.length > 1 ? (
        <div className="flex max-w-[420px] gap-2 overflow-x-auto pb-1">
          {gallery.map((img, index) => {
            const src = img.localPath ?? img.sourceUrl;
            const activeThumb = index === activeIndex;

            return (
              <button
                key={img.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={[
                  "shrink-0 rounded-xl border p-1 transition",
                  activeThumb ? "border-black" : "border-gray-200",
                ].join(" ")}
              >
                <img
                  src={src}
                  alt=""
                  className="h-16 w-16 rounded-lg object-cover"
                />
              </button>
            );
          })}
        </div>
      ) : null}

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