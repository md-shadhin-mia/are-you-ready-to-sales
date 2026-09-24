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

  // 5. Seed Phase 4 Challenges
  const baselineChallenges = [
    {
      code: "CH_STORE_SETUP",
      title: "Store Setup",
      description: "Complete your store name, branding, and theme configuration",
      requiredEvent: "store.created",
      threshold: 1,
      tierLevel: 1,
      xpReward: 100,
      badgeIcon: "store",
    },
    {
      code: "CH_FIRST_PRODUCT",
      title: "First Listing",
      description: "Add your first wholesale master product to your catalog",
      requiredEvent: "store.product.added",
      threshold: 1,
      tierLevel: 1,
      xpReward: 150,
      badgeIcon: "package",
    },
    {
      code: "CH_STORE_PUBLISH",
      title: "Store Launch",
      description: "Publish your storefront and make it publicly accessible",
      requiredEvent: "store.published",
      threshold: 1,
      tierLevel: 1,
      xpReward: 250,
      badgeIcon: "rocket",
    },
    {
      code: "CH_FIVE_PRODUCTS",
      title: "Catalog Builder",
      description: "Curate and list at least 5 products in your store",
      requiredEvent: "store.product.added",
      threshold: 5,
      tierLevel: 2,
      xpReward: 300,
      badgeIcon: "layers",
    },
    {
      code: "CH_FIRST_SALE",
      title: "First Commercial Sale",
      description: "Receive and fulfill your first customer order",
      requiredEvent: "order.delivered",
      threshold: 1,
      tierLevel: 2,
      xpReward: 500,
      badgeIcon: "shopping-bag",
    },
    {
      code: "CH_PROMO_CAMPAIGN",
      title: "First Promo Sale",
      description: "Complete an order that used a discount coupon",
      requiredEvent: "promo.redeemed",
      threshold: 1,
      tierLevel: 2,
      xpReward: 350,
      badgeIcon: "tag",
    },
    {
      code: "CH_REVENUE_1K",
      title: "Four-Figure Milestone",
      description: "Generate your first ৳1,000 in gross store sales",
      requiredEvent: "revenue.threshold",
      threshold: 1000,
      tierLevel: 2,
      xpReward: 500,
      badgeIcon: "trending-up",
    },
    {
      code: "CH_TEN_ORDERS",
      title: "Order Momentum",
      description: "Fulfill and deliver 10 customer orders",
      requiredEvent: "order.delivered",
      threshold: 10,
      tierLevel: 3,
      xpReward: 1000,
      badgeIcon: "truck",
    },
    {
      code: "CH_REVENUE_10K",
      title: "Five-Figure Sales",
      description: "Achieve ৳10,000 in cumulative store sales revenue",
      requiredEvent: "revenue.threshold",
      threshold: 10000,
      tierLevel: 3,
      xpReward: 1500,
      badgeIcon: "dollar-sign",
    },
    {
      code: "CH_FIRST_REVIEW",
      title: "Customer Voice",
      description: "Receive your first verified customer review and rating",
      requiredEvent: "review.received",
      threshold: 1,
      tierLevel: 3,
      xpReward: 500,
      badgeIcon: "star",
    },
    {
      code: "CH_RATING_45",
      title: "Excellence in Service",
      description: "Maintain a store rating average of 4.5★ or higher",
      requiredEvent: "rating.milestone",
      threshold: 1,
      tierLevel: 4,
      xpReward: 2000,
      badgeIcon: "award",
    },
    {
      code: "CH_FIFTY_ORDERS",
      title: "Growth Engine",
      description: "Scale store operations and deliver 50 customer orders",
      requiredEvent: "order.delivered",
      threshold: 50,
      tierLevel: 4,
      xpReward: 3000,
      badgeIcon: "zap",
    },
  ];

  for (const chal of baselineChallenges) {
    await prisma.challenge.upsert({
      where: { code: chal.code },
      update: chal,
      create: chal,
    });
  }
  console.log(`✅ Seeded ${baselineChallenges.length} gamification challenges`);

  // 6. Seed Student Level & Starter Progress
  await prisma.studentLevel.upsert({
    where: { studentId: studentUser.id },
    update: {},
    create: {
      studentId: studentUser.id,
      currentLevel: 1,
      totalXp: 100,
      levelTitle: "Store Starter",
      unlockedPerks: ["Basic Storefront", "Standard Commission (5%)", "Master Catalog Access"],
    },
  });

  // Mark CH_STORE_SETUP completed for student1
  const setupChal = await prisma.challenge.findUnique({ where: { code: "CH_STORE_SETUP" } });
  if (setupChal) {
    await prisma.studentProgress.upsert({
      where: {
        studentId_challengeId: {
          studentId: studentUser.id,
          challengeId: setupChal.id,
        },
      },
      update: {},
      create: {
        studentId: studentUser.id,
        challengeId: setupChal.id,
        currentCount: 1,
        isCompleted: true,
        completedAt: new Date(),
        isClaimed: true,
        claimedAt: new Date(),
      },
    });
  }

  // 7. Seed Sample Store Banner & Coupon
  await prisma.store.update({
    where: { id: sampleStore.id },
    data: {
      bannerText: "Grand Opening Offer: Use code WELCOME10 for 10% off your entire cart!",
      bannerBgColor: "#2563eb",
      bannerActive: true,
    },
  });

  await prisma.coupon.upsert({
    where: {
      storeId_code: {
        storeId: sampleStore.id,
        code: "WELCOME10",
      },
    },
    update: {},
    create: {
      storeId: sampleStore.id,
      code: "WELCOME10",
      discountType: "PERCENTAGE",
      discountValue: 10.0,
      minSpend: 500.0,
      maxUses: 100,
      isActive: true,
    },
  });
  console.log("✅ Seeded sample coupon (WELCOME10) and announcement banner for Apex Gadgets");

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
