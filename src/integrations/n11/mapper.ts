import type { NormalizedProduct } from "@/core/normalized-product";
import type { N11ProductPayload } from "./types";
export function mapProductToN11(product: NormalizedProduct): N11ProductPayload { return { title: product.title, description: product.description, stockCode: product.sku, barcode: product.barcode, price: product.price, stock: product.stock, categoryName: product.categoryName, images: product.images.filter((image) => image.selectedForExport).map((image) => image.url) }; }
