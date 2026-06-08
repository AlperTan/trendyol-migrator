import Link from "next/link";
import NewProductForm from "./new-product-form";

export default function NewProductPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link href="/" className="inline-flex rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700">← Ürünlere dön</Link>
        <section className="rounded-[30px] border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">Yeni ürün</h1>
          <p className="mt-2 text-sm text-gray-500">Ürünü kaydettikten sonra görsellerini ekleyebilirsiniz.</p>
          <div className="mt-6"><NewProductForm /></div>
        </section>
      </div>
    </main>
  );
}
