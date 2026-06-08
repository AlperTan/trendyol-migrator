import { createStubAdapter } from "../shared";
import { mapProductToAmazon } from "./mapper";
export const amazonAdapter = createStubAdapter("amazon", mapProductToAmazon);
