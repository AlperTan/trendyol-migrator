import { createStubAdapter } from "../shared";
import { mapProductToPttAvm } from "./mapper";
export const pttAvmAdapter = createStubAdapter("pttavm", mapProductToPttAvm);
