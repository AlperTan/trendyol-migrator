import { db } from "@/lib/db";
import TemplateManager from "./template-manager";
export default async function ProductTemplatesPage() {
  const templates = await db.productTemplate.findMany({ orderBy: [{ marketplace: "asc" }, { name: "asc" }] });
  return <main className="px-4 py-8 md:px-8"><div className="mx-auto max-w-6xl space-y-6"><TemplateManager templates={templates} /></div></main>;
}
