import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.product.createMany({
    data: [
      {
        sourcePlatform: "trendyol",
        sourceProductId: "ty-1001",
        titleSource: "Erkek Basic Tişört",
        brand: "MyBrand",
        sku: "TSHIRT-001",
        salePriceSource: 199.9,
      },
      {
        sourcePlatform: "trendyol",
        sourceProductId: "ty-1002",
        titleSource: "Kadın Oversize Hoodie",
        brand: "MyBrand",
        sku: "HOODIE-002",
        salePriceSource: 399.9,
      },
      {
        sourcePlatform: "trendyol",
        sourceProductId: "ty-1003",
        titleSource: "Unisex Spor Şapka",
        brand: "MyBrand",
        sku: "CAP-003",
        salePriceSource: 149.9,
      },
    ],
  });

  console.log("Seed tamamlandı 🌱");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });