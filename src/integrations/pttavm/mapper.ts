import type { NormalizedProduct } from "@/core/normalized-product";
import type { PttAvmProductPayload } from "./types";
export function mapProductToPttAvm(product: NormalizedProduct): PttAvmProductPayload { return { name: product.title, description: product.description, sku: product.sku, barcode: product.barcode, price: product.price, quantity: product.stock, categoryName: product.categoryName, images: product.images.filter((image) => image.selectedForExport).map((image) => image.url) }; }
