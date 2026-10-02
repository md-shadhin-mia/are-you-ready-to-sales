export interface WholesaleProduct {
  id: string;
  sku: string;
  title: string;
  category: string;
  moq: number;
  margin: string;
  price: number; // Wholesale price in BDT
  msrp: number;  // Suggested retail price in BDT
  stockQuantity: number;
  image: string;
  description?: string;
}

export interface WholesaleCartItem {
  product: WholesaleProduct;
  quantity: number;
}

export interface ResellerUser {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  role: string;
  storeName?: string;
  storeSlug?: string;
}

export interface WholesaleOrderConfirmation {
  id: string;
  orderNumber: string;
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  shippingAddress: {
    fullName: string;
    phone: string;
    companyName?: string;
    address: string;
    city: string;
    postalCode?: string;
  };
  createdAt: string;
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    masterProduct: {
      id: string;
      title: string;
      sku: string;
      masterImages?: string[];
    };
  }>;
}
