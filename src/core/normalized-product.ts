import { MARKETPLACES, type Marketplace } from "./marketplace";

export type NormalizedProductImage = {
  id: string;
  url: string;
  sortOrder: number;
  selectedForExport: boolean;
};

export type NormalizedProduct = {
  id: string;
  title: string;
  description: string | null;
  brand: string | null;
  sku: string | null;
  barcode: string | null;
  price: number | null;
  currency: string;
  stock: number;
  vatRate: number | null;
  categoryName: string | null;
  localCategoryId: string | null;
  images: NormalizedProductImage[];
  attributes: Record<string, unknown>;
  sourceMarketplace: Marketplace | null;
  sourceExternalId: string | null;
  editedFields: Record<string, boolean>;
  marketplaceData: {
    trendyol?: {
      productMainId: string | null;
      brandId: number | null;
      categoryId: number | null;
      cargoCompanyId: number | null;
      deliveryDuration: number | null;
      shipmentAddressId: number | null;
      returningAddressId: number | null;
      requiredAttributes: unknown[];
    };
  };
};

export type ProductWithImages = {
  id: string;
  titleSource: string;
  titleEdited: string | null;
  descriptionSource: string | null;
  descriptionEdited: string | null;
  brand: string | null;
  sku: string | null;
  barcode: string | null;
  salePriceSource: number | null;
  salePriceEdited: number | null;
  currency: string;
  stock: number;
  vatRateSource: number | null;
  vatRateEdited: number | null;
  categorySource: string | null;
  categoryName: string | null;
  localCategoryId: string | null;
  attributesJson: unknown;
  sourcePlatform: string | null;
  sourceProductId: string | null;
  productMainId: string | null;
  brandId: number | null;
  categoryId: number | null;
  cargoCompanyId: number | null;
  deliveryDurationSource: number | null;
  deliveryDurationEdited: number | null;
  shipmentAddressId: number | null;
  returningAddressId: number | null;
  suggestedBrandId: number | null;
  suggestedBrandConfidence: number | null;
  suggestedCategoryId: number | null;
  suggestedCategoryConfidence: number | null;
  images: Array<{
    id: string;
    sourceUrl: string;
    localPath: string | null;
    sortOrder: number;
    isSelected: boolean;
  }>;
};

function asMarketplace(value: string | null): Marketplace | null {
  return MARKETPLACES.find((marketplace) => marketplace === value) ?? null;
}

export function buildNormalizedProduct(product: ProductWithImages): NormalizedProduct {
  return {
    id: product.id,
    title: product.titleEdited ?? product.titleSource,
    description: product.descriptionEdited ?? product.descriptionSource,
    brand: product.brand,
    sku: product.sku,
    barcode: product.barcode,
    price: product.salePriceEdited ?? product.salePriceSource,
    currency: product.currency,
    stock: product.stock,
    vatRate: product.vatRateEdited ?? product.vatRateSource,
    categoryName: product.categoryName ?? product.categorySource,
    localCategoryId: product.localCategoryId,
    images: product.images
      .map((image) => ({
        id: image.id,
        url: image.localPath ?? image.sourceUrl,
        sortOrder: image.sortOrder,
        selectedForExport: image.isSelected,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder),
    attributes:
      product.attributesJson &&
      typeof product.attributesJson === "object" &&
      !Array.isArray(product.attributesJson)
        ? (product.attributesJson as Record<string, unknown>)
        : {},
    sourceMarketplace: asMarketplace(product.sourcePlatform),
    sourceExternalId: product.sourceProductId,
    editedFields: {
      title: product.titleEdited != null,
      description: product.descriptionEdited != null,
      price: product.salePriceEdited != null,
      vatRate: product.vatRateEdited != null,
      categoryName: product.categoryName != null,
    },
    marketplaceData: {
      trendyol: {
        productMainId: product.productMainId,
        brandId:
          product.brandId ??
          (product.suggestedBrandConfidence != null &&
          product.suggestedBrandConfidence >= 0.9
            ? product.suggestedBrandId
            : null),
        categoryId:
          product.categoryId ??
          (product.suggestedCategoryConfidence != null &&
          product.suggestedCategoryConfidence >= 0.75
            ? product.suggestedCategoryId
            : null),
        cargoCompanyId: product.cargoCompanyId,
        deliveryDuration:
          product.deliveryDurationEdited ?? product.deliveryDurationSource,
        shipmentAddressId: product.shipmentAddressId,
        returningAddressId: product.returningAddressId,
        requiredAttributes: [],
      },
    },
  };
}
