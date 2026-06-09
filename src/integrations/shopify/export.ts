import type { ExportResult, MarketplaceAdapter, ValidationResult } from "@/core/marketplace";
import type { NormalizedProduct } from "@/core/normalized-product";
import { calculateProductCompleteness } from "@/core/completeness";
import { ShopifyClient } from "./client";
import { mapProductToShopify } from "./mapper";
import type { ShopifyExportOptions } from "./types";

const PRODUCT_FIELDS = `id title variants(first: 1) { nodes { id } }`;
const CREATE_PRODUCT = `mutation CreateProduct($product: ProductCreateInput!, $media: [CreateMediaInput!]) { productCreate(product: $product, media: $media) { product { ${PRODUCT_FIELDS} } userErrors { field message } } }`;
const UPDATE_PRODUCT = `mutation UpdateProduct($product: ProductUpdateInput!) { productUpdate(product: $product) { product { ${PRODUCT_FIELDS} } userErrors { field message } } }`;
const UPDATE_VARIANT = `mutation UpdateInitialVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) { productVariantsBulkUpdate(productId: $productId, variants: $variants) { productVariants { id barcode price inventoryItem { sku tracked } } userErrors { field message } } }`;

type ShopifyProduct = { id: string; title: string; variants: { nodes: Array<{ id: string }> } };
type CreateResponse = { productCreate: { product: ShopifyProduct | null } };
type UpdateResponse = { productUpdate: { product: ShopifyProduct | null } };
type VariantResponse = { productVariantsBulkUpdate: { productVariants: unknown[] } };

const COMMON_CURRENCIES = new Set(["TRY", "USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF"]);

export function validateShopifyProduct(product: NormalizedProduct): ValidationResult {
  const completeness = calculateProductCompleteness(product, "shopify");
  const errors = [...completeness.errors];
  const warnings = [...completeness.warnings];
  if (!COMMON_CURRENCIES.has(product.currency.toUpperCase())) {
    warnings.push(`Currency ${product.currency} is uncommon and will not be sent to Shopify`);
  }
  return {
    valid: errors.length === 0,
    errors: Array.from(new Set(errors)),
    warnings: Array.from(new Set(warnings)),
  };
}

export async function exportProductToShopify(
  product: NormalizedProduct,
  options: ShopifyExportOptions = {}
): Promise<ExportResult> {
  const client = new ShopifyClient();
  const payload = mapProductToShopify(product);
  const action = options.externalProductId ? "updated" : "created";
  const warnings = [
    ...validateShopifyProduct(product).warnings,
    ...(payload.skippedImages.length
      ? [`${payload.skippedImages.length} image URL(s) were skipped because Shopify cannot fetch them`]
      : []),
    ...(product.stock > 0
      ? ["Inventory quantity was not sent because a Shopify location ID is not configured"]
      : []),
  ];

  let shopifyProduct: ShopifyProduct | null;
  let productVariables: Record<string, unknown>;

  if (options.externalProductId) {
    productVariables = {
      product: { ...payload.product, id: options.externalProductId },
    };
    const response = await client.graphql<UpdateResponse>(UPDATE_PRODUCT, productVariables);
    shopifyProduct = response.productUpdate.product;
    if (payload.media.length) {
      warnings.push("Images are not replaced during updates; existing Shopify media was kept");
    }
  } else {
    productVariables = { product: payload.product, media: payload.media };
    const response = await client.graphql<CreateResponse>(CREATE_PRODUCT, productVariables);
    shopifyProduct = response.productCreate.product;
  }

  if (!shopifyProduct) throw new Error(`Shopify product ${action} returned no product`);

  const variantId = shopifyProduct.variants.nodes[0]?.id;
  let variantResponse: unknown = null;
  const variantVariables = variantId
    ? { productId: shopifyProduct.id, variants: [{ id: variantId, ...payload.variant }] }
    : null;

  if (!variantVariables) {
    warnings.push("Shopify returned no initial variant; price, SKU, and barcode were not updated");
  } else {
    try {
      variantResponse = await client.graphql<VariantResponse>(UPDATE_VARIANT, variantVariables);
    } catch (error) {
      warnings.push(`Variant update failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  return {
    success: true,
    externalProductId: shopifyProduct.id,
    externalId: shopifyProduct.id,
    requestPayload: { action, productVariables, variantVariables },
    responsePayload: {
      action,
      product: shopifyProduct,
      variantResponse,
      warnings,
      skippedImages: payload.skippedImages,
    },
  };
}

export const shopifyAdapter: MarketplaceAdapter = {
  marketplace: "shopify",
  validateProduct: validateShopifyProduct,
  mapProduct: mapProductToShopify,
  exportProduct: exportProductToShopify,
};
