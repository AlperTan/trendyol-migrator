import type { NormalizedProduct } from "@/core/normalized-product";
import type { ShopifyProductPayload } from "./types";

function isPublicImageUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function mapProductToShopify(
  product: NormalizedProduct
): ShopifyProductPayload {
  const selectedImages = product.images.filter(
    (image) => image.selectedForExport
  );
  const publicImages = selectedImages.filter((image) =>
    isPublicImageUrl(image.url)
  );

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
    media: publicImages.map((image) => ({
      mediaContentType: "IMAGE",
      originalSource: image.url,
      alt: product.title,
    })),
    skippedImages: selectedImages
      .filter((image) => !isPublicImageUrl(image.url))
      .map((image) => image.url),
  };
}
