import type { Marketplace, MarketplaceAdapter } from "@/core/marketplace";
import { notImplementedExport, validateBasicProduct } from "@/core/marketplace";
import type { NormalizedProduct } from "@/core/normalized-product";

export function createStubAdapter(
  marketplace: Marketplace,
  mapper: (product: NormalizedProduct) => unknown
): MarketplaceAdapter {
  return {
    marketplace,
    validateProduct: validateBasicProduct,
    mapProduct: mapper,
    async exportProduct() {
      return notImplementedExport(marketplace);
    },
  };
}

export class MarketplaceClientStub {
  constructor(readonly marketplace: Marketplace) {}

  async request(): Promise<never> {
    throw new Error(`${this.marketplace} client is not implemented yet`);
  }
}
