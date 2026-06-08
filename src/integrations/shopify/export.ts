import { createStubAdapter } from "../shared";
import { mapProductToShopify } from "./mapper";
export const shopifyAdapter = createStubAdapter("shopify", mapProductToShopify);
