import type { Marketplace } from "./marketplace";
import type { NormalizedProduct } from "./normalized-product";

export type ProductCompleteness = {
  score: number;
  ready: boolean;
  errors: string[];
  warnings: string[];
  missingFields: string[];
};

type Check = { field: string; ok: boolean; message: string };

function hasExportableImage(product: NormalizedProduct) {
  return product.images.some((image) => {
    if (!image.selectedForExport) return false;
    try {
      const url = new URL(image.url, process.env.PUBLIC_BASE_URL);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  });
}

function result(required: Check[], warningChecks: Check[]): ProductCompleteness {
  const errors = required.filter((check) => !check.ok).map((check) => check.message);
  const warnings = warningChecks.filter((check) => !check.ok).map((check) => check.message);
  const missingFields = required.filter((check) => !check.ok).map((check) => check.field);
  const passed = [...required, ...warningChecks].filter((check) => check.ok).length;
  const total = required.length + warningChecks.length;
  return {
    score: total ? Math.round((passed / total) * 100) : 100,
    ready: errors.length === 0,
    errors,
    warnings,
    missingFields,
  };
}

export function calculateProductCompleteness(
  product: NormalizedProduct,
  marketplace: Extract<Marketplace, "shopify" | "trendyol">
): ProductCompleteness {
  const imageCount = product.images.filter((image) => image.selectedForExport).length;

  if (marketplace === "shopify") {
    return result(
      [
        { field: "title", ok: Boolean(product.title.trim()), message: "Missing title" },
        { field: "price", ok: product.price != null && product.price > 0, message: "Missing or invalid price" },
      ],
      [
        { field: "sku", ok: Boolean(product.sku?.trim()), message: "Missing SKU" },
        { field: "images", ok: hasExportableImage(product), message: "No exportable images" },
        { field: "stock", ok: product.stock > 0, message: "No stock" },
      ]
    );
  }

  const trendyol = product.marketplaceData.trendyol;
  const uncommonCurrency = !["TRY", "USD", "EUR"].includes(product.currency.toUpperCase());
  return result(
    [
      { field: "title", ok: Boolean(product.title.trim()), message: "Missing title" },
      { field: "barcode", ok: Boolean(product.barcode?.trim()), message: "Missing barcode" },
      { field: "brandId", ok: Boolean(trendyol?.brandId), message: "Missing brandId" },
      { field: "categoryId", ok: Boolean(trendyol?.categoryId), message: "Missing categoryId" },
      { field: "stockCode", ok: Boolean(product.sku?.trim()), message: "Missing stockCode/SKU" },
      { field: "stock", ok: product.stock > 0, message: "Missing stock" },
      { field: "price", ok: product.price != null && product.price > 0, message: "Missing or invalid price" },
      { field: "vatRate", ok: product.vatRate != null && product.vatRate >= 0, message: "Missing vatRate" },
      { field: "images", ok: hasExportableImage(product), message: "No exportable absolute image URL" },
    ],
    [
      {
        field: "attributes",
        ok: Object.keys(product.attributes).length > 0,
        message: "Missing optional attributes",
      },
      { field: "currency", ok: !uncommonCurrency, message: `Uncommon currency: ${product.currency}` },
      { field: "imageCount", ok: imageCount >= 3, message: "Low image count" },
    ]
  );
}
