import type { NormalizedProduct } from "./normalized-product";

export const MARKETPLACES = [
  "trendyol",
  "shopify",
  "n11",
  "hepsiburada",
  "pttavm",
  "amazon",
] as const;

export type Marketplace = (typeof MARKETPLACES)[number];

export type ValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

export type ExportResult = {
  success: boolean;
  externalId?: string;
  requestPayload?: unknown;
  responsePayload?: unknown;
};

export interface MarketplaceAdapter {
  marketplace: Marketplace;
  validateProduct(product: NormalizedProduct): ValidationResult;
  mapProduct(product: NormalizedProduct): unknown;
  exportProduct(product: NormalizedProduct): Promise<ExportResult>;
}

export function validateBasicProduct(product: NormalizedProduct): ValidationResult {
  const errors: string[] = [];
  if (!product.title.trim()) errors.push("Title is required");
  if (product.price == null || product.price < 0) errors.push("Valid price is required");
  if (product.stock < 0) errors.push("Stock cannot be negative");
  return { valid: errors.length === 0, errors, warnings: [] };
}

export function notImplementedExport(marketplace: Marketplace): never {
  throw new Error(`${marketplace} export is not implemented yet`);
}
