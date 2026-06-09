import { calculateProductCompleteness } from "./completeness";
import type { NormalizedProduct } from "./normalized-product";

export function getMarketplaceReadiness(product: NormalizedProduct) {
  return {
    shopify: calculateProductCompleteness(product, "shopify"),
    trendyol: calculateProductCompleteness(product, "trendyol"),
  };
}

export type MarketplaceReadiness = ReturnType<typeof getMarketplaceReadiness>;
