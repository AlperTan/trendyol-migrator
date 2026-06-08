import type { NormalizedProduct } from "@/core/normalized-product";
import type { HepsiburadaProductPayload } from "./types";
export function mapProductToHepsiburada(product: NormalizedProduct): HepsiburadaProductPayload { return { name: product.title, description: product.description, merchantSku: product.sku, barcode: product.barcode, price: product.price, stock: product.stock, categoryName: product.categoryName, images: product.images.filter((image) => image.selectedForExport).map((image) => image.url) }; }
