import type { ExportResult, MarketplaceAdapter, ValidationResult } from "@/core/marketplace";
import type { NormalizedProduct } from "@/core/normalized-product";
import { calculateProductCompleteness } from "@/core/completeness";
import { createOrUpdateProducts } from "./client";
import { mapProductToTrendyol } from "./mapper";

export function validateTrendyolProduct(product: NormalizedProduct): ValidationResult {
  const completeness = calculateProductCompleteness(product, "trendyol");
  const payload = mapProductToTrendyol(product);
  const errors = [...completeness.errors];
  const warnings = [...completeness.warnings];
  if (!payload.productMainId) errors.push("productMainId or SKU fallback is required for Trendyol");
  const data = product.marketplaceData.trendyol;
  if (data?.requiredAttributes.length && payload.attributes.length === 0) {
    errors.push("Required Trendyol category attributes are missing");
  }
  if (!data?.cargoCompanyId) warnings.push("cargoCompanyId is missing; Trendyol may require it");
  if (!data?.shipmentAddressId) warnings.push("shipmentAddressId is missing; Trendyol may require it");
  if (!data?.returningAddressId) warnings.push("returningAddressId is missing; Trendyol may require it");
  return {
    valid: errors.length === 0,
    errors: Array.from(new Set(errors)),
    warnings: Array.from(new Set(warnings)),
  };
}

export async function exportProductToTrendyol(
  product: NormalizedProduct,
  options: { existingLink?: boolean } = {}
): Promise<ExportResult> {
  const payload = mapProductToTrendyol(product);
  const operation = options.existingLink ? "update" : "create";
  const response = await createOrUpdateProducts([payload], operation);
  const batchRequestId =
    typeof response.batchRequestId === "string" ? response.batchRequestId : null;
  if (!batchRequestId) throw new Error("Trendyol batch submission returned no batchRequestId");
  const action = options.existingLink ? "update" : "create";
  return {
    success: true,
    externalProductId: payload.barcode,
    externalId: payload.barcode,
    requestPayload: { action, items: [payload] },
    responsePayload: { action, status: "batch-submitted", batchRequestId, response },
  };
}

export const trendyolAdapter: MarketplaceAdapter = {
  marketplace: "trendyol",
  validateProduct: validateTrendyolProduct,
  mapProduct: mapProductToTrendyol,
  exportProduct: exportProductToTrendyol,
};
