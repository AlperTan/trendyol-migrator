import type { Marketplace } from "./marketplace";

export type ExportJobStatus = "pending" | "running" | "completed" | "failed";
export type ExportJobItemStatus = ExportJobStatus | "skipped";

export type ExportJob = {
  id: string;
  targetMarketplace: Marketplace;
  status: ExportJobStatus;
  productIds: string[];
  createdAt: Date;
  updatedAt: Date;
};
