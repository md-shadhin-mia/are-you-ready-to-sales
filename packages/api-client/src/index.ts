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

export interface PaginatedResult<T> {
  items: T[];
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
    }) => this.request<AuthResult>("/api/v1/auth/register", {
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
    list: () => this.request<Category[]>("/api/v1/categories", { method: "GET" }),

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

  // Stores
  stores = {
    checkSlug: (slug: string) =>
      this.request<{ slug: string; available: boolean; reason: string | null }>(
        `/api/v1/stores/check-slug?slug=${encodeURIComponent(slug)}`,
        { method: "GET" },
      ),
  };
}

export const apiClient = new PlatformApiClient();
