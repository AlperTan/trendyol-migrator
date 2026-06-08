import { createStubAdapter } from "../shared";
import { mapProductToHepsiburada } from "./mapper";
export const hepsiburadaAdapter = createStubAdapter("hepsiburada", mapProductToHepsiburada);
