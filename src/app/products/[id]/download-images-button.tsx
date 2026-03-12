"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function DownloadImagesButton({ productId }: { productId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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

      toast.success(`${data.downloaded} görsel indirildi`);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Beklenmeyen hata oluştu");
    }

    setLoading(false);
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="rounded-2xl border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-100 disabled:opacity-50"
    >
      {loading ? "İndiriliyor..." : "Görselleri Lokale İndir"}
    </button>
  );
}