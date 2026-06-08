import { createStubAdapter } from "../shared";
import { mapProductToN11 } from "./mapper";
export const n11Adapter = createStubAdapter("n11", mapProductToN11);
