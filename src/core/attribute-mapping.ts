import type { Marketplace } from "./marketplace";

export type AttributeMapping = {
  marketplace: Marketplace;
  localAttributeName: string;
  targetAttributeName: string;
  targetAttributeId: string | null;
  valueMapping: Record<string, string>;
};
