"use client";

import React, { useState, useEffect, useMemo } from "react";
import { INITIAL_WHOLESALE_CATALOG } from "./initialCatalog";
import { WholesaleProduct, WholesaleCartItem, ResellerUser, WholesaleOrderConfirmation } from "./types";
import { ResellerLoginModal } from "./ResellerLoginModal";
import { WholesaleCartDrawer } from "./WholesaleCartDrawer";
import { WholesaleCheckoutModal } from "./WholesaleCheckoutModal";
import { WholesaleOrderConfirmationModal } from "./WholesaleOrderConfirmationModal";
import { MyOrdersDrawer } from "./MyOrdersDrawer";

export function WinWholesaleShop() {
  // Catalog State
  const [catalog, setCatalog] = useState<WholesaleProduct[]>(INITIAL_WHOLESALE_CATALOG);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [categorySearchQuery, setCategorySearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"featured" | "price-asc" | "price-desc" | "margin">("featured");
  const [currency, setCurrency] = useState<"BDT" | "USD">("BDT");

  // Cart State
  const [cart, setCart] = useState<WholesaleCartItem[]>([]);
  const [cardQuantities, setCardQuantities] = useState<Record<string, number>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Reseller Authentication State
  const [user, setUser] = useState<ResellerUser | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(2450); // Default simulated initial balance

  // Modals & Drawers
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<WholesaleOrderConfirmation | null>(null);

  // FAQ Accordion State
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  // Initialize quantities with product MOQ
  useEffect(() => {
    const initQtys: Record<string, number> = {};
    catalog.forEach((p) => {
      initQtys[p.id] = p.moq;
    });
    setCardQuantities((prev) => ({ ...initQtys, ...prev }));
  }, [catalog]);

  // Check saved session on mount
  useEffect(() => {
    try {
      const savedUserStr = localStorage.getItem("wholesale_user");
      const token = localStorage.getItem("wholesale_token") || localStorage.getItem("student_token");
      if (savedUserStr && token) {
        const parsed = JSON.parse(savedUserStr);
        setUser(parsed);
        // Fetch fresh profile and wallet balance
        fetchProfile(token);
      }
    } catch (e) {
      console.error("Error restoring session", e);
    }
  }, []);

  // Fetch public catalog dynamically from API if available
  useEffect(() => {
    fetch("/api/v1/wholesale/catalog")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.items && data.items.length > 0) {
          // Merge dynamic products with seed catalog
          const dynamicItems: WholesaleProduct[] = data.items.map((item: any) => ({
            id: item.id,
            sku: item.sku,
            title: item.title,
            category: item.category?.name || "General",
            moq: 5,
            margin: "65%",
            price: Number(item.basePrice),
            msrp: Math.round(Number(item.basePrice) * 2.2),
            stockQuantity: item.stockQuantity || 100,
            image: item.masterImages?.[0] || INITIAL_WHOLESALE_CATALOG[0].image,
            description: item.masterDescription,
          }));

          // Keep unique items
          const map = new Map<string, WholesaleProduct>();
          INITIAL_WHOLESALE_CATALOG.forEach((p) => map.set(p.sku, p));
          dynamicItems.forEach((p) => map.set(p.sku, p));
          setCatalog(Array.from(map.values()));
        }
      })
      .catch(() => {
        // Fallback to seeded initial catalog
      });
  }, []);

  const fetchProfile = async (token: string) => {
    try {
      const res = await fetch("/api/v1/student/wholesale/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) setUser(data.user);
        if (data.walletBalance !== undefined) setWalletBalance(data.walletBalance);
      }
    } catch (err) {
      console.error("Profile fetch error", err);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleLoginSuccess = (loggedInUser: ResellerUser, token: string) => {
    setUser(loggedInUser);
    fetchProfile(token);
    showToast(`Welcome back, ${loggedInUser.fullName}! Wholesale pricing unlocked.`);
  };

  const handleLogout = () => {
    localStorage.removeItem("wholesale_token");
    localStorage.removeItem("student_token");
    localStorage.removeItem("wholesale_user");
    setUser(null);
    showToast("Signed out of B2B portal.");
  };

  // Quantity control on product cards
  const updateCardQuantity = (productId: string, delta: number, moq: number) => {
    setCardQuantities((prev) => {
      const current = prev[productId] || moq;
      const next = Math.max(moq, current + delta);
      return { ...prev, [productId]: next };
    });
  };

  // Add to Purchase Order Cart
  const handleAddToCart = (product: WholesaleProduct) => {
    const qty = cardQuantities[product.id] || product.moq;
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.product.id === product.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + qty };
        return updated;
      }
      return [...prev, { product, quantity: qty }];
    });
    showToast(`Added ${qty}x ${product.title} to Purchase Order`);
  };

  const handleUpdateCartQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const next = item.quantity + delta;
            return next >= item.product.moq ? { ...item, quantity: next } : item;
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemoveCartItem = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalCartAmount = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  // Curated Categories List from design
  const categoryDirectory = [
    { name: "Baby & Toddler Items", count: "42 Wholesale Items", icon: "child_care", filterKey: "Baby" },
    { name: "Kitchen & Pantry Ware", count: "68 Wholesale Items", icon: "soup_kitchen", filterKey: "Kitchenware" },
    { name: "Women's Fashion & Bags", count: "84 Wholesale Items", icon: "shopping_bag", filterKey: "Fashion" },
    { name: "Men's Leather Goods", count: "52 Wholesale Items", icon: "wallet", filterKey: "Leather" },
    { name: "Fast-Moving Gadgets", count: "115 Wholesale Items", icon: "devices_other", filterKey: "Smart Gadgets" },
    { name: "Flash Liquidations", count: "29 Clearance Deals", icon: "bolt", filterKey: "Flash" },
    { name: "Skincare & Beauty", count: "64 Wholesale Items", icon: "spa", filterKey: "Beauty & Care" },
    { name: "Travel Gear & Luggage", count: "37 Wholesale Items", icon: "flight_takeoff", filterKey: "Travel" },
    { name: "Health & Therapy", count: "48 Wholesale Items", icon: "fitness_center", filterKey: "Health" },
    { name: "Watches & Jewelry", count: "56 Wholesale Items", icon: "watch", filterKey: "Watches" },
  ];

  // Filter Categories in Section 2 search
  const filteredCategoryCards = useMemo(() => {
    if (!categorySearchQuery) return categoryDirectory;
    return categoryDirectory.filter((c) =>
      c.name.toLowerCase().includes(categorySearchQuery.toLowerCase())
    );
  }, [categorySearchQuery]);

  // Filter and sort catalog items
  const filteredProducts = useMemo(() => {
    return catalog
      .filter((p) => {
        const matchesCategory =
          selectedCategory === "All" ||
          p.category.toLowerCase().includes(selectedCategory.toLowerCase());
        const matchesSearch =
          !searchQuery ||
          p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === "price-asc") return a.price - b.price;
        if (sortBy === "price-desc") return b.price - a.price;
        if (sortBy === "margin") return parseInt(b.margin) - parseInt(a.margin);
        return 0; // featured / default
      });
  }, [catalog, selectedCategory, searchQuery, sortBy]);

  const formatPrice = (bdtPrice: number) => {
    if (currency === "USD") {
      return `$${(bdtPrice / 120).toFixed(2)}`;
    }
    return `৳${bdtPrice.toLocaleString()}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-brand selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl border border-slate-700 animate-in slide-in-from-bottom duration-200">
          <span className="material-symbols-outlined text-[18px] text-emerald-400">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* TOP UTILITY BAR                                          */}
      {/* ======================================================== */}
      <header className="sticky top-0 w-full z-40 bg-white/95 backdrop-blur-xl border-b border-slate-200 shadow-xs">
        <div className="bg-slate-900 text-slate-300 text-[11px] border-b border-slate-800">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-9">
            {/* Contacts & Net 30 badge */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px] text-brand-light">call</span>
                <span className="text-white font-medium">+880 1800-946482</span>
              </div>
              <div className="hidden sm:flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px] text-emerald-400">chat</span>
                <span>
                  WhatsApp Wholesale: <strong className="text-white font-semibold">+880 1700-019283</strong>
                </span>
              </div>
              <div className="hidden lg:flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800 text-[10px]">
                <span className="material-symbols-outlined text-[13px]">verified</span>
                <span className="font-semibold">Verified Net 30/60 B2B Terms Available</span>
              </div>
            </div>

            {/* Currency selector & Authentication */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px] text-slate-400">payments</span>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as "BDT" | "USD")}
                  className="bg-transparent text-slate-200 font-semibold outline-none cursor-pointer text-[11px]"
                >
                  <option value="BDT" className="bg-slate-900 text-white">BDT (৳)</option>
                  <option value="USD" className="bg-slate-900 text-white">USD ($)</option>
                </select>
              </div>

              <div className="h-3 w-px bg-slate-700" />

              {user ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-white font-semibold truncate max-w-[130px]">
                      {user.fullName}
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-brand/30 text-blue-200 font-mono text-[10px]">
                      ৳{walletBalance.toLocaleString()}
                    </span>
                  </div>
                  <button
                    onClick={() => setIsOrdersOpen(true)}
                    className="text-slate-300 hover:text-white font-medium hover:underline"
                  >
                    My Orders
                  </button>
                  <button
                    onClick={handleLogout}
                    className="text-slate-400 hover:text-rose-400 font-medium ml-1"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setIsLoginModalOpen(true)}
                    className="text-slate-300 hover:text-white font-medium transition-colors"
                  >
                    Reseller Apply
                  </button>
                  <span className="text-slate-600">|</span>
                  <button
                    onClick={() => setIsLoginModalOpen(true)}
                    className="text-white hover:text-brand-light font-bold flex items-center gap-1 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px] text-brand-light">lock</span>
                    <span>B2B Portal Login</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* MAIN NAVIGATION HEADER                                   */}
        {/* ======================================================== */}
        <div className="h-20 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-6">
          {/* Logo & Slogan */}
          <div className="flex items-center gap-4">
            <a href="/" className="flex items-center gap-3 group">
              <img
                src="/brand/win-logo.png"
                alt="WIN Wholesale Hub"
                className="h-10 w-auto object-contain transition-transform group-hover:scale-105"
                onError={(e) => {
                  // Fallback icon if logo image not ready
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
              <div className="flex flex-col">
                <span className="text-base font-extrabold tracking-tight text-slate-900 leading-none">
                  WIN Wholesale Hub
                </span>
                <span className="text-[10px] text-brand tracking-widest mt-1 font-bold uppercase">
                  B2B &amp; DROPSHIP PLATFORM
                </span>
              </div>
            </a>
          </div>

          {/* Catalog Search Field */}
          <div className="hidden lg:flex items-center bg-slate-100/90 rounded-xl p-1 border border-slate-200 w-full max-w-md shadow-2xs focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20 transition-all">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent text-slate-700 text-xs px-3 py-2 outline-none cursor-pointer border-r border-slate-200 font-semibold"
            >
              <option value="All">All Niches</option>
              <option value="Smart Gadgets">Smart Gadgets</option>
              <option value="Kitchenware">Kitchenware</option>
              <option value="Beauty & Care">Beauty &amp; Care</option>
              <option value="Hardware & Tools">Hardware &amp; Tools</option>
              <option value="Home & Living">Home &amp; Living</option>
              <option value="Health & Wellness">Health &amp; Wellness</option>
              <option value="Fitness & Sport">Fitness &amp; Sport</option>
            </select>
            <div className="flex items-center px-3 flex-1">
              <span className="material-symbols-outlined text-slate-400 text-[18px] mr-2">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search SKU, MPN or Wholesale Product..."
                className="bg-transparent text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none w-full font-medium"
              />
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-slate-400 hover:text-slate-600 p-1 mr-1"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          {/* Quick Nav Links */}
          <nav className="hidden xl:flex items-center gap-6 text-xs font-semibold text-slate-600">
            <a href="#catalog" className="hover:text-brand transition-colors">Wholesale Catalog</a>
            <a href="#categories" className="hover:text-brand transition-colors">Categories</a>
            <a href="#how-it-works" className="hover:text-brand transition-colors">How It Works</a>
            <a href="#faqs" className="hover:text-brand transition-colors">Reseller FAQs</a>
          </nav>

          {/* Actions: Purchase Order Cart Trigger & Reseller Drawer */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 transition-all shadow-xs hover:border-brand/40 group"
            >
              <div className="relative">
                <span className="material-symbols-outlined text-brand text-[22px]">receipt_long</span>
                {totalCartItems > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-brand text-white text-[10px] font-extrabold flex items-center justify-center animate-bounce">
                    {totalCartItems}
                  </span>
                )}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[10px] text-slate-500 font-semibold leading-none">Purchase Order</span>
                <span className="text-xs text-brand font-extrabold leading-none mt-1">
                  {totalCartItems} Items / {formatPrice(totalCartAmount)}
                </span>
              </div>
            </button>

            {user ? (
              <button
                onClick={() => setIsOrdersOpen(true)}
                className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/80 hover:bg-blue-100 text-brand flex items-center justify-center font-bold text-xs shadow-2xs transition-colors"
                title="My Wholesale Purchases"
              >
                <span className="material-symbols-outlined text-[20px]">person</span>
              </button>
            ) : (
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand hover:bg-brand-hover text-white font-bold text-xs shadow-sm shadow-brand/20 transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">vpn_key</span>
                <span>Reseller Login</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* QUICK STATS & LIVE DISPATCH BANNER                       */}
      {/* ======================================================== */}
      <section className="w-full bg-white text-slate-800 py-3 px-4 sm:px-6 lg:px-8 border-b border-slate-200">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs text-emerald-800 tracking-wide uppercase font-extrabold">
                Live Wholesale Hub
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-slate-600 text-xs">
              <span className="material-symbols-outlined text-[16px] text-brand">local_shipping</span>
              <span>
                Same-Day Metro Dispatch: <strong className="text-slate-900 font-bold">Orders before 3 PM</strong>
              </span>
            </div>
            <div className="hidden md:flex items-center gap-2 text-slate-600 text-xs">
              <span className="material-symbols-outlined text-[16px] text-emerald-600">currency_exchange</span>
              <span>Zero Inventory Capital Required</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg text-slate-700 text-xs">
              <span className="material-symbols-outlined text-brand text-[16px]">verified_user</span>
              <span className="font-semibold text-slate-800">14,280+ Active Resellers</span>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* SECTION 1: VIBRANT HERO SHOWCASE BANNER                  */}
      {/* ======================================================== */}
      <section className="w-full relative overflow-hidden bg-gradient-to-b from-white via-slate-50 to-blue-50/40 py-12 lg:py-20 px-4 sm:px-6 lg:px-8 border-b border-slate-200">
        <div className="absolute -top-32 left-1/4 w-96 h-96 rounded-full bg-blue-100/60 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-10 w-96 h-96 rounded-full bg-emerald-100/50 blur-3xl pointer-events-none"></div>

        <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          {/* Left Hero Text Column */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-brand w-fit">
              <span className="material-symbols-outlined text-brand text-[18px]">verified</span>
              <span className="text-xs font-bold tracking-wider uppercase">Direct-From-Factory Sourcing</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl text-slate-900 tracking-tight leading-tight font-extrabold">
              The Country's Premier{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand via-blue-600 to-indigo-600">
                Dropshipping &amp; Wholesale
              </span>{" "}
              Reseller Platform
            </h1>
            <p className="text-sm sm:text-base text-slate-600 max-w-2xl leading-relaxed">
              Source verified fast-moving products at true factory cost. Automated blind-shipping dispatch straight to your end customer with full white-label packaging or bulk wholesale delivery to your outlet.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <a
                href="#catalog"
                className="px-6 py-3.5 rounded-xl bg-brand hover:bg-brand-hover text-white font-bold text-sm shadow-md shadow-brand/25 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-[18px]">storefront</span>
                <span>Explore Wholesale Catalog</span>
              </a>
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="px-6 py-3.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-sm border border-slate-200 flex items-center gap-2 transition-all shadow-xs"
              >
                <span className="material-symbols-outlined text-[18px] text-brand">how_to_reg</span>
                <span>Open Reseller Account</span>
              </button>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-brand text-[20px]">verified</span>
                <span className="text-xs font-bold text-slate-700">Verified ISO 9001</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600 text-[20px]">credit_card</span>
                <span className="text-xs font-bold text-slate-700">Net 30/60 B2B Credit</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600 text-[20px]">local_shipping</span>
                <span className="text-xs font-bold text-slate-700">99.4% Dispatch SLA</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-600 text-[20px]">attach_money</span>
                <span className="text-xs font-bold text-slate-700">Zero Capital Start</span>
              </div>
            </div>
          </div>

          {/* Right Hero Graphic: Live Operations Engine Simulation */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-white overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold">
                    Automated Dispatch Engine
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">EDI v4.2 Connected</span>
              </div>

              {/* Pipeline Steps Cards */}
              <div className="mt-5 space-y-3">
                <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-100">Reseller Order Authorized</p>
                      <span className="text-[10px] text-slate-400">Order #WN-WS-94812 &bull; 15 units</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-emerald-400">INSTANT</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[18px]">pallet</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-100">Dhaka Central Hub Picking</p>
                      <span className="text-[10px] text-slate-400">Automated ASRS Barcode Scan</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-blue-400">PACKING</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[18px]">local_shipping</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-100">Blind Carrier Handover</p>
                      <span className="text-[10px] text-slate-400">Steadfast / Pathao Courier API</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-emerald-400">TRACKING LIVE</span>
                </div>
              </div>

              {/* Bottom Quick Callout */}
              <div className="mt-5 p-3 rounded-xl bg-brand/20 border border-brand/40 flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">Average Reseller Monthly Margin:</span>
                <span className="font-extrabold text-emerald-400 text-sm">৳68,400+</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* SECTION 2: "OUR CATEGORIES" SOURCING DIRECTORY           */}
      {/* ======================================================== */}
      <section id="categories" className="w-full bg-slate-50 py-16 px-4 sm:px-6 lg:px-8 border-b border-slate-200">
        <div className="max-w-[1440px] mx-auto flex flex-col gap-8">
          {/* Header & Category Search */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-brand text-[20px]">grid_view</span>
                <span className="text-xs text-brand uppercase tracking-widest font-bold">
                  Sourcing Directory
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl text-slate-900 font-bold tracking-tight">
                Our Categories
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                Explore fast-turnover niches curated specifically for high profit-margin dropshipping.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 w-full sm:w-72 shadow-2xs focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
                <span className="material-symbols-outlined text-slate-400 text-[18px] mr-2">search</span>
                <input
                  type="text"
                  value={categorySearchQuery}
                  onChange={(e) => setCategorySearchQuery(e.target.value)}
                  placeholder="Filter 10+ categories..."
                  className="bg-transparent text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none w-full font-medium"
                />
              </div>
              <span className="text-xs text-slate-500 font-semibold px-2">
                {filteredCategoryCards.length} Categories
              </span>
            </div>
          </div>

          {/* 10 Category Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredCategoryCards.map((cat, idx) => {
              const isSelected = selectedCategory === cat.filterKey;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedCategory(isSelected ? "All" : cat.filterKey);
                    // Smooth scroll to catalog
                    document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className={`group p-5 rounded-2xl bg-white border text-center flex flex-col items-center gap-3 transition-all duration-300 shadow-2xs hover:-translate-y-1 ${
                    isSelected
                      ? "border-brand ring-2 ring-brand/30 shadow-md"
                      : "border-slate-200 hover:border-brand/40 hover:shadow-md"
                  }`}
                >
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors shadow-2xs ${
                      isSelected
                        ? "bg-brand text-white"
                        : "bg-blue-50 text-brand group-hover:bg-brand group-hover:text-white"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[28px]">{cat.icon}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-brand transition-colors">
                      {cat.name}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium mt-1">
                      {cat.count}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* SECTION 3: "OUR PRODUCTS" 5-COLUMN WHOLESALE CATALOG     */}
      {/* ======================================================== */}
      <section id="catalog" className="w-full bg-white py-16 px-4 sm:px-6 lg:px-8 border-b border-slate-200">
        <div className="max-w-[1440px] mx-auto flex flex-col gap-8">
          {/* Section Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-4 border-b border-slate-100">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-brand text-[20px]">inventory_2</span>
                <span className="text-xs text-brand uppercase tracking-widest font-bold">
                  Verified Inventory
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl text-slate-900 font-bold tracking-tight">
                Our Products
              </h2>
              <span className="text-xs font-bold text-emerald-700">
                {filteredProducts.length} wholesale products ready for immediate dispatch
              </span>
            </div>

            {/* Filter Pills & Sorting */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                {["All", "Smart Gadgets", "Kitchenware", "Beauty & Care", "Hardware & Tools", "Health & Wellness", "Fitness & Sport"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                      selectedCategory === cat
                        ? "bg-brand text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                >
                  <option value="featured">Sort: Featured</option>
                  <option value="margin">Sort: Highest Margin %</option>
                  <option value="price-asc">Wholesale Price: Low to High</option>
                  <option value="price-desc">Wholesale Price: High to Low</option>
                </select>
              </div>
            </div>
          </div>

          {/* 5-Column High-Density Product Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {filteredProducts.map((p) => {
              const currentQty = cardQuantities[p.id] || p.moq;
              return (
                <div
                  key={p.id}
                  className="rounded-2xl bg-white border border-slate-200 hover:border-brand/40 transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-2xs hover:shadow-lg group hover:-translate-y-1"
                >
                  <div>
                    {/* Image with badges */}
                    <div className="relative w-full h-48 bg-slate-100 overflow-hidden">
                      <img
                        src={p.image}
                        alt={p.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-md bg-white/95 backdrop-blur-md text-emerald-800 text-[11px] flex items-center gap-1 shadow-2xs font-bold border border-slate-200">
                        <span className="material-symbols-outlined text-[13px] text-emerald-600">bolt</span>
                        <span>In Stock - 24h</span>
                      </div>
                      <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded bg-slate-900/80 text-white font-mono text-[10px]">
                        SKU: {p.sku}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 flex flex-col gap-1.5">
                      <span className="text-[10px] text-brand font-bold uppercase tracking-wider">
                        {p.category}
                      </span>
                      <h3 className="text-xs font-bold text-slate-900 line-clamp-2 leading-tight">
                        {p.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold border border-slate-200">
                          MOQ: {p.moq} units
                        </span>
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                          Earn {p.margin} Margin
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Pricing and Action */}
                  <div className="p-4 pt-0 flex flex-col gap-3">
                    <div className="flex items-baseline justify-between pt-2 border-t border-slate-100">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 font-medium">Wholesale Price</span>
                        <span className="text-base font-extrabold text-brand">
                          {formatPrice(p.price)}
                        </span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-[10px] text-slate-400 font-medium">Suggested MSRP</span>
                        <span className="text-xs text-slate-400 line-through font-semibold">
                          {formatPrice(p.msrp)}
                        </span>
                      </div>
                    </div>

                    {/* Quantity Stepper & Add to Order button */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                        <button
                          type="button"
                          onClick={() => updateCardQuantity(p.id, -1, p.moq)}
                          disabled={currentQty <= p.moq}
                          className="w-6 h-6 rounded bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs disabled:opacity-30 disabled:hover:bg-white"
                        >
                          -
                        </button>
                        <span className="text-xs font-bold text-slate-800 min-w-6 text-center">
                          {currentQty}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCardQuantity(p.id, 1, p.moq)}
                          className="w-6 h-6 rounded bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddToCart(p)}
                        className="flex-1 py-2 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[16px]">add_shopping_cart</span>
                        <span>Add to PO</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* SECTION 4: VALUE PROPOSITION / SPECIAL FEATURES          */}
      {/* ======================================================== */}
      <section className="w-full bg-slate-50 py-16 px-4 sm:px-6 lg:px-8 border-b border-slate-200">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-brand flex items-center justify-center">
                <span className="material-symbols-outlined text-[28px]">local_shipping</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900">Automated Blind-Drop Logistics API</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                When you sell on Facebook, TikTok, Daraz, or your custom store, our automated dispatch handles picking, custom packaging with your brand label, and delivery with your sender information. Zero platform marks on the parcel.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs font-bold text-brand">
              <span>Read Logistics Specifications</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </div>
          </div>

          <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[28px]">percent</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900">Tiered Bulk Discount Volume Engine</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Order by carton or pallet and unlock additional volume discounts of up to 35% off the base wholesale price. Instant calculation at checkout with guaranteed stock allocation for verified commercial resellers.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs font-bold text-emerald-700">
              <span>View Volume Discount Tiers</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* SECTION 5: HOW TO DO BUSINESS (5-STEP PIPELINE)          */}
      {/* ======================================================== */}
      <section id="how-it-works" className="w-full bg-white py-16 px-4 sm:px-6 lg:px-8 border-b border-slate-200">
        <div className="max-w-[1440px] mx-auto flex flex-col gap-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs text-brand uppercase tracking-widest font-bold">
              Streamlined Onboarding
            </span>
            <h2 className="text-2xl sm:text-3xl text-slate-900 font-bold tracking-tight">
              How To Do Business With Us
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              From free account creation to receiving your first wholesale shipment in 5 simple steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              { step: "01", title: "Create Reseller Account", desc: "Sign up and verify your business or freelance identity in 2 minutes." },
              { step: "02", title: "Browse Wholesale Catalog", desc: "Explore factory prices, high margins, and download HD product media." },
              { step: "03", title: "List & Promote", desc: "Market products on Facebook, Daraz, or your online store at your retail price." },
              { step: "04", title: "Submit Purchase Order", desc: "Order inventory for your shop or enter your customer delivery address." },
              { step: "05", title: "Blind Dispatch & Settle", desc: "We blind-ship directly, collect COD, and credit profits to your wallet." },
            ].map((s, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-4 hover:border-brand/40 transition-colors"
              >
                <div>
                  <span className="text-2xl font-black text-brand/30">{s.step}</span>
                  <h4 className="text-sm font-bold text-slate-900 mt-2">{s.title}</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{s.desc}</p>
                </div>
                <div className="w-6 h-6 rounded-full bg-blue-100 text-brand flex items-center justify-center font-bold text-xs">
                  &check;
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* SECTION 6: RESELLER FAQS ACCORDION                       */}
      {/* ======================================================== */}
      <section id="faqs" className="w-full bg-slate-50 py-16 px-4 sm:px-6 lg:px-8 border-b border-slate-200">
        <div className="max-w-[800px] mx-auto flex flex-col gap-8">
          <div className="text-center space-y-2">
            <span className="text-xs text-brand uppercase tracking-widest font-bold">
              Frequently Asked Questions
            </span>
            <h2 className="text-2xl sm:text-3xl text-slate-900 font-bold tracking-tight">
              Reseller &amp; Wholesale Inquiries
            </h2>
          </div>

          <div className="space-y-3">
            {[
              {
                q: "What is the Minimum Order Quantity (MOQ) for wholesale products?",
                a: "Each product has a defined MOQ (typically 4 to 12 units) for bulk pricing. If you are doing blind-dropshipping for individual customer orders, our automated system allows single-unit dispatch under your verified reseller account.",
              },
              {
                q: "How does blind-dropshipping work with customer invoices?",
                a: "Our warehouse packages every shipment with unbranded boxes and places your store name, logo, and retail invoice on the parcel. There is zero mention of WIN Wholesale Hub anywhere on the customer's package.",
              },
              {
                q: "What payment methods are supported for wholesale purchases?",
                a: "We support Reseller Account Wallet balance (instant ledger deduction), Cash on Delivery (COD) across Bangladesh via Steadfast/Pathao, Direct B2B Bank Transfer / Wire, and 30-day corporate trade credit (Net 30) for approved commercial partners.",
              },
              {
                q: "What happens in case of customer returns or defective items?",
                a: "Every product goes through our multi-point QA inspection before boxing. In the rare event a customer receives a defective or damaged product, our warehouse provides a no-hassle free replacement or full refund under our Master Reseller Quality Guarantee.",
              },
            ].map((faq, idx) => {
              const isOpen = expandedFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-2xs"
                >
                  <button
                    onClick={() => setExpandedFaq(isOpen ? null : idx)}
                    className="w-full p-5 text-left flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <span className="text-sm font-bold text-slate-900">{faq.q}</span>
                    <span
                      className={`material-symbols-outlined text-brand transition-transform duration-300 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    >
                      expand_more
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-slate-600 text-xs leading-relaxed border-t border-slate-100">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* FOOTER                                                   */}
      {/* ======================================================== */}
      <footer className="w-full bg-slate-900 text-slate-400 pt-16 pb-12 text-xs border-t border-slate-800">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <img src="/brand/win-logo.png" alt="WIN B2B Hub" className="h-8 object-contain" />
                <span className="text-sm font-bold text-white tracking-wider uppercase">
                  WIN B2B Hub
                </span>
              </div>
              <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                Next-generation enterprise wholesale platform and automated dropshipping fulfillment infrastructure. Real-time EDI, tiered bulk pricing, and priority blind-shipping logistics.
              </p>
              <div className="space-y-1 text-slate-300 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-brand-light text-[16px]">warehouse</span>
                  <span>Fulfillment Hubs: Dhaka Central (DAC1), Chittagong Port (CTG2)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-brand-light text-[16px]">support_agent</span>
                  <span>24/7 Enterprise Tier Support: enterprise@winwholesale.com</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">
                Helpful Links &amp; Policy
              </h4>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-white transition-colors">Net 30 Credit Application</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Wholesale Return Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blind Dropshipping Protocol</a></li>
                <li><a href="#" className="hover:text-white transition-colors">EDI API Documentation</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">
                Sourcing Categories
              </h4>
              <ul className="space-y-2">
                <li><a href="#catalog" className="hover:text-white transition-colors">Smart Gadgets &amp; Chargers</a></li>
                <li><a href="#catalog" className="hover:text-white transition-colors">Kitchenware &amp; Bento</a></li>
                <li><a href="#catalog" className="hover:text-white transition-colors">Beauty &amp; Facial Care</a></li>
                <li><a href="#catalog" className="hover:text-white transition-colors">Tools &amp; Hardware</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">
                Certifications
              </h4>
              <div className="space-y-2">
                <div className="p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-[11px]">
                  <span className="font-bold text-white block">ISO 9001:2015</span>
                  <span className="text-slate-400">Certified Quality Management</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-[11px]">
                  <span className="font-bold text-white block">SOC 2 Type II</span>
                  <span className="text-slate-400">Security &amp; Data Privacy</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
            <div>&copy; {new Date().getFullYear()} WIN Wholesale Hub Inc. All rights reserved.</div>
            <div className="flex gap-4">
              <a href="#" className="hover:text-slate-400">Privacy Statement</a>
              <a href="#" className="hover:text-slate-400">Wholesale Master Terms</a>
              <a href="#" className="hover:text-slate-400">Security Compliance</a>
            </div>
          </div>
        </div>
      </footer>

      {/* ======================================================== */}
      {/* INTERACTIVE MODALS & DRAWERS                             */}
      {/* ======================================================== */}
      <ResellerLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      <WholesaleCartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cart}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onProceedCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
      />

      <WholesaleCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        items={cart}
        user={user}
        walletBalance={walletBalance}
        onOpenLogin={() => {
          setIsCheckoutOpen(false);
          setIsLoginModalOpen(true);
        }}
        onOrderSuccess={(order) => {
          setConfirmedOrder(order);
          setCart([]); // Clear cart upon successful order
          // Refresh profile / balance
          const token = localStorage.getItem("wholesale_token") || localStorage.getItem("student_token");
          if (token) fetchProfile(token);
        }}
      />

      <WholesaleOrderConfirmationModal
        order={confirmedOrder}
        onClose={() => setConfirmedOrder(null)}
        onViewOrders={() => {
          setConfirmedOrder(null);
          setIsOrdersOpen(true);
        }}
      />

      <MyOrdersDrawer
        isOpen={isOrdersOpen}
        onClose={() => setIsOrdersOpen(false)}
        user={user}
        onOpenLogin={() => {
          setIsOrdersOpen(false);
          setIsLoginModalOpen(true);
        }}
      />
    </div>
  );
}
