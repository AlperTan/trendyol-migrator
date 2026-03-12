"use client";

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
  if (!open || !images[currentIndex]) return null;

  const current = images[currentIndex];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-6xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-2 top-2 z-10 rounded-full bg-white/90 px-3 py-2 text-sm font-medium shadow hover:bg-white"
        >
          Kapat
        </button>

        {onPrev ? (
          <button
            onClick={onPrev}
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 px-4 py-3 text-lg shadow hover:bg-white"
          >
            ←
          </button>
        ) : null}

        {onNext ? (
          <button
            onClick={onNext}
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 px-4 py-3 text-lg shadow hover:bg-white"
          >
            →
          </button>
        ) : null}

        <div className="overflow-hidden rounded-2xl bg-white p-3 shadow-2xl">
          <img
            src={current.src}
            alt={current.alt ?? ""}
            className="max-h-[80vh] w-full rounded-xl object-contain"
          />
        </div>
      </div>
    </div>
  );
}