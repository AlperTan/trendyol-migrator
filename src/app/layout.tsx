import type { Metadata } from "next";
import { Toaster } from "sonner";
import AppShell from "@/components/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pazaryeri Ürün Yönetimi",
  description: "Ürün ve pazaryeri operasyon paneli",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className="antialiased">
        <AppShell>{children}</AppShell>
         <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
