import { Suspense } from "react";
import { createClient } from "@/utils/supabase/server";
import { buildCategories } from "@/lib/categories";
import { withBundlePrices } from "@/lib/bundles";
import HomeView from "./HomeView";

/** The store: banner, toolkits, categories and every product on one page. */
export default async function HomePage() {
  const supabase = createClient();
  const [productsRes, categoriesRes, methodsRes, bundlesRes] = await Promise.all([
    supabase.from("products").select("*").order("created_at", { ascending: false }),
    supabase.from("product_categories").select("name").order("created_at", { ascending: true }),
    supabase.from("payment_methods").select("id, provider_name"),
    supabase.from("bundles").select("*").eq("active", true).order("created_at", { ascending: false }),
  ]);

  const products = productsRes.data || [];
  return (
    <Suspense fallback={null}>
      <HomeView
        products={products}
        categories={buildCategories(products, categoriesRes.data || [])}
        bundles={bundlesRes.error ? [] : withBundlePrices(bundlesRes.data || [], products)}
        paymentMethods={methodsRes.data || []}
      />
    </Suspense>
  );
}
