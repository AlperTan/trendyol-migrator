import { createStubAdapter } from "../shared";
import { mapProductToTrendyol } from "./mapper";
export const trendyolAdapter = createStubAdapter("trendyol", mapProductToTrendyol);
