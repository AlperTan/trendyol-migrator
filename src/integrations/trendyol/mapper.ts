import type { NormalizedProduct } from "@/core/normalized-product";
import type { TrendyolAttribute, TrendyolProductPayload } from "./types";

export function absoluteTrendyolImageUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    const base = process.env.PUBLIC_BASE_URL?.trim();
    if (!base || !value.startsWith("/")) return null;
    try {
      const url = new URL(`${base.replace(/\/+$/, "")}/${value.replace(/^\/+/, "")}`);
      return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
    } catch {
      return null;
    }
  }
}

function attributes(value: Record<string, unknown>): TrendyolAttribute[] {
  const result = value.trendyol;
  return Array.isArray(result) ? (result as TrendyolAttribute[]) : [];
}

export function mapProductToTrendyol(product: NormalizedProduct): TrendyolProductPayload {
  const data = product.marketplaceData.trendyol;
  const images = product.images
    .filter((image) => image.selectedForExport)
    .map((image) => absoluteTrendyolImageUrl(image.url))
    .filter((url): url is string => Boolean(url))
    .map((url) => ({ url }));
  const price = product.price ?? 0;

  return {
    barcode: product.barcode?.trim() ?? "",
    title: product.title.trim(),
    productMainId: data?.productMainId?.trim() || product.sku?.trim() || "",
    brandId: data?.brandId ?? 0,
    categoryId: data?.categoryId ?? 0,
    quantity: product.stock,
    stockCode: product.sku?.trim() ?? "",
    dimensionalWeight: 1,
    description: product.description?.trim() || product.title.trim(),
    currencyType: product.currency.toUpperCase(),
    listPrice: price,
    salePrice: price,
    vatRate: product.vatRate ?? 0,
    ...(data?.cargoCompanyId ? { cargoCompanyId: data.cargoCompanyId } : {}),
    ...(data?.deliveryDuration ? { deliveryDuration: data.deliveryDuration } : {}),
    ...(data?.shipmentAddressId ? { shipmentAddressId: data.shipmentAddressId } : {}),
    ...(data?.returningAddressId ? { returningAddressId: data.returningAddressId } : {}),
    images,
    attributes: attributes(product.attributes),
  };
}
