"use client";

import { useEffect, useState } from "react";
import { createClient } from "../utils/supabase/client";
import { useCart } from "./context/cartContext";

export default function Home() {
  const [products, setProducts] = useState<any[]>([]);
  const { addToCart } = useCart();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      const supabase = createClient();
      setLoading(true);
      setError(null);
      try {
        let query = supabase.from("products").select("*");

        if (searchTerm) {
          query = query.or(
            `title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`
          );
        }

        if (selectedCategory) {
          query = query.eq("category", selectedCategory);
        }

        const { data, error } = await query;

        if (error) {
          throw error;
        }
        setProducts(data || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [searchTerm, selectedCategory]);

  const categories = [
    "All",
    "UI Kits",
    "Templates",
    "3D Assets",
    "Fonts",
    "Icons",
  ];

  const handleCategoryClick = (category: string | null) => {
    setSelectedCategory(category);
  };

  if (loading) {
    return <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-950 text-white font-sans antialiased flex justify-center items-center">Loading products...</div>;
  }

  if (error) {
    return <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-950 text-white font-sans antialiased flex justify-center items-center text-red-500">Error: {error}</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-950 text-white font-sans antialiased">
      <section className="relative pt-40 pb-20 px-4 text-center bg-transparent">
        <h1 className="text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-600 sm:text-7xl md:text-8xl leading-tight drop-shadow-lg">
          NexusKit: Your Central Hub for Digital Assets
        </h1>
        <p className="mt-6 text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
          Discover, trade, and elevate your projects with a curated selection of trending digital assets, premium templates, and powerful tools designed for the modern creator.
        </p>
        <div className="mt-12 w-full max-w-xl mx-auto relative">
          <input
            type="text"
            placeholder="Search products..."
            className="w-full p-4 pl-12 rounded-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition duration-300 ease-in-out text-lg shadow-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <svg
            className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            ></path>
          </svg>
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() =>
                handleCategoryClick(category === "All" ? null : category)
              }
              className={`px-6 py-3 rounded-full text-lg font-semibold shadow-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-500 focus:ring-opacity-50
                ${
                  selectedCategory === category ||
                  (category === "All" && !selectedCategory)
                    ? "bg-purple-700 text-white"
                    : "bg-gray-800 border border-gray-600 text-gray-200 hover:border-purple-400 hover:text-purple-300"
                }`}
            >
              {category}
            </button>
          ))}
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-16 px-4">
        <h2 className="text-5xl font-extrabold text-center mb-16 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600 drop-shadow-lg">{selectedCategory ? `${selectedCategory} Products` : "Premium Assets"}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10 max-w-7xl mx-auto">
          {products.map((product) => (
            <div key={product.id} className="relative bg-gray-800 rounded-2xl shadow-xl overflow-hidden transform hover:scale-105 transition duration-500 ease-in-out group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl opacity-0 group-hover:opacity-75 transition duration-500 ease-in-out blur animate-tilt"></div>
              <div className="relative bg-gray-900 rounded-2xl p-0.5">
                <img src={product.image_url} alt={product.name} className="w-full h-56 object-cover rounded-t-2xl" />
                <div className="p-7">
                  <h3 className="text-3xl font-bold mb-3 text-white group-hover:text-purple-300 transition duration-300 ease-in-out">{product.name}</h3>
                  <p className="text-gray-400 text-base mb-5 leading-relaxed">{product.description}</p>
                  <div className="flex items-center justify-between mt-6">
                    <span className="text-4xl font-extrabold text-green-500">${product.price}</span>
                    <button
                      onClick={() => addToCart({ id: product.id, name: product.name, price: product.price, image_url: product.image_url })}
                      className="relative px-7 py-3 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-lg font-semibold hover:from-purple-700 hover:to-indigo-700 transition duration-300 ease-in-out shadow-lg transform hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-purple-500 focus:ring-opacity-70">
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
