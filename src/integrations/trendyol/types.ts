export type TrendyolImage = { url: string };
export type TrendyolAttribute = {
  attributeId: number;
  attributeValueId?: number;
  customAttributeValue?: string;
};

export type TrendyolProductPayload = {
  barcode: string;
  title: string;
  productMainId: string;
  brandId: number;
  categoryId: number;
  quantity: number;
  stockCode: string;
  dimensionalWeight: number;
  description: string;
  currencyType: string;
  listPrice: number;
  salePrice: number;
  vatRate: number;
  cargoCompanyId?: number;
  deliveryDuration?: number;
  shipmentAddressId?: number;
  returningAddressId?: number;
  images: TrendyolImage[];
  attributes: TrendyolAttribute[];
};

export type TrendyolPriceStockItem = {
  barcode: string;
  quantity: number;
  salePrice: number;
  listPrice: number;
};

export type TrendyolBatchResponse = {
  batchRequestId?: string;
  [key: string]: unknown;
};
