export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  statusCode?: number;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: string;
  isActive: boolean;
  isVerified: boolean;
  stores?: any[];
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResult extends AuthTokens {
  user: User;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  children?: Category[];
}

export interface MasterProduct {
  id: string;
  sku: string;
  title: string;
  categoryId: string;
  basePrice: number | string;
  stockQuantity: number;
  masterDescription: string;
  masterImages: string[];
  isActive?: boolean;
  ratingAvg?: number | string;
  totalReviewsCount?: number;
  category?: Category;
}

export interface StoreThemeConfig {
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  borderRadius?: string;
}

export interface StoreBrandingInfo {
  tagline?: string;
  contactEmail?: string;
  contactPhone?: string;
  socialLinks?: Record<string, string>;
}

export interface Store {
  id: string;
  studentId?: string;
  storeName: string;
  slug: string;
  customDomain?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  themeConfig: StoreThemeConfig;
  brandingInfo: StoreBrandingInfo;
  status: "DRAFT" | "ACTIVE" | "SUSPENDED";
  ratingAvg: number | string;
  totalReviewsCount: number;
  responseRatePercent?: number;
  repeatCustomerPercent?: number;
  completedOrdersCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface StoreProduct {
  id: string;
  storeId: string;
  masterProductId: string;
  sellingPrice: number;
  compareAtPrice?: number | null;
  customTitle?: string | null;
  customDescription?: string | null;
  customImages: string[];
  tags: string[];
  isFeatured: boolean;
  isVisible: boolean;
  masterProduct: MasterProduct;
  createdAt: string;
  updatedAt: string;
}

export interface FeeBreakdown {
  sellingPrice: number;
  basePrice: number;
  grossMargin: number;
  platformCommission: number;
  paymentFee: number;
  shippingFee: number;
  studentNetProfit: number;
  totalCustomerAmount: number;
}

export interface Customer {
  id: string;
  storeId: string;
  fullName: string;
  phone: string;
  email?: string | null;
  addresses: any[];
  totalOrdersCount: number;
  totalSpend: number | string;
  createdAt: string;
  updatedAt: string;
  orders?: Order[];
}

export interface OrderItem {
  id: string;
  orderId?: string;
  storeProductId?: string | null;
  masterProductId: string;
  productTitle?: string;
  title?: string;
  sku?: string;
  quantity: number;
  unitBasePrice?: number;
  unitSellingPrice?: number;
  unitPrice?: number;
  totalPrice: number;
  storeProduct?: StoreProduct;
  masterProduct?: MasterProduct;
}

export interface Order {
  id: string;
  orderNumber: string;
  storeId: string;
  customerId: string;
  subtotal: number;
  shippingFee: number;
  discountAmount?: number;
  totalAmount: number;
  totalBaseCost?: number;
  platformCommission?: number;
  paymentFee?: number;
  studentNetProfit: number;
  status:
    | "PENDING_PAYMENT"
    | "PAID"
    | "PROCESSING"
    | "SHIPPED"
    | "DELIVERED"
    | "COMPLETED"
    | "CANCELLED"
    | "RETURNED"
    | "REFUNDED";
  paymentMethod: "COD" | "BKASH" | "NAGAD" | "CARD" | string;
  paymentStatus: string;
  shippingAddress: {
    recipientName: string;
    phone: string;
    addressLine: string;
    city: string;
    district: string;
    isInsideDhaka?: boolean;
  };
  courierName?: string | null;
  trackingNumber?: string | null;
  reviewToken?: string | null;
  reviewRequestSentAt?: string | null;
  items?: OrderItem[];
  customer?: {
    id: string;
    fullName: string;
    phone: string;
  };
  store?: {
    id: string;
    storeName: string;
    slug: string;
    logoUrl?: string | null;
  };
  createdAt: string;
  updatedAt?: string;
}

export interface CheckoutPayload {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  shippingAddress: {
    recipientName: string;
    phone: string;
    addressLine: string;
    city: string;
    district: string;
    isInsideDhaka?: boolean;
  };
  items: Array<{
    storeProductId: string;
    quantity: number;
  }>;
  paymentMethod: "COD" | "BKASH" | "NAGAD" | "CARD";
  couponCode?: string;
  sessionId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  referralCode?: string;
}

export interface CheckoutResult {
  orderNumber: string;
  orderId: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  totalAmount: number;
  subtotal: number;
  shippingFee: number;
  studentNetProfit: number;
  platformCommission?: number;
  paymentFee?: number;
  paymentUrl?: string;
  customer: {
    id: string;
    fullName: string;
    phone: string;
  };
  items: Array<{
    id: string;
    productTitle: string;
    quantity: number;
    unitSellingPrice: number;
    totalPrice: number;
  }>;
  createdAt: string;
}

export interface PaginatedResult<T> {
  items: T[];
  data?: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public responseData?: any,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface Review {
  id: string;
  orderId: string;
  masterProductId: string;
  storeId: string;
  customerId: string;
  productRating: number;
  storeRating: number;
  deliveryRating: number;
  productComment?: string | null;
  storeComment?: string | null;
  deliveryComment?: string | null;
  isVerified: boolean;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  customer?: {
    id?: string;
    fullName: string;
    phone: string;
  };
  masterProduct?: {
    id: string;
    title: string;
    sku?: string;
    masterImages?: string[];
  };
  product?: {
    id: string;
    title: string;
    images?: string[];
  };
  store?: {
    id: string;
    storeName: string;
    slug: string;
  };
  order?: {
    orderNumber: string;
    createdAt: string;
  };
}

export interface ReviewDimensionBreakdown {
  totalReviews: number;
  averageProductRating: number;
  averageStoreRating: number;
  averageDeliveryRating: number;
  starDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

export interface StoreReputation {
  storeId: string;
  storeName: string;
  slug: string;
  ratingAvg: number;
  totalReviewsCount: number;
  completedOrdersCount: number;
  responseRatePercent: number;
  repeatCustomerPercent: number;
  compositeScore: number;
  trustBadge: {
    badgeText: string;
    ratingText: string;
    fulfillmentRateText: string;
  };
  tips?: string[];
}

export interface StudentDashboardSummary {
  grossSales: number;
  grossSalesGrowthPercent: number;
  netProfit: number;
  profitMarginPercent: number;
  totalOrders: number;
  completedOrders: number;
  averageOrderValue: number;
  activeCustomersCount: number;
  repeatCustomerPercent: number;
  storeRating: number;
  totalReviewsCount: number;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    customerName: string;
    status: string;
    totalAmount: number;
    studentNetProfit: number;
    createdAt: string;
  }>;
  recentReviews: Array<{
    id: string;
    productTitle: string;
    customerName: string;
    productRating: number;
    storeRating: number;
    deliveryRating: number;
    productComment?: string | null;
    createdAt: string;
  }>;
  trainingProgress?: {
    overallCompletionPercent: number;
    modules: Array<{
      id: string;
      title: string;
      status: "COMPLETED" | "IN_PROGRESS" | "LOCKED";
      progressPercent: number;
    }>;
  };
}

export interface StudentDashboardChartPoint {
  date: string;
  revenue: number;
  profit: number;
  ordersCount: number;
}

// ----------------------------------------------------
// Phase 4: Gamification, Marketing & Analytics Types
// ----------------------------------------------------

export interface Coupon {
  id: string;
  storeId: string;
  code: string;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
  minSpend: number;
  maxUses?: number | null;
  usedCount: number;
  startDate: string;
  endDate?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface StoreBanner {
  bannerText?: string | null;
  bannerLink?: string | null;
  bannerBgColor?: string | null;
  bannerActive?: boolean;
}

export interface ValidateCouponResult {
  valid: boolean;
  coupon: {
    id: string;
    code: string;
    discountType: "PERCENTAGE" | "FIXED_AMOUNT";
    discountValue: number;
    minSpend: number;
  };
  discountAmount: number;
  finalSubtotal: number;
}

export interface GamificationChallenge {
  id: string;
  code: string;
  title: string;
  description: string;
  requiredEvent?: string;
  tierLevel: number;
  xpReward: number;
  badgeIcon: string | null;
  threshold: number;
  currentCount: number;
  isCompleted: boolean;
  isClaimed: boolean;
  completedAt: string | null;
}

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
  challenges: GamificationChallenge[];
}

export interface CoachingAdvice {
  diagnosis: string;
  message: string;
  actionType: string;
  actionLabel: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
}

export interface FunnelMetrics {
  visitors: number;
  productViews: number;
  addToCarts: number;
  checkoutsInitiated: number;
  completedOrders: number;
  conversionRatePercent: number;
  averageOrderValue: number;
  cartAbandonmentPercent: number;
  stageDropOffs: {
    visitorToViewDropOff: number;
    viewToCartDropOff: number;
    cartToCheckoutDropOff: number;
    checkoutToOrderDropOff: number;
  };
  range: string;
  coachingAdvice: CoachingAdvice;
}

export interface SubmitReviewDto {
  reviewToken?: string;
  orderNumber?: string;
  customerPhone?: string;
  masterProductId: string;
  productRating: number;
  storeRating: number;
  deliveryRating: number;
  productComment?: string;
  storeComment?: string;
  deliveryComment?: string;
}

export interface VerifyReviewTokenResult {
  valid: boolean;
  orderNumber: string;
  customerName: string;
  items: Array<{
    masterProductId: string;
    title: string;
    image?: string;
    alreadyReviewed: boolean;
  }>;
}

export interface Permission {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  module: string;
  createdAt: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string | null;
  isSystemRole: boolean;
  assignedUsersCount?: number;
  permissions?: Permission[];
  createdAt: string;
  updatedAt: string;
}

export interface PayoutRequest {
  id: string;
  storeId: string;
  studentId: string;
  amount: number;
  paymentMethod: "BKASH" | "NAGAD" | "BANK_TRANSFER";
  accountDetails: Record<string, any>;
  status: "PENDING" | "APPROVED" | "REJECTED" | "PROCESSED";
  transactionReference?: string | null;
  adminNotes?: string | null;
  createdAt: string;
  updatedAt?: string;
  store?: { id: string; storeName: string; slug: string };
  student?: { id: string; fullName: string; email: string; phone?: string };
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  code: string;
  monthlyPrice: number;
  yearlyPrice: number;
  maxProducts: number;
  allowCustomDomain: boolean;
  platformCommissionPercent: number;
  features: string[];
  isActive: boolean;
}

export interface StudentSubscription {
  subscription: {
    id: string;
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
  };
  plan: SubscriptionPlan;
  usage: {
    currentProductCount: number;
    maxProducts: number;
    allowCustomDomain: boolean;
    platformCommissionPercent: number;
  };
}

export interface WalletSummary {
  currentBalance: number;
  availableBalance: number;
  pendingHold: number;
  totalWithdrawn: number;
  totalEarned: number;
  minWithdrawalAmount: number;
}

export interface LedgerStatementEntry {
  id: string;
  entryType: "ORDER_PROFIT" | "PLATFORM_FEE" | "PAYOUT_WITHDRAWAL";
  amount: number;
  balanceAfter: number;
  notes?: string | null;
  orderNumber?: string | null;
  transactionReference?: string | null;
  createdAt: string;
}

export interface LedgerStatementResponse {
  entries: LedgerStatementEntry[];
  currentBalance: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ExecutiveKpis {
  platformGMV: number;
  instituteNetRevenue: number;
  platformCommissions: number;
  wholesaleMargins: number;
  totalOrdersCount: number;
  warehouseBacklogCount: number;
  outstandingStudentLiabilities: number;
  totalSettledPayouts: number;
  students: {
    total: number;
    verified: number;
  };
  stores: {
    total: number;
    active: number;
    suspended: number;
    draft: number;
  };
  dailyTrends: Array<{
    date: string;
    gmv: number;
    orders: number;
  }>;
}

export interface SellerScorecardItem {
  storeId: string;
  storeName: string;
  slug: string;
  studentName: string;
  studentEmail: string;
  status: string;
  ratingAvg: number;
  totalReviewsCount: number;
  completedOrdersCount: number;
  grossSales: number;
  responseRatePercent: number;
}

export interface AdminStudentItem {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  isVerified: boolean;
  createdAt: string;
  level: { level: number; title: string; xp: number };
  subscription: { planName: string; planCode: string; status: string };
  store?: {
    id: string;
    name: string;
    slug: string;
    customDomain?: string | null;
    status: string;
    ratingAvg: number;
    totalReviews: number;
    completedOrders: number;
    productsCount: number;
  } | null;
}

export class PlatformApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = "http://localhost:4000") {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    token?: string,
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const isJson = response.headers
      .get("content-type")
      ?.includes("application/json");
    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const message =
        (data && typeof data === "object" && (data.message || data.error)) ||
        `HTTP ${response.status}: ${response.statusText}`;
      throw new ApiError(
        response.status,
        Array.isArray(message) ? message.join(", ") : message,
        data,
      );
    }

