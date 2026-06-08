import type {
  ExportResult,
  MarketplaceAdapter,
  ValidationResult,
} from "@/core/marketplace";
import type { NormalizedProduct } from "@/core/normalized-product";
import { ShopifyClient } from "./client";
import { mapProductToShopify } from "./mapper";

const CREATE_PRODUCT = `
  mutation CreateProduct($product: ProductCreateInput!, $media: [CreateMediaInput!]) {
    productCreate(product: $product, media: $media) {
      product {
        id
        title
        variants(first: 1) {
          nodes { id }
        }
      }
      userErrors { field message }
    }
  }
`;

const UPDATE_VARIANT = `
  mutation UpdateInitialVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      productVariants { id barcode price inventoryItem { sku tracked } }
      userErrors { field message }
    }
  }
`;

type CreateProductResponse = {
  productCreate: {
    product: {
      id: string;
      title: string;
      variants: { nodes: Array<{ id: string }> };
    } | null;
  };
};

type UpdateVariantResponse = {
  productVariantsBulkUpdate: {
    productVariants: Array<{
      id: string;
      barcode: string | null;
      price: string;
      inventoryItem: { sku: string | null; tracked: boolean };
    }>;
  };
};

export function validateShopifyProduct(
  product: NormalizedProduct
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!product.title.trim()) errors.push("Title is required");
  if (product.price == null || product.price < 0) {
    errors.push("A valid price is required");
  }
  if (!product.images.some((image) => image.selectedForExport)) {
    warnings.push("No image is selected for export");
  }

  return { valid: errors.length === 0, errors, warnings };
}

export async function exportProductToShopify(
  product: NormalizedProduct
): Promise<ExportResult> {
  const client = new ShopifyClient();
  const payload = mapProductToShopify(product);
  const createVariables = {
    product: payload.product,
    media: payload.media,
  };
  const created = await client.graphql<CreateProductResponse>(
    CREATE_PRODUCT,
    createVariables
  );
  const shopifyProduct = created.productCreate.product;

  if (!shopifyProduct) {
    throw new Error("Shopify productCreate returned no product");
  }

  const variantId = shopifyProduct.variants.nodes[0]?.id;
  if (!variantId) {
    throw new Error("Shopify productCreate returned no initial variant");
  }

  const variantVariables = {
    productId: shopifyProduct.id,
    variants: [{ id: variantId, ...payload.variant }],
  };
  const updated = await client.graphql<UpdateVariantResponse>(
    UPDATE_VARIANT,
    variantVariables
  );
  const warnings = [
    ...validateShopifyProduct(product).warnings,
    ...(payload.skippedImages.length
      ? [
          `${payload.skippedImages.length} local/private image URL(s) were skipped because Shopify cannot fetch them`,
        ]
      : []),
    ...(product.stock > 0
      ? [
          "Inventory quantity was not sent because a Shopify location ID is not configured",
        ]
      : []),
  ];

  return {
    success: true,
    externalProductId: shopifyProduct.id,
    externalId: shopifyProduct.id,
    requestPayload: { createVariables, variantVariables },
    responsePayload: {
      product: shopifyProduct,
      variants: updated.productVariantsBulkUpdate.productVariants,
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
