import type { NormalizedProduct } from "@/core/normalized-product";
import type { ShopifyProductPayload } from "./types";
export function mapProductToShopify(product: NormalizedProduct): ShopifyProductPayload { return { title: product.title, descriptionHtml: product.description, vendor: product.brand, sku: product.sku, barcode: product.barcode, price: product.price, inventoryQuantity: product.stock, images: product.images.filter((image) => image.selectedForExport).map((image) => image.url) }; }
