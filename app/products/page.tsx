import { redirect } from "next/navigation";

// The shop now lives on the home page; keep old links working.
export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const { cat } = await searchParams;
  redirect(cat ? `/?cat=${encodeURIComponent(cat)}` : "/");
}
