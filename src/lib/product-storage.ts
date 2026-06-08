import path from "node:path";

export function getProductStorageRoot() {
  const configured = process.env.PRODUCT_STORAGE_DIR?.trim();

  if (!configured) {
    return path.join(process.cwd(), "public", "storage", "products");
  }

  return path.isAbsolute(configured)
    ? configured
    : path.resolve(process.cwd(), configured);
}

export function getProductStorageDir(productId: string) {
  return path.join(getProductStorageRoot(), productId);
}

export function getProductImagePublicPath(productId: string, filename: string) {
  return `/storage/products/${productId}/${filename}`;
}
