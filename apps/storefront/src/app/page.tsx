import { headers } from "next/headers";
import StorefrontPage from "./[slug]/page";

export default async function RootStorefrontPage({
  searchParams,
}: {
  searchParams?: { search?: string };
}) {
  const headersList = headers();
  const tenantSlug = headersList.get("x-tenant-slug") || "apex-gadgets";

  return <StorefrontPage params={{ slug: tenantSlug }} searchParams={searchParams} />;
}
