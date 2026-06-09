import MappingTable from "../mapping-table";
import { db } from "@/lib/db";

export default async function CategoryMappingsPage() {
  const mappings = await db.categoryMapping.findMany({ orderBy: [{ marketplace: "asc" }, { localCategoryName: "asc" }] });
  return <MappingTable title="Kategori Eşleştirmeleri" description="Yerel kategorileri pazaryeri kategori kimlikleriyle eşleştirin." endpoint="/api/category-mappings" mappings={mappings} fields={[
    { key: "localCategoryName", label: "Yerel Kategori" },
    { key: "localCategoryId", label: "Yerel Kategori Kimliği" },
    { key: "targetCategoryId", label: "Hedef Kategori Kimliği", required: true },
    { key: "targetCategoryName", label: "Hedef Kategori Adı" },
  ]} />;
}
