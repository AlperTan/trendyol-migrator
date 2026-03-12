"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function DownloadImagesButton({
  productId,
}: {
  productId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [lastDownloadedCount, setLastDownloadedCount] = useState<number | null>(
    null
  );
  const router = useRouter();

  const buttonLabel = useMemo(() => {
    if (loading) return "Görseller indiriliyor...";
    return "Görselleri Lokale İndir";
  }, [loading]);

  async function handleClick() {
    setLoading(true);

    try {
      const res = await fetch(`/api/products/${productId}/download-images`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.error ?? "Görseller indirilemedi");
        setLoading(false);
        return;
      }

      const downloadedCount =
        typeof data?.downloaded === "number" ? data.downloaded : 0;

      setLastDownloadedCount(downloadedCount);

      if (downloadedCount > 0) {
        toast.success(`${downloadedCount} görsel indirildi`);
      } else {
        toast.success("İndirilecek yeni görsel bulunamadı");
      }

      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Beklenmeyen hata oluştu");
    }

    setLoading(false);
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="group relative inline-flex min-h-[52px] items-center justify-center gap-3 overflow-hidden rounded-2xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span
          className={`inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/12 text-base transition ${
            loading ? "animate-pulse" : "group-hover:scale-105"
          }`}
          aria-hidden="true"
        >
          {loading ? "⏳" : "⬇"}
        </span>

        <span className="flex flex-col items-start text-left leading-tight">
          <span>{buttonLabel}</span>
          <span className="text-[11px] font-medium text-white/70">
            Remote görselleri local klasöre al
          </span>
        </span>
      </button>

      <div className="min-h-[20px] text-right text-xs text-gray-500">
        {loading ? (
          <span>İşlem tamamlandığında sayfa otomatik yenilenir.</span>
        ) : lastDownloadedCount != null ? (
          <span>
            Son işlem:{" "}
            <span className="font-semibold text-gray-800">
              {lastDownloadedCount}
            </span>{" "}
            görsel indirildi
          </span>
        ) : (
          <span>Ürünün görsellerini export öncesi local ortama indir.</span>
        )}
      </div>
    </div>
  );
}