import { headers } from "next/headers";
import StorefrontPage from "./[slug]/page";
import { WinWholesaleShop } from "../components/wholesale/WinWholesaleShop";

export default async function RootStorefrontPage({
  searchParams,
}: {
  searchParams?: { search?: string };
}) {
  const headersList = headers();
  const tenantSlug = headersList.get("x-tenant-slug");

  // If a tenant subdomain is provided, render their individual retail store.
  // Otherwise, render the primary WIN Wholesale B2B Reseller Portal.
  if (!tenantSlug) {
    return <WinWholesaleShop />;
  }

  return <StorefrontPage params={{ slug: tenantSlug }} searchParams={searchParams} />;
}
