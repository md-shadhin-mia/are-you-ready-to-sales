import { PrismaClient, UserRole, StoreStatus } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // 1. Seed Users
  const defaultPassword = "Password123!";
  const passwordHash = await argon2.hash(defaultPassword);

  const superAdmin = await prisma.user.upsert({
    where: { email: "admin@platform.local" },
    update: {},
    create: {
      email: "admin@platform.local",
      fullName: "Platform Super Admin",
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      isActive: true,
      isVerified: true,
    },
  });

  const instituteAdmin = await prisma.user.upsert({
    where: { email: "institute@platform.local" },
    update: {},
    create: {
      email: "institute@platform.local",
      fullName: "Institute Admin",
      phone: "+8801700000001",
      passwordHash,
      role: UserRole.INSTITUTE_ADMIN,
      isActive: true,
      isVerified: true,
    },
  });

  const productManager = await prisma.user.upsert({
    where: { email: "manager@platform.local" },
    update: {},
    create: {
      email: "manager@platform.local",
      fullName: "Catalog Product Manager",
      phone: "+8801700000002",
      passwordHash,
      role: UserRole.PRODUCT_MANAGER,
      isActive: true,
      isVerified: true,
    },
  });

  const studentUser = await prisma.user.upsert({
    where: { email: "student1@platform.local" },
    update: {},
    create: {
      email: "student1@platform.local",
      fullName: "Karim Ahmed (Student)",
      phone: "+8801700000003",
      passwordHash,
      role: UserRole.STUDENT,
      isActive: true,
      isVerified: true,
    },
  });

  console.log("✅ Seeded users (Super Admin, Institute Admin, Product Manager, Student)");

  // 2. Seed Student Store
  const sampleStore = await prisma.store.upsert({
    where: { slug: "apex-gadgets" },
    update: {},
    create: {
      studentId: studentUser.id,
      storeName: "Apex Gadgets",
      slug: "apex-gadgets",
      status: StoreStatus.ACTIVE,
      themeConfig: {
        primaryColor: "#2563eb",
        secondaryColor: "#1e293b",
        fontFamily: "Inter",
      },
      brandingInfo: {
        tagline: "Your destination for high-end gear and electronics",
        announcement: "Grand opening sale: Free delivery across Dhaka!",
      },
    },
  });

  console.log(`✅ Seeded sample student store: ${sampleStore.storeName} (${sampleStore.slug})`);

  // 3. Seed Categories Hierarchy
  const electronics = await prisma.category.upsert({
    where: { slug: "electronics" },
    update: {},
    create: {
      name: "Electronics",
      slug: "electronics",
    },
  });

  const audio = await prisma.category.upsert({
    where: { slug: "smartphones-audio" },
    update: {},
    create: {
      name: "Smartphones & Audio",
      slug: "smartphones-audio",
      parentId: electronics.id,
    },
  });

  const fashion = await prisma.category.upsert({
    where: { slug: "fashion-apparel" },
    update: {},
    create: {
      name: "Fashion & Apparel",
      slug: "fashion-apparel",
    },
  });

  const homeLiving = await prisma.category.upsert({
    where: { slug: "home-living" },
    update: {},
    create: {
      name: "Home & Living",
      slug: "home-living",
    },
  });

  console.log("✅ Seeded categories hierarchy");

  // 4. Seed 5 Master Products
  const masterProducts = [
    {
      sku: "SKU-ELEC-001",
      title: "Wireless Noise-Canceling Headphones",
      categoryId: audio.id,
      basePrice: 3500.0,
      stockQuantity: 150,
      masterDescription:
        "High-fidelity Bluetooth wireless headphones equipped with active noise cancellation, 40-hour battery life, and crystal-clear voice microphones.",
      masterImages: [
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop",
      ],
      isActive: true,
    },
    {
      sku: "SKU-ELEC-002",
      title: "Ultra-Slim 20000mAh Power Bank",
      categoryId: audio.id,
      basePrice: 1200.0,
      stockQuantity: 300,
      masterDescription:
        "Fast-charging portable battery pack with 22.5W Power Delivery, dual USB-C ports, and an integrated digital percentage display.",
      masterImages: [
        "https://images.unsplash.com/photo-1609592424364-e126938a4d4a?w=800&auto=format&fit=crop",
      ],
      isActive: true,
    },
    {
      sku: "SKU-FASH-001",
      title: "Classic Premium Oxford Shirt",
      categoryId: fashion.id,
      basePrice: 1800.0,
      stockQuantity: 200,
      masterDescription:
        "100% breathable organic cotton shirt with reinforced stitching and button-down collar, tailored for formal and smart-casual wear.",
      masterImages: [
        "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&auto=format&fit=crop",
      ],
      isActive: true,
    },
    {
      sku: "SKU-HOME-001",
      title: "Ergonomic Memory Foam Office Chair Cushion",
      categoryId: homeLiving.id,
      basePrice: 1500.0,
      stockQuantity: 120,
      masterDescription:
        "Orthopedic high-density memory foam seat cushion designed to alleviate lower back pain and improve posture during long work hours.",
      masterImages: [
        "https://images.unsplash.com/photo-1580481077195-722a578f77cf?w=800&auto=format&fit=crop",
      ],
      isActive: true,
    },
    {
      sku: "SKU-HOME-002",
      title: "Smart Ultrasonic Aroma Diffuser",
      categoryId: homeLiving.id,
      basePrice: 2200.0,
      stockQuantity: 90,
      masterDescription:
        "500ml ultrasonic essential oil aroma diffuser with soothing 7-color LED ambient mood lighting and whisper-quiet auto-off mechanism.",
      masterImages: [
        "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800&auto=format&fit=crop",
      ],
      isActive: true,
    },
  ];

  for (const prod of masterProducts) {
    await prisma.masterProduct.upsert({
      where: { sku: prod.sku },
      update: {},
      create: prod,
    });
  }

  console.log(`✅ Seeded ${masterProducts.length} master products`);

  // 5. Seed Reseller Store Products for Apex Gadgets
  const p1 = await prisma.masterProduct.findUnique({
    where: { sku: "SKU-ELEC-001" },
  });
  const p2 = await prisma.masterProduct.findUnique({
    where: { sku: "SKU-ELEC-002" },
  });

  if (p1 && p2) {
    await prisma.storeProduct.upsert({
      where: {
        storeId_masterProductId: {
          storeId: sampleStore.id,
          masterProductId: p1.id,
        },
      },
      update: {},
      create: {
        storeId: sampleStore.id,
        masterProductId: p1.id,
        sellingPrice: 4200.0,
        compareAtPrice: 4500.0,
        customTitle: "Apex Pro Wireless Noise-Cancelling Headphones",
        customDescription:
          "Experience pure studio sound with active noise cancellation. Curated specially by Apex Gadgets.",
        customImages: p1.masterImages,
        isFeatured: true,
        isVisible: true,
        tags: ["audio", "wireless", "premium"],
      },
    });

    await prisma.storeProduct.upsert({
      where: {
        storeId_masterProductId: {
          storeId: sampleStore.id,
          masterProductId: p2.id,
        },
      },
      update: {},
      create: {
        storeId: sampleStore.id,
        masterProductId: p2.id,
        sellingPrice: 1650.0,
        compareAtPrice: 1800.0,
        customTitle: "Apex Ultra-Slim 20000mAh Fast Power Bank",
        customDescription:
          "High capacity 22.5W Power Delivery portable charger for smartphones and laptops.",
        customImages: p2.masterImages,
        isFeatured: true,
        isVisible: true,
        tags: ["chargers", "travel", "fast-charging"],
      },
    });

    console.log("✅ Seeded 2 reseller products for Apex Gadgets store");
  }

  console.log("🎉 Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
