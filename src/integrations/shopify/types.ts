export type ShopifyProductCreateInput = {
  title: string;
  descriptionHtml?: string;
  vendor?: string;
  productType?: string;
  status: "DRAFT";
  tags: string[];
};

export type ShopifyVariantUpdateInput = {
  id: string;
  barcode?: string;
  price: string;
  inventoryItem?: {
    sku?: string;
    tracked: boolean;
  };
};

export type ShopifyMediaInput = {
  mediaContentType: "IMAGE";
  originalSource: string;
  alt?: string;
};

export type ShopifyProductPayload = {
  product: ShopifyProductCreateInput;
  variant: Omit<ShopifyVariantUpdateInput, "id">;
  media: ShopifyMediaInput[];
  skippedImages: string[];
};

export type ShopifyUserError = {
  field?: string[] | null;
  message: string;
};
