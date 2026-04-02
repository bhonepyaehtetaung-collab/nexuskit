"use client";
import { createClient } from "../../../utils/supabase/client"; // Changed to client-side supabase
import Image from "next/image";
import { notFound } from "next/navigation";
import { useCart } from "../../context/cartContext";
import { useEffect, useState } from "react";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
}

export default function ProductDetails({ params }: { params: { id: string } }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToCart } = useCart();

  useEffect(() => {
    const fetchProduct = async () => {
      const supabase = createClient();
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("id", params.id)
          .single();
        if (error) {
          throw error;
        }
        setProduct(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [params.id]);

  if (loading) {
    return <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-950 text-white font-sans antialiased flex justify-center items-center">Loading product details...</div>;
  }

  if (error) {
    return <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-950 text-white font-sans antialiased flex justify-center items-center text-red-500">Error: {error}</div>;
  }

  if (!product) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="md:w-1/2">
          {product.image_url && (
            <Image
              src={product.image_url}
              alt={product.name}
              width={600}
              height={600}
              objectFit="contain"
              className="rounded-lg shadow-md"
            />
          )}
        </div>
        <div className="md:w-1/2 flex flex-col justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-4">{product.name}</h1>
            <p className="text-gray-700 text-lg mb-6">{product.description}</p>
            <p className="text-2xl font-semibold text-green-600 mb-6">${product.price.toFixed(2)}</p>
          </div>
          <button
            onClick={() => addToCart({ id: product.id, name: product.name, price: product.price, image_url: product.image_url })}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-xl transition duration-300 ease-in-out">
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
