type DuplicateProduct = {
  id: string;
  titleSource: string;
  titleEdited: string | null;
  barcode: string | null;
  sku: string | null;
  sourceProductId: string | null;
};

export function duplicatePairKey(firstId: string, secondId: string) {
  return [firstId, secondId].sort().join(":");
}

function normalizedTitle(product: DuplicateProduct) {
  return (product.titleEdited ?? product.titleSource).toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function titleSimilarity(first: DuplicateProduct, second: DuplicateProduct) {
  const a = new Set(normalizedTitle(first).split(" ").filter(Boolean));
  const b = new Set(normalizedTitle(second).split(" ").filter(Boolean));
  if (!a.size || !b.size) return 0;
  const intersection = [...a].filter((word) => b.has(word)).length;
  return intersection / new Set([...a, ...b]).size;
}

export function detectDuplicatePairs(products: DuplicateProduct[], excludedPairKeys: Set<string>) {
  const pairs: Array<{ pairKey: string; reasons: string[]; similarity: number; first: DuplicateProduct; second: DuplicateProduct }> = [];
  for (let i = 0; i < products.length; i += 1) {
    for (let j = i + 1; j < products.length; j += 1) {
      const first = products[i]; const second = products[j]; const reasons: string[] = [];
      if (first.barcode && first.barcode === second.barcode) reasons.push("barcode");
      if (first.sku && first.sku === second.sku) reasons.push("SKU");
      if (first.sourceProductId && first.sourceProductId === second.sourceProductId) reasons.push("source external ID");
      const similarity = titleSimilarity(first, second);
      if (similarity >= 0.72) reasons.push("similar title");
      const pairKey = duplicatePairKey(first.id, second.id);
      if (reasons.length && !excludedPairKeys.has(pairKey)) pairs.push({ pairKey, reasons, similarity, first, second });
    }
  }
  return pairs.sort((a, b) => b.reasons.length - a.reasons.length || b.similarity - a.similarity);
}
