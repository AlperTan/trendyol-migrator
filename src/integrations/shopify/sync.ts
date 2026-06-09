import { db } from "@/lib/db";
import { toInputJson } from "@/lib/marketplace-api";
import { shopifyGraphql } from "./client";

export async function syncShopifyProductTypes() {
  const data = await shopifyGraphql<{ productTypes: { nodes: string[] } }>(
    `query ProductTypes { productTypes(first: 250) { nodes } }`,
    {}
  );
  for (const name of data.productTypes.nodes.filter(Boolean)) {
    await db.marketplaceCategoryCache.upsert({
      where: { marketplace_externalId: { marketplace: "shopify", externalId: name } },
      update: { name, rawPayload: toInputJson({ type: "productType", name }) },
      create: { marketplace: "shopify", externalId: name, name, rawPayload: toInputJson({ type: "productType", name }) },
    });
  }
  return { count: data.productTypes.nodes.length };
}
