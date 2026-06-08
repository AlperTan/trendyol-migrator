import type { NormalizedProduct } from "@/core/normalized-product";
import type { ShopifyProductPayload } from "./types";

function absoluteImageUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    const publicBaseUrl = process.env.PUBLIC_BASE_URL?.trim();
    if (!publicBaseUrl || !value.startsWith("/")) return null;

    try {
      const url = new URL(
        `${publicBaseUrl.replace(/\/+$/, "")}/${value.replace(/^\/+/, "")}`
      );
      return url.protocol === "https:" || url.protocol === "http:"
        ? url.toString()
        : null;
    } catch {
      return null;
    }
  }
}

export function mapProductToShopify(
  product: NormalizedProduct
): ShopifyProductPayload {
  const selectedImages = product.images.filter(
    (image) => image.selectedForExport
  );
  const resolvedImages = selectedImages.map((image) => ({
    original: image.url,
    absolute: absoluteImageUrl(image.url),
  }));

  return {
    product: {
      title: product.title.trim(),
      ...(product.description ? { descriptionHtml: product.description } : {}),
      ...(product.brand ? { vendor: product.brand } : {}),
      ...(product.categoryName ? { productType: product.categoryName } : {}),
      status: "DRAFT",
      tags: [
        `local-product-id:${product.id}`,
        ...(product.sourceMarketplace
          ? [`source-marketplace:${product.sourceMarketplace}`]
          : []),
      ],
    },
    variant: {
      price: String(product.price),
      ...(product.barcode ? { barcode: product.barcode } : {}),
      ...(product.sku
        ? { inventoryItem: { sku: product.sku, tracked: false } }
        : {}),
    },
    media: resolvedImages.filter((image) => image.absolute).map((image) => ({
      mediaContentType: "IMAGE",
      originalSource: image.absolute as string,
      alt: product.title,
    })),
    skippedImages: resolvedImages
      .filter((image) => !image.absolute)
      .map((image) => image.original),
  };
}
