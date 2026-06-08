import type { NormalizedProduct } from "@/core/normalized-product";
import type { TrendyolProductPayload } from "./types";
export function mapProductToTrendyol(product: NormalizedProduct): TrendyolProductPayload { return { title: product.title, description: product.description, brand: product.brand, stockCode: product.sku, barcode: product.barcode, quantity: product.stock, salePrice: product.price, vatRate: product.vatRate, categoryName: product.categoryName, images: product.images.filter((image) => image.selectedForExport).map((image) => image.url) }; }
