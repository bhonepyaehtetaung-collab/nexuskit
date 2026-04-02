import { createClient } from "@/utils/supabase/server";
import ShopClient from "./ShopClient";

export default async function ShopPage() {
  const supabase = createClient();
  const { data: products, error } = await supabase.from("products").select("*");

  if (error) {
    console.error("Error fetching products:", error);
    return <p>Error loading products.</p>;
  }

  return <ShopClient initialProducts={products || []} />;
}