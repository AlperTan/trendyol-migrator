export type CategorySuggestion = {
  externalId: string;
  name: string;
  confidence: number;
};

function normalize(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value: string) {
  return new Set(normalize(value).split(" ").filter((token) => token.length > 1));
}

function similarity(input: string, candidate: string) {
  const left = tokens(input);
  const right = tokens(candidate);
  if (!left.size || !right.size) return 0;
  const overlap = [...left].filter((token) => right.has(token)).length;
  const union = new Set([...left, ...right]).size;
  const exactBonus = normalize(input).includes(normalize(candidate)) ? 0.25 : 0;
  return Math.min(1, overlap / union + exactBonus);
}

export function suggestTrendyolCategories(
  input: { title: string; localCategoryName?: string | null },
  categories: Array<{ externalId: string; name: string }>,
  limit = 3
): CategorySuggestion[] {
  const search = `${input.localCategoryName ?? ""} ${input.title}`.trim();
  return categories
    .map((category) => ({
      ...category,
      confidence: Math.round(similarity(search, category.name) * 100) / 100,
    }))
    .filter((category) => category.confidence > 0)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, limit);
}

export function matchBrand(
  brand: string | null,
  brands: Array<{ externalId: string; name: string }>
) {
  if (!brand?.trim()) return null;
  const normalized = normalize(brand);
  const exact = brands.find((item) => normalize(item.name) === normalized);
  if (exact) return { ...exact, confidence: 1 };
  const ranked = brands
    .map((item) => ({ ...item, confidence: similarity(brand, item.name) }))
    .sort((a, b) => b.confidence - a.confidence);
  return ranked[0]?.confidence >= 0.75 ? ranked[0] : null;
}
