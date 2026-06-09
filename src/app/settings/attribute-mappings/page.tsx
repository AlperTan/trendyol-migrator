import MappingTable from "../mapping-table";
import { db } from "@/lib/db";

export default async function AttributeMappingsPage() {
  const mappings = await db.attributeMapping.findMany({ orderBy: [{ marketplace: "asc" }, { localAttributeName: "asc" }] });
  return <MappingTable title="Özellik Eşleştirmeleri" description="Yerel özellik adlarını pazaryeri özellikleriyle eşleştirin." endpoint="/api/attribute-mappings" mappings={mappings} fields={[
    { key: "localAttributeName", label: "Yerel Özellik", required: true },
    { key: "targetAttributeName", label: "Pazaryeri Özelliği", required: true },
    { key: "targetAttributeId", label: "Pazaryeri Özellik Kimliği" },
  ]} />;
}