    return data as T;
  }

  // Auth Endpoints
  auth = {
    register: (body: {
      email: string;
      password: string;
      fullName: string;
      phone?: string;
    }) =>
      this.request<AuthResult>("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify(body),
      }),

    login: (body: { email: string; password: string }) =>
      this.request<AuthResult>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify(body),
      }),

    refresh: (refreshToken: string) =>
      this.request<AuthTokens>("/api/v1/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      }),

    getProfile: (token: string) =>
      this.request<User>("/api/v1/auth/me", { method: "GET" }, token),

    logout: (token: string) =>
      this.request<{ success: boolean }>(
        "/api/v1/auth/logout",
        { method: "POST" },
        token,
      ),
  };

  // Categories Endpoints
  categories = {
    list: () =>
      this.request<Category[]>("/api/v1/categories", { method: "GET" }),

    get: (id: string) =>
      this.request<Category>(`/api/v1/categories/${id}`, { method: "GET" }),

    create: (
      body: { name: string; slug: string; parentId?: string },
      token: string,
    ) =>
      this.request<Category>(
        "/api/v1/categories",
        { method: "POST", body: JSON.stringify(body) },
        token,
      ),

    update: (
      id: string,
      body: { name?: string; slug?: string; parentId?: string },
      token: string,
    ) =>
      this.request<Category>(
        `/api/v1/categories/${id}`,
        { method: "PUT", body: JSON.stringify(body) },
        token,
      ),

    delete: (id: string, token: string) =>
      this.request<{ success: boolean }>(
        `/api/v1/categories/${id}`,
        { method: "DELETE" },
        token,
      ),
  };

  // Admin Master Products Endpoints
  adminProducts = {
    list: (
      params: {
        page?: number;
        limit?: number;
        categoryId?: string;
        search?: string;
        isActive?: boolean;
      } = {},
      token: string,
    ) => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.set("page", String(params.page));
      if (params.limit) searchParams.set("limit", String(params.limit));
      if (params.categoryId) searchParams.set("categoryId", params.categoryId);
      if (params.search) searchParams.set("search", params.search);
      if (params.isActive !== undefined)
        searchParams.set("isActive", String(params.isActive));

      const qs = searchParams.toString();
      return this.request<PaginatedResult<MasterProduct>>(
        `/api/v1/admin/master-products${qs ? `?${qs}` : ""}`,
        { method: "GET" },
        token,
      );
    },

    get: (id: string, token: string) =>
      this.request<MasterProduct>(
        `/api/v1/admin/master-products/${id}`,
        { method: "GET" },
        token,
      ),

    create: (
      body: {
        sku: string;
        title: string;
        categoryId: string;
        basePrice: number;
        stockQuantity?: number;
        masterDescription: string;
        masterImages?: string[];
      },
      token: string,
    ) =>
      this.request<MasterProduct>(
        "/api/v1/admin/master-products",
        { method: "POST", body: JSON.stringify(body) },
        token,
      ),

    update: (
      id: string,
      body: Partial<MasterProduct> & { isActive?: boolean },
      token: string,
    ) =>
      this.request<MasterProduct>(
        `/api/v1/admin/master-products/${id}`,
        { method: "PATCH", body: JSON.stringify(body) },
        token,
      ),

    adjustStock: (
      id: string,
      body: { quantityChange: number; reason: string },
      token: string,
    ) =>
      this.request<MasterProduct>(
        `/api/v1/admin/master-products/${id}/stock`,
        { method: "PATCH", body: JSON.stringify(body) },
        token,
      ),
  };

  // Student Product Marketplace
  studentCatalog = {
    list: (
      params: {
        page?: number;
        limit?: number;
        categoryId?: string;
        search?: string;
      } = {},
      token: string,
    ) => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.set("page", String(params.page));
      if (params.limit) searchParams.set("limit", String(params.limit));
      if (params.categoryId) searchParams.set("categoryId", params.categoryId);
      if (params.search) searchParams.set("search", params.search);

      const qs = searchParams.toString();
      return this.request<PaginatedResult<MasterProduct>>(
        `/api/v1/student/catalog${qs ? `?${qs}` : ""}`,
        { method: "GET" },
        token,
      );
    },

    get: (id: string, token: string) =>
      this.request<MasterProduct>(
        `/api/v1/student/catalog/${id}`,
        { method: "GET" },
        token,
      ),
  };

  // Stores
  stores = {
    checkSlug: (slug: string) =>
      this.request<{ slug: string; available: boolean; reason: string | null }>(
        `/api/v1/stores/check-slug?slug=${encodeURIComponent(slug)}`,
        { method: "GET" },
      ),

    getMyStore: (token: string) =>
      this.request<Store>("/api/v1/stores/me", { method: "GET" }, token),

    createStore: (
      body: {
        storeName: string;
        slug: string;
        themeConfig?: StoreThemeConfig;
        brandingInfo?: StoreBrandingInfo;
      },
      token: string,
    ) =>
      this.request<Store>(
        "/api/v1/stores",
        { method: "POST", body: JSON.stringify(body) },
        token,
      ),

    updateBranding: (
      body: {
        storeName?: string;
        logoUrl?: string;
        faviconUrl?: string;
        brandingInfo?: StoreBrandingInfo;
      },
      token: string,
    ) =>
      this.request<Store>(
        "/api/v1/stores/me/branding",
        { method: "PATCH", body: JSON.stringify(body) },
        token,
      ),

    updateTheme: (body: StoreThemeConfig, token: string) =>
      this.request<Store>(
        "/api/v1/stores/me/theme",
        { method: "PATCH", body: JSON.stringify(body) },
        token,
      ),

    updateStatus: (status: "DRAFT" | "ACTIVE", token: string) =>
      this.request<Store>(
        "/api/v1/stores/me/status",
        { method: "PATCH", body: JSON.stringify({ status }) },
        token,
      ),

    updateCustomDomain: (customDomain: string | null, token: string) =>
      this.request<Store>(
        "/api/v1/stores/me/domain",
        { method: "PATCH", body: JSON.stringify({ customDomain }) },
        token,
      ),
  };

  // Student Reseller Products
  storeProducts = {
    list: (
      params: {
        page?: number;
        limit?: number;
        search?: string;
        isVisible?: boolean;
      } = {},
      token: string,
    ) => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.set("page", String(params.page));
      if (params.limit) searchParams.set("limit", String(params.limit));
      if (params.search) searchParams.set("search", params.search);
      if (params.isVisible !== undefined)
        searchParams.set("isVisible", String(params.isVisible));

      const qs = searchParams.toString();
      return this.request<{
        items: StoreProduct[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>(
        `/api/v1/student/products${qs ? `?${qs}` : ""}`,
        { method: "GET" },
        token,
      );
    },

    get: (id: string, token: string) =>
      this.request<StoreProduct>(
        `/api/v1/student/products/${id}`,
        { method: "GET" },
        token,
      ),

    import: (
      body: {
        masterProductId: string;
        sellingPrice: number;
        compareAtPrice?: number;
        customTitle?: string;
        customDescription?: string;
        customImages?: string[];
        tags?: string[];
      },
      token: string,
    ) =>
      this.request<{ product: StoreProduct; pricingBreakdown: FeeBreakdown }>(
        "/api/v1/student/products",
        { method: "POST", body: JSON.stringify(body) },
        token,
      ),

    update: (
      id: string,
      body: Partial<{
        sellingPrice: number;
        compareAtPrice?: number;
        customTitle?: string;
        customDescription?: string;
        customImages?: string[];
        tags?: string[];
        isFeatured?: boolean;
        isVisible?: boolean;
      }>,
      token: string,
    ) =>
      this.request<StoreProduct>(
        `/api/v1/student/products/${id}`,
        { method: "PATCH", body: JSON.stringify(body) },
        token,
      ),

    delete: (id: string, token: string) =>
      this.request<{ success: boolean }>(
        `/api/v1/student/products/${id}`,
        { method: "DELETE" },
        token,
      ),
  };

  // Pricing Engine
  pricing = {
    preview: (
      body: {
        basePrice: number;
        sellingPrice: number;
        isOnlinePayment?: boolean;
        isInsideDhaka?: boolean;
      },
      token: string,
    ) =>
      this.request<FeeBreakdown>(
        "/api/v1/student/pricing/preview",
        { method: "POST", body: JSON.stringify(body) },
        token,
      ),
  };

  // Public Storefront (Headless)
  storefront = {
    getMeta: (slug: string) =>
      this.request<Store>(
        `/api/v1/stores/${encodeURIComponent(slug)}/meta`,
        { method: "GET" },
      ),

    getProducts: (
      slug: string,
      params: {
        page?: number;
        limit?: number;
        categorySlug?: string;
        search?: string;
        sortBy?: "newest" | "price_asc" | "price_desc";
      } = {},
    ) => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.set("page", String(params.page));
      if (params.limit) searchParams.set("limit", String(params.limit));
      if (params.categorySlug) searchParams.set("categorySlug", params.categorySlug);
      if (params.search) searchParams.set("search", params.search);
      if (params.sortBy) searchParams.set("sortBy", params.sortBy);

      const qs = searchParams.toString();
      return this.request<{
        data: Array<{
          id: string;
          masterProductId: string;
          title: string;
          description: string;
          images: string[];
          sellingPrice: number;
          compareAtPrice?: number | null;
          category: { id: string; name: string; slug: string };
          inStock: boolean;
          stockQuantity: number;
          isFeatured: boolean;
          ratingAvg: number;
          totalReviewsCount: number;
          createdAt: string;
        }>;
        meta: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      }>(
        `/api/v1/stores/${encodeURIComponent(slug)}/products${qs ? `?${qs}` : ""}`,
        { method: "GET" },
      );
    },

    getProductDetail: (slug: string, productId: string) =>
      this.request<{
        id: string;
        masterProductId: string;
        title: string;
        description: string;
        images: string[];
        sellingPrice: number;
        compareAtPrice?: number | null;
        tags: string[];
        isFeatured: boolean;
        category: { id: string; name: string; slug: string };
        inStock: boolean;
        stockQuantity: number;
        ratingAvg: number;
        totalReviewsCount: number;
        createdAt: string;
      }>(
        `/api/v1/stores/${encodeURIComponent(slug)}/products/${productId}`,
        { method: "GET" },
      ),

    checkout: (slug: string, payload: CheckoutPayload) =>
      this.request<CheckoutResult>(
        `/api/v1/stores/${encodeURIComponent(slug)}/checkout`,
        { method: "POST", body: JSON.stringify(payload) },
      ),
  };

  // Orders & Fulfillment
  orders = {
    track: (orderNumber: string) =>
      this.request<{
        orderNumber: string;
        status: string;
        paymentMethod: string;
        paymentStatus: string;
        courierName?: string | null;
        trackingNumber?: string | null;
        totalAmount: number;
        subtotal: number;
        shippingFee: number;
        recipientCity?: string;
        store: { id: string; storeName: string; slug: string; logoUrl?: string };
        items: Array<{
          id: string;
          title: string;
          quantity: number;
          unitPrice: number;
          totalPrice: number;
        }>;
        createdAt: string;
        updatedAt: string;
      }>(
        `/api/v1/orders/track/${encodeURIComponent(orderNumber)}`,
        { method: "GET" },
      ),

    listStudent: (
      params: {
        page?: number;
        limit?: number;
        status?: string;
        search?: string;
      } = {},
      token: string,
    ) => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.set("page", String(params.page));
      if (params.limit) searchParams.set("limit", String(params.limit));
      if (params.status) searchParams.set("status", params.status);
      if (params.search) searchParams.set("search", params.search);

      const qs = searchParams.toString();
      return this.request<{
        data: Order[];
        meta: { page: number; limit: number; total: number; totalPages: number };
      }>(
        `/api/v1/student/orders${qs ? `?${qs}` : ""}`,
        { method: "GET" },
        token,
      );
    },

    listAdmin: (
      params: {
        page?: number;
        limit?: number;
        status?: string;
        search?: string;
      } = {},
      token: string,
    ) => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.set("page", String(params.page));
      if (params.limit) searchParams.set("limit", String(params.limit));
      if (params.status) searchParams.set("status", params.status);
      if (params.search) searchParams.set("search", params.search);

      const qs = searchParams.toString();
      return this.request<{
        data: Order[];
        meta: { page: number; limit: number; total: number; totalPages: number };
      }>(
        `/api/v1/admin/orders${qs ? `?${qs}` : ""}`,
        { method: "GET" },
        token,
      );
    },

    dispatch: (
      id: string,
      body: { courierName: string; trackingNumber: string },
      token: string,
    ) =>
      this.request<Order>(
        `/api/v1/admin/orders/${id}/dispatch`,
        { method: "PATCH", body: JSON.stringify(body) },
        token,
      ),

    updateStatus: (id: string, status: string, token: string) =>
      this.request<Order>(
        `/api/v1/admin/orders/${id}/status`,
        { method: "PATCH", body: JSON.stringify({ status }) },
        token,
      ),
  };

  // Student Customer CRM
  crm = {
    list: (
      params: { page?: number; limit?: number; search?: string } = {},
      token: string,
    ) => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.set("page", String(params.page));
      if (params.limit) searchParams.set("limit", String(params.limit));
      if (params.search) searchParams.set("search", params.search);

      const qs = searchParams.toString();
      return this.request<{
        items: Customer[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>(
        `/api/v1/student/customers${qs ? `?${qs}` : ""}`,
        { method: "GET" },
        token,
      );
    },

    get: (id: string, token: string) =>
      this.request<Customer>(
        `/api/v1/student/customers/${id}`,
        { method: "GET" },
        token,
      ),
  };

  // MinIO Media Presigned URLs
  storage = {
    getPresignedUrl: (
      body: { fileName: string; contentType: string; fileSize: number },
      token: string,
    ) =>
      this.request<{
        uploadUrl: string;
        fileKey: string;
        publicUrl: string;
        expiresIn: number;
      }>(
        "/api/v1/admin/media/presigned-url",
        { method: "POST", body: JSON.stringify(body) },
        token,
      ),

    uploadFile: async (
      uploadUrl: string,
      file: Blob | File,
      contentType: string,
    ) => {
      const res = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: file,
      });
      if (!res.ok) {
        throw new Error(`Upload to storage failed: ${res.statusText}`);
      }
      return true;
    },
  };

  // Reviews & Ratings System (Phase 3)
  reviews = {
    submit: (storeSlug: string, body: SubmitReviewDto) =>
      this.request<{ success: boolean; review: Review }>(
        `/api/v1/stores/${storeSlug}/reviews`,
        { method: "POST", body: JSON.stringify(body) },
      ),

    verifyToken: (storeSlug: string, token: string) =>
      this.request<VerifyReviewTokenResult>(
        `/api/v1/stores/${storeSlug}/reviews/verify-token?token=${encodeURIComponent(token)}`,
        { method: "GET" },
      ),

    verifyOrder: (storeSlug: string, orderNumber: string, phone: string) =>
      this.request<VerifyReviewTokenResult>(
        `/api/v1/stores/${storeSlug}/reviews/verify-order?orderNumber=${encodeURIComponent(orderNumber)}&phone=${encodeURIComponent(phone)}`,
        { method: "GET" },
      ),

    getByProduct: (
      storeSlug: string,
      productId: string,
      params: { page?: number; limit?: number } = {},
    ) => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.set("page", String(params.page));
      if (params.limit) searchParams.set("limit", String(params.limit));
      const qs = searchParams.toString();
      return this.request<{
        breakdown: ReviewDimensionBreakdown;
        reviews: Review[];
        meta: { page: number; limit: number; total: number; totalPages: number };
      }>(
        `/api/v1/stores/${storeSlug}/products/${productId}/reviews${qs ? `?${qs}` : ""}`,
        { method: "GET" },
      );
    },

    getByStore: (
      storeSlug: string,
      params: { page?: number; limit?: number } = {},
    ) => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.set("page", String(params.page));
      if (params.limit) searchParams.set("limit", String(params.limit));
      const qs = searchParams.toString();
      return this.request<{
        reviews: Review[];
        meta: { page: number; limit: number; total: number; totalPages: number };
      }>(
        `/api/v1/stores/${storeSlug}/reviews${qs ? `?${qs}` : ""}`,
        { method: "GET" },
      );
    },

    listStudentReviews: (
      params: { page?: number; limit?: number; ratingFilter?: string; search?: string } = {},
      token: string,
    ) => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.set("page", String(params.page));
      if (params.limit) searchParams.set("limit", String(params.limit));
      if (params.ratingFilter) searchParams.set("ratingFilter", params.ratingFilter);
      if (params.search) searchParams.set("search", params.search);
      const qs = searchParams.toString();
      return this.request<{
        items: Review[];
        breakdown: ReviewDimensionBreakdown;
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>(
        `/api/v1/student/reviews${qs ? `?${qs}` : ""}`,
        { method: "GET" },
        token,
      );
    },

    listAdminReviews: (
      params: { page?: number; limit?: number; search?: string; status?: string } = {},
      token: string,
    ) => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.set("page", String(params.page));
      if (params.limit) searchParams.set("limit", String(params.limit));
      if (params.search) searchParams.set("search", params.search);
      if (params.status) searchParams.set("status", params.status);
      const qs = searchParams.toString();
      return this.request<{
        items: Review[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>(
        `/api/v1/admin/reviews${qs ? `?${qs}` : ""}`,
        { method: "GET" },
        token,
      );
    },

    togglePublish: (id: string, isPublished: boolean, token: string) =>
      this.request<Review>(
        `/api/v1/admin/reviews/${id}/publish`,
        { method: "PATCH", body: JSON.stringify({ isPublished }) },
        token,
      ),
  };

  // Store Reputation & Trust Scoring (Phase 3)
  reputation = {
    getStoreReputation: (storeSlug: string) =>
      this.request<StoreReputation>(
        `/api/v1/stores/${storeSlug}/reputation`,
        { method: "GET" },
      ),

    getStudentScorecard: (token: string) =>
      this.request<StoreReputation>(
        `/api/v1/student/reputation`,
        { method: "GET" },
        token,
      ),
  };

  // Student Executive Dashboard (Phase 3)
  dashboard = {
    getSummary: (token: string) =>
      this.request<StudentDashboardSummary>(
        `/api/v1/student/dashboard/summary`,
        { method: "GET" },
        token,
      ),

    getChartData: (range: "7d" | "30d" | "1y" = "30d", token: string) =>
      this.request<StudentDashboardChartPoint[]>(
        `/api/v1/student/dashboard/chart-data?range=${range}`,
        { method: "GET" },
        token,
      ),
  };

  // Gamification & Training Progression (Phase 4)
  gamification = {
    getStatus: (token: string) =>
      this.request<StudentGamificationStatus>(
        `/api/v1/student/gamification/status`,
        { method: "GET" },
        token,
      ),

    claimReward: (challengeId: string, token: string) =>
      this.request<{
        success: boolean;
        claimedXp: number;
        newTotalXp: number;
        currentLevel: number;
        levelTitle: string;
      }>(
        `/api/v1/student/gamification/claim/${challengeId}`,
        { method: "POST" },
        token,
      ),

    listAdminChallenges: (token: string) =>
      this.request<GamificationChallenge[]>(
        `/api/v1/admin/gamification/challenges`,
        { method: "GET" },
        token,
      ),

    getAdminOverview: (token: string) =>
      this.request<{
        totalStudents: number;
        totalXpAwarded: number;
        totalChallenges: number;
        totalCompletions: number;
        levelDistribution: Record<number, number>;
        tiers: any[];
      }>(
        `/api/v1/admin/gamification/overview`,
        { method: "GET" },
        token,
      ),
  };

  // Marketing Tools & Coupons (Phase 4)
  marketing = {
    listCoupons: (token: string) =>
      this.request<Coupon[]>(
        `/api/v1/student/coupons`,
        { method: "GET" },
        token,
      ),

    createCoupon: (
      dto: {
        code: string;
        discountType: "PERCENTAGE" | "FIXED_AMOUNT";
        discountValue: number;
        minSpend?: number;
        maxUses?: number;
        startDate?: string;
        endDate?: string;
      },
      token: string,
    ) =>
      this.request<Coupon>(
        `/api/v1/student/coupons`,
        { method: "POST", body: JSON.stringify(dto) },
        token,
      ),

    updateCoupon: (
      id: string,
      dto: {
        isActive?: boolean;
        maxUses?: number;
        endDate?: string;
      },
      token: string,
    ) =>
      this.request<Coupon>(
        `/api/v1/student/coupons/${id}`,
        { method: "PATCH", body: JSON.stringify(dto) },
        token,
      ),

    updateBanner: (dto: StoreBanner, token: string) =>
      this.request<StoreBanner>(
        `/api/v1/student/marketing/banner`,
        { method: "PATCH", body: JSON.stringify(dto) },
        token,
      ),

    getBanner: (storeSlug: string) =>
      this.request<StoreBanner>(
        `/api/v1/stores/${storeSlug}/banner`,
        { method: "GET" },
      ),

    validateCoupon: (storeSlug: string, code: string, subtotal: number) =>
      this.request<ValidateCouponResult>(
        `/api/v1/stores/${storeSlug}/coupons/validate`,
        {
          method: "POST",
          body: JSON.stringify({ code, subtotal }),
        },
      ),
  };

  // Store Analytics & Coaching Engine (Phase 4)
  analytics = {
    sendBeaconEvent: (
      storeSlug: string,
      dto: {
        sessionId: string;
        eventType: "PAGE_VIEW" | "PRODUCT_VIEW" | "ADD_TO_CART" | "CHECKOUT_INITIATED" | "ORDER_COMPLETED";
        entityId?: string;
        metadata?: Record<string, any>;
      },
    ) =>
      this.request<{ success: boolean; eventId: string }>(
        `/api/v1/stores/${storeSlug}/events`,
        {
          method: "POST",
          body: JSON.stringify(dto),
        },
      ),

    getFunnel: (range: "7d" | "30d" | "90d" = "30d", token: string) =>
      this.request<FunnelMetrics>(
        `/api/v1/student/analytics/funnel?range=${range}`,
        { method: "GET" },
        token,
      ),

    getCoachingAdvice: (token: string) =>
      this.request<CoachingAdvice>(
        `/api/v1/student/analytics/coach`,
        { method: "GET" },
        token,
      ),
  };

  // Finance & Wallet Ledger (Phase 5)
  finance = {
    getWalletSummary: (token: string) =>
      this.request<WalletSummary>(
        "/api/v1/student/wallet/summary",
        { method: "GET" },
        token,
      ),

    getStatement: (page = 1, limit = 20, token: string) =>
      this.request<LedgerStatementResponse>(
        `/api/v1/student/wallet/statement?page=${page}&limit=${limit}`,
        { method: "GET" },
        token,
      ),

    requestPayout: (
      dto: {
        amount: number;
        paymentMethod: "BKASH" | "NAGAD" | "BANK_TRANSFER";
        accountDetails: Record<string, any>;
      },
      token: string,
    ) =>
      this.request<PayoutRequest>(
        "/api/v1/student/wallet/withdraw",
        {
          method: "POST",
          body: JSON.stringify(dto),
        },
        token,
      ),

    getPayoutHistory: (token: string) =>
      this.request<PayoutRequest[]>(
        "/api/v1/student/wallet/payouts",
        { method: "GET" },
        token,
      ),

    getAdminPayouts: (
      params: { status?: string; page?: number; limit?: number } = {},
      token: string,
    ) => {
      const q = new URLSearchParams();
      if (params.status) q.append("status", params.status);
      if (params.page) q.append("page", String(params.page));
      if (params.limit) q.append("limit", String(params.limit));
      const queryStr = q.toString() ? `?${q.toString()}` : "";
      return this.request<{ requests: PayoutRequest[]; pagination: any }>(
        `/api/v1/admin/finance/payouts${queryStr}`,
        { method: "GET" },
        token,
      );
    },

    approvePayout: (
      id: string,
      dto: { transactionReference: string; adminNotes?: string },
      token: string,
    ) =>
      this.request<{ payout: PayoutRequest; ledgerEntry: LedgerStatementEntry }>(
        `/api/v1/admin/finance/payouts/${id}/approve`,
        {
          method: "POST",
          body: JSON.stringify(dto),
        },
        token,
      ),

    rejectPayout: (id: string, reason: string | undefined, token: string) =>
      this.request<PayoutRequest>(
        `/api/v1/admin/finance/payouts/${id}/reject`,
        {
          method: "POST",
          body: JSON.stringify({ reason }),
        },
        token,
      ),

    getFinanceSummary: (token: string) =>
      this.request<{
        platformGMV: number;
        instituteNetRevenue: number;
        totalPlatformCommissions: number;
        totalSettledPayouts: number;
        outstandingStudentLiabilities: number;
        totalOrdersProcessed: number;
      }>(
        "/api/v1/admin/finance/summary",
        { method: "GET" },
        token,
      ),
  };

  // Subscriptions & Gating (Phase 5)
  subscriptions = {
    getPlans: () =>
      this.request<SubscriptionPlan[]>(
        "/api/v1/subscriptions/plans",
        { method: "GET" },
      ),

    getMySubscription: (token: string) =>
      this.request<StudentSubscription>(
        "/api/v1/student/subscription",
        { method: "GET" },
        token,
      ),

    upgradeSubscription: (planCode: string, token: string) =>
      this.request<{ success: boolean; message: string; subscription: any }>(
        "/api/v1/student/subscription/upgrade",
        {
          method: "POST",
          body: JSON.stringify({ planCode }),
        },
        token,
      ),
  };

  // Dynamic RBAC Roles (Phase 5)
  roles = {
    getRoles: (token: string) =>
      this.request<Role[]>("/api/v1/admin/roles", { method: "GET" }, token),

    createRole: (
      dto: { name: string; description?: string; permissionIds?: string[] },
      token: string,
    ) =>
      this.request<Role>(
        "/api/v1/admin/roles",
        {
          method: "POST",
          body: JSON.stringify(dto),
        },
        token,
      ),

    updateRolePermissions: (
      id: string,
      permissionIds: string[],
      token: string,
    ) =>
      this.request<Role>(
        `/api/v1/admin/roles/${id}/permissions`,
        {
          method: "PUT",
          body: JSON.stringify({ permissionIds }),
        },
        token,
      ),

    getPermissions: (token: string) =>
      this.request<{ all: Permission[]; grouped: Record<string, Permission[]> }>(
        "/api/v1/admin/roles/permissions",
        { method: "GET" },
        token,
      ),

    assignUserRole: (userId: string, roleId: string, token: string) =>
      this.request<any>(
        `/api/v1/admin/roles/users/${userId}/assign`,
        {
          method: "POST",
          body: JSON.stringify({ roleId }),
        },
        token,
      ),

    removeUserRole: (userId: string, roleId: string, token: string) =>
      this.request<{ success: boolean; message: string }>(
        `/api/v1/admin/roles/users/${userId}/remove/${roleId}`,
        { method: "DELETE" },
        token,
      ),

    getUserRoles: (userId: string, token: string) =>
      this.request<{ userId: string; roles: Role[]; effectivePermissions: string[] }>(
        `/api/v1/admin/roles/users/${userId}`,
        { method: "GET" },
        token,
      ),
  };

  // Institute Executive Overview & Student Governance (Phase 5)
  adminDashboard = {
    getExecutiveKpis: (token: string) =>
      this.request<ExecutiveKpis>(
        "/api/v1/admin/dashboard/kpis",
        { method: "GET" },
        token,
      ),

    getStudents: (
      params: {
        search?: string;
        status?: string;
        page?: number;
        limit?: number;
      } = {},
      token: string,
    ) => {
      const q = new URLSearchParams();
      if (params.search) q.append("search", params.search);
      if (params.status) q.append("status", params.status);
      if (params.page) q.append("page", String(params.page));
      if (params.limit) q.append("limit", String(params.limit));
      const queryStr = q.toString() ? `?${q.toString()}` : "";
      return this.request<{ students: AdminStudentItem[]; pagination: any }>(
        `/api/v1/admin/students${queryStr}`,
        { method: "GET" },
        token,
      );
    },

    updateStoreStatus: (
      storeId: string,
      dto: { status: string; reason?: string },
      token: string,
    ) =>
      this.request<{ store: any; reason: string; updatedBy?: string }>(
        `/api/v1/admin/students/${storeId}/status`,
        {
          method: "PATCH",
          body: JSON.stringify(dto),
        },
        token,
      ),

    getSellerScorecard: (token: string) =>
      this.request<SellerScorecardItem[]>(
        "/api/v1/admin/sellers/scorecard",
        { method: "GET" },
        token,
      ),
  };
}

export const apiClient = new PlatformApiClient();
