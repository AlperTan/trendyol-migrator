"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Field = { key: string; label: string; required?: boolean };
type Mapping = { id: string; marketplace: string; [key: string]: unknown };

export default function MappingTable({
  title, description, endpoint, mappings, fields,
}: {
  title: string; description: string; endpoint: string; mappings: Mapping[]; fields: Field[];
}) {
  const router = useRouter();
  const empty = Object.fromEntries(fields.map((field) => [field.key, ""]));
  const [form, setForm] = useState<Record<string, string>>({ marketplace: "trendyol", ...empty });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function edit(mapping: Mapping) {
    setEditingId(mapping.id);
    setForm({ marketplace: mapping.marketplace, ...Object.fromEntries(fields.map((field) => [field.key, String(mapping[field.key] ?? "")])) });
  }
  function reset() {
    setEditingId(null);
    setForm({ marketplace: "trendyol", ...empty });
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); setSaving(true);
    try {
      const response = await fetch(editingId ? `${endpoint}/${editingId}` : endpoint, {
        method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? "Eşleştirme kaydedilemedi");
      toast.success("Eşleştirme kaydedildi"); reset(); router.refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Eşleştirme kaydedilemedi"); }
    finally { setSaving(false); }
  }
  async function remove(id: string) {
    const response = await fetch(`${endpoint}/${id}`, { method: "DELETE" });
    if (!response.ok) return toast.error("Eşleştirme silinemedi");
    toast.success("Eşleştirme silindi"); router.refresh();
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 md:px-8"><div className="mx-auto max-w-6xl space-y-6">
      <section className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm"><h1 className="text-2xl font-bold text-gray-900">{title}</h1><p className="mt-2 text-sm text-gray-500">{description}</p>
        <form onSubmit={save} className="mt-5 grid gap-3 md:grid-cols-3">
          <label className="text-sm font-medium text-gray-700">Marketplace<select value={form.marketplace} onChange={(e) => setForm({ ...form, marketplace: e.target.value })} className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3"><option value="shopify">Shopify</option><option value="trendyol">Trendyol</option></select></label>
          {fields.map((field) => <label key={field.key} className="text-sm font-medium text-gray-700">{field.label}<input required={field.required} value={form[field.key] ?? ""} onChange={(e) => setForm({ ...form, [field.key]: e.target.value })} className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3" /></label>)}
          <div className="flex items-end gap-2"><button disabled={saving} className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white">{editingId ? "Eşleştirmeyi Güncelle" : "Eşleştirme Oluştur"}</button>{editingId ? <button type="button" onClick={reset} className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold">İptal</button> : null}</div>
        </form>
      </section>
      <section className="overflow-x-auto rounded-[28px] border border-gray-200 bg-white shadow-sm"><table className="min-w-full text-left text-sm"><thead className="bg-gray-50 text-gray-500"><tr><th className="px-4 py-3">Pazaryeri</th>{fields.map((field) => <th key={field.key} className="px-4 py-3">{field.label}</th>)}<th className="px-4 py-3">İşlemler</th></tr></thead><tbody>{mappings.map((mapping) => <tr key={mapping.id} className="border-t border-gray-100"><td className="px-4 py-3">{mapping.marketplace}</td>{fields.map((field) => <td key={field.key} className="px-4 py-3">{String(mapping[field.key] ?? "-")}</td>)}<td className="px-4 py-3"><div className="flex gap-2"><button onClick={() => edit(mapping)} className="rounded-lg border border-gray-200 px-3 py-2">Düzenle</button><button onClick={() => void remove(mapping.id)} className="rounded-lg border border-rose-200 px-3 py-2 text-rose-700">Sil</button></div></td></tr>)}</tbody></table></section>
    </div></main>
  );
}
