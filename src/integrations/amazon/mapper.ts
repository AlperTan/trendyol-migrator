import type { NormalizedProduct } from "@/core/normalized-product";
import type { AmazonListingPayload } from "./types";
export function mapProductToAmazon(product: NormalizedProduct): AmazonListingPayload { return { itemName: product.title, description: product.description, sellerSku: product.sku, externalProductId: product.barcode, price: product.price, currency: product.currency, quantity: product.stock, productType: product.categoryName, images: product.images.filter((image) => image.selectedForExport).map((image) => image.url) }; }
