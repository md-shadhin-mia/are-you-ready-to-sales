export interface LevelTierConfig {
  level: number;
  title: string;
  minXp: number;
  minOrders: number;
  minRevenue: number;
  minRating: number;
  commissionRate: number; // e.g. 0.05 for 5%, 0.015 for 1.5%
  perks: string[];
}

export const CAREER_LEVELS: LevelTierConfig[] = [
  {
    level: 1,
    title: "Store Starter",
    minXp: 0,
    minOrders: 0,
    minRevenue: 0,
    minRating: 0.0,
    commissionRate: 0.05,
    perks: [
      "Basic Storefront Hosting",
      "Standard 5.0% Platform Fee",
      "Master Wholesale Catalog Access",
    ],
  },
  {
    level: 2,
    title: "Product Seller",
    minXp: 500,
    minOrders: 1,
    minRevenue: 1000,
    minRating: 0.0,
    commissionRate: 0.05,
    perks: [
      "Custom Store Coupons & Discounts",
      "Promotional Announcement Banners",
      "Marketing Link & UTM Generator",
    ],
  },
  {
    level: 3,
    title: "Active Reseller",
    minXp: 2000,
    minOrders: 10,
    minRevenue: 10000,
    minRating: 4.0,
    commissionRate: 0.05,
    perks: [
      "Expanded Catalog Allocations",
      "Advanced Customer CRM Insights",
      "Active Reseller Trust Badge",
    ],
  },
  {
    level: 4,
    title: "Growth Seller",
    minXp: 6000,
    minOrders: 50,
    minRevenue: 50000,
    minRating: 4.3,
    commissionRate: 0.05,
    perks: [
      "Custom Domain Mapping",
      "Priority Warehouse Fulfillment",
      "Automated Stock Rebalancing",
    ],
  },
  {
    level: 5,
    title: "Pro Seller",
    minXp: 15000,
    minOrders: 150,
    minRevenue: 150000,
    minRating: 4.5,
    commissionRate: 0.015, // Reduced platform fee: 1.5%
    perks: [
      "Reduced 1.5% Platform Commission",
      "Dedicated Institute Account Coach",
      "Same-Day Dispatch Guarantee",
    ],
  },
  {
    level: 6,
    title: "Top Performer",
    minXp: 50000,
    minOrders: 500,
    minRevenue: 500000,
    minRating: 4.7,
    commissionRate: 0.0, // 0% platform fee bonus
    perks: [
      "0% Platform Commission Bonus",
      "Master Catalog Co-Design Access",
      "Institute Hall of Fame Recognition",
    ],
  },
];

export interface StudentGamificationStatus {
  currentLevel: number;
  levelTitle: string;
  totalXp: number;
  commissionRate: number;
  unlockedPerks: string[];
  nextLevel: {
    level: number;
    title: string;
    xpNeeded: number;
    ordersNeeded: number;
    revenueNeeded: number;
    ratingNeeded: number;
    isMaxLevel: boolean;
  } | null;
  metrics: {
    completedOrders: number;
    grossRevenue: number;
    ratingAvg: number;
  };
  challenges: Array<{
    id: string;
    code: string;
    title: string;
    description: string;
    tierLevel: number;
    xpReward: number;
    badgeIcon: string | null;
    threshold: number;
    currentCount: number;
    isCompleted: boolean;
    isClaimed: boolean;
    completedAt: Date | null;
  }>;
}
