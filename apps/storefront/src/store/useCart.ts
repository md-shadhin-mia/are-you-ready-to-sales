import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface CartItem {
  storeProductId: string;
  title: string;
  sellingPrice: number;
  compareAtPrice?: number | null;
  image?: string;
  quantity: number;
  stockQuantity: number;
}

interface CartStore {
  storeSlug: string;
  items: CartItem[];
  isOpen: boolean;
  setStoreSlug: (slug: string) => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (storeProductId: string) => void;
  updateQuantity: (storeProductId: string, quantity: number) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getTotalItems: () => number;
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      storeSlug: "default",
      items: [],
      isOpen: false,

      setStoreSlug: (slug: string) => {
        if (get().storeSlug !== slug) {
          set({ storeSlug: slug });
        }
      },

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

      addItem: (item, quantity = 1) => {
        const items = get().items;
        const existing = items.find((i) => i.storeProductId === item.storeProductId);

        if (existing) {
          const newQty = Math.min(existing.quantity + quantity, item.stockQuantity);
          set({
            items: items.map((i) =>
              i.storeProductId === item.storeProductId
                ? { ...i, quantity: newQty }
                : i,
            ),
            isOpen: true,
          });
        } else {
          set({
            items: [
              ...items,
              {
                ...item,
                quantity: Math.min(quantity, item.stockQuantity || 99),
              },
            ],
            isOpen: true,
          });
        }
      },

      removeItem: (storeProductId: string) => {
        set({
          items: get().items.filter((i) => i.storeProductId !== storeProductId),
        });
      },

      updateQuantity: (storeProductId: string, quantity: number) => {
        if (quantity <= 0) {
          get().removeItem(storeProductId);
          return;
        }

        set({
          items: get().items.map((i) => {
            if (i.storeProductId === storeProductId) {
              return {
                ...i,
                quantity: Math.min(quantity, i.stockQuantity),
              };
            }
            return i;
          }),
        });
      },

      clearCart: () => set({ items: [] }),

      getSubtotal: () => {
        return get().items.reduce(
          (total, item) => total + item.sellingPrice * item.quantity,
          0,
        );
      },

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },
    }),
    {
      name: "storefront-cart-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items, storeSlug: state.storeSlug }),
    },
  ),
);
