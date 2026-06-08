import type { Marketplace } from "./marketplace";

export type CategoryMapping = {
  localCategoryId: string | null;
  localCategoryName: string | null;
  marketplace: Marketplace;
  targetCategoryId: string;
  targetCategoryName: string | null;
  requiredAttributes: Record<string, unknown>;
};
