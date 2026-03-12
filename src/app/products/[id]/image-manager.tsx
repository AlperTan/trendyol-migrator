"use client";

import { toast } from "sonner";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
    () => images.filter((img) => img.isSelected).sort((a, b) => a.sortOrder - b.sortOrder),
    [images]
  );

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
    const temp = swapped[index];
    swapped[index] = swapped[targetIndex];
    swapped[targetIndex] = temp;

    const normalized = swapped.map((img, i) => ({
      ...img,
      sortOrder: i + 1,
    }));

    setImages(normalized);
  }

  async function saveChanges() {
    setSaving(true);

    try {
      const payload = {
        images: images.map((img, index) => ({
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
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Görsel Yönetimi</h3>
          <p className="text-sm text-gray-500">
            Seçili görseller export edilir. İlk seçili görsel kapak kabul edilir.
          </p>
        </div>

        <button
          onClick={saveChanges}
          disabled={saving}
          className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-100"
        >
          {saving ? "Kaydediliyor..." : "Görsel Ayarlarını Kaydet"}
        </button>
      </div>

      {images.length === 0 ? (
        <div className="rounded-xl border p-4 text-sm text-gray-500">
          Bu ürün için görsel yok.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {sortImages(images).map((image) => {
            const isCover = image.isSelected && image.id === coverImageId;

            return (
              <div key={image.id} className="rounded-2xl border p-3">
                <img
                  src={image.localPath ?? image.sourceUrl}
                  alt=""
                  className="h-48 w-full rounded-xl object-cover"
                />

                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">
                      Sıra: {image.sortOrder}
                    </div>

                    {isCover ? (
                      <span className="rounded-full border px-2 py-1 text-xs">
                        Kapak
                      </span>
                    ) : null}
                  </div>

                  <div className="text-xs text-gray-500">
                    Kaynak: {image.downloadStatus === "downloaded" ? "local" : "remote"}
                  </div>

                  <div className="text-xs text-gray-500 break-all">
                    {image.localPath ?? image.sourceUrl}
                  </div>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={image.isSelected}
                      onChange={() => toggleSelected(image.id)}
                    />
                    Export’a dahil et
                  </label>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => moveImage(image.id, "up")}
                      className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-100"
                    >
                      Yukarı
                    </button>

                    <button
                      type="button"
                      onClick={() => moveImage(image.id, "down")}
                      className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-100"
                    >
                      Aşağı
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}