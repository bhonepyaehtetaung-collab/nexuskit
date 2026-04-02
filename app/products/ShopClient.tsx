"use client";

import { useState, useMemo } from 'react';
import ProductCard from '@/app/components/ProductCard';
import { Tables } from '@/types/supabase';

interface ShopClientProps {
  initialProducts: Tables<'products'>[];
}

export default function ShopClient({ initialProducts }: ShopClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const products = initialProducts; // Use initialProducts here

  const categories = ['All', ...new Set(products.map(p => p.category))];

  const filteredProducts = useMemo(() => {
    let currentProducts = products;

    if (selectedCategory !== 'All') {
      currentProducts = currentProducts.filter(p => p.category === selectedCategory);
    }

    if (searchTerm) {
      currentProducts = currentProducts.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return currentProducts;
  }, [products, searchTerm, selectedCategory]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Our Digital Assets</h1>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search products..."
          className="p-2 border border-gray-300 rounded w-full"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="flex space-x-2 mb-6">
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded ${selectedCategory === category ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}