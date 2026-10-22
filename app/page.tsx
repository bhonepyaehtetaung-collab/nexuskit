import { Suspense } from "react";
import { createPublicClient } from "@/lib/server/public-db";
import { storeExtras } from "@/lib/server/storefront";
import { buildCategories } from "@/lib/categories";
import { withBundlePrices } from "@/lib/bundles";
import { liveCampaigns, withCampaignPrices } from "@/lib/promotions";
import HomeView from "./HomeView";

/** The store: banner, toolkits, categories and every product on one page. */
export default async function HomePage() {
  const supabase = createPublicClient();
  const [productsRes, categoriesRes, methodsRes, bundlesRes, extras] = await Promise.all([
    supabase.from("products").select("*").order("created_at", { ascending: false }),
    supabase.from("product_categories").select("*").order("created_at", { ascending: true }),
    supabase.from("payment_methods").select("id, provider_name"),
    supabase.from("bundles").select("*").eq("active", true).order("created_at", { ascending: false }),
    storeExtras(supabase),
  ]);

  const raw = productsRes.data || [];
  const campaigns = liveCampaigns(extras.campaigns);
  return (
    <Suspense fallback={null}>
      <HomeView
        products={withCampaignPrices(raw, campaigns)}
        categories={buildCategories(raw, categoriesRes.data || [])}
        // Toolkits keep their own discount (no campaign on top), like the database.
        bundles={bundlesRes.error ? [] : withBundlePrices(bundlesRes.data || [], raw)}
        paymentMethods={methodsRes.data || []}
        campaigns={campaigns}
        popular={extras.popular}
      />
    </Suspense>
  );
}
