"use client";

import { useEffect } from "react";

type ImageItem = {
  src: string;
  alt?: string;
};

export default function ImageLightbox({
  images,
  currentIndex,
  open,
  onClose,
  onPrev,
  onNext,
}: {
  images: ImageItem[];
  currentIndex: number;
  open: boolean;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }

      if (event.key === "ArrowLeft" && onPrev) {
        onPrev();
      }

      if (event.key === "ArrowRight" && onNext) {
        onNext();
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose, onPrev, onNext]);

  if (!open || !images[currentIndex]) return null;

  const current = images[currentIndex];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm md:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Görsel önizleme"
    >
      <div
        className="relative w-full max-w-7xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="absolute left-3 top-3 z-20 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-gray-700 shadow-sm">
          {currentIndex + 1} / {images.length}
        </div>

        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-20 rounded-full bg-white/90 px-3 py-2 text-sm font-medium text-gray-800 shadow-sm transition hover:bg-white"
        >
          Kapat
        </button>

        {images.length > 1 && onPrev ? (
          <button
            onClick={onPrev}
            className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/90 px-4 py-3 text-lg shadow-sm transition hover:bg-white"
            aria-label="Önceki görsel"
          >
            ←
          </button>
        ) : null}

        {images.length > 1 && onNext ? (
          <button
            onClick={onNext}
            className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/90 px-4 py-3 text-lg shadow-sm transition hover:bg-white"
            aria-label="Sonraki görsel"
          >
            →
          </button>
        ) : null}

        <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/95 p-3 shadow-2xl md:p-4">
          <div className="overflow-hidden rounded-[22px] bg-gray-100">
            <img
              src={current.src}
              alt={current.alt ?? ""}
              className="max-h-[78vh] w-full object-contain"
            />
          </div>

          {images.length > 1 ? (
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {images.map((image, index) => {
                const isActive = index === currentIndex;

                return (
                  <button
                    key={`${image.src}-${index}`}
                    type="button"
                    onClick={() => {
                      if (index === currentIndex) return;
                      if (!onPrev || !onNext) return;
                    }}
                    className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border transition md:h-20 md:w-20 ${
                      isActive
                        ? "border-gray-900 ring-2 ring-gray-900/10"
                        : "border-gray-200 hover:border-gray-400"
                    }`}
                    aria-label={`Görsel ${index + 1}`}
                  >
                    <img
                      src={image.src}
                      alt={image.alt ?? ""}
                      className="h-full w-full object-cover"
                    />
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <p className="mt-3 text-center text-xs text-white/80">
          Kısayollar: Esc ile kapat, yön tuşları ile geçiş yap.
        </p>
      </div>
    </div>
  );
}