import React, { Suspense } from "react";
import { notFound } from "next/navigation";
import { ThemeProvider } from "../../../components/ThemeProvider";
import { Navbar } from "../../../components/Navbar";
import { ReviewFormClient } from "./ReviewFormClient";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function getStoreMeta(slug: string) {
  try {
    const res = await fetch(`${API_BASE}/api/v1/stores/${slug}/meta`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function ReviewPage({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = params;
  const store = await getStoreMeta(slug);

  if (!store) {
    notFound();
  }

  return (
    <ThemeProvider themeConfig={store.themeConfig}>
      <Navbar
        storeSlug={slug}
        storeName={store.storeName}
        logoUrl={store.logoUrl}
        tagline={store.brandingInfo?.tagline}
      />

      <main className="flex-1 w-full bg-slate-50/50 min-h-[calc(100vh-64px)]">
        <Suspense
          fallback={
            <div className="py-20 text-center text-slate-400 text-sm">
              Loading review portal...
            </div>
          }
        >
          <ReviewFormClient storeSlug={slug} />
        </Suspense>
      </main>
    </ThemeProvider>
  );
}
