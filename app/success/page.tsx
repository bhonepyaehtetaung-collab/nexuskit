// app/success/page.tsx
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SuccessPage() {
  const router = useRouter();

  useEffect(() => {
    // Optionally, redirect to home after a few seconds
    const timer = setTimeout(() => {
      router.push('/');
    }, 5000); // 5 seconds

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md text-center">
        <h1 className="text-4xl font-bold text-green-600 mb-4">Purchase Successful!</h1>
        <p className="text-gray-700 text-lg mb-6">
          Thank you for your purchase. Your order has been placed successfully.
        </p>
        <p className="text-gray-500 mb-8">
          You will be redirected to the homepage shortly, or you can click the button below.
        </p>
        <button
          onClick={() => router.push('/')}
          className="bg-blue-600 text-white p-3 rounded-md font-semibold hover:bg-blue-700"
        >
          Continue Shopping
        </button>
      </div>
    </div>
  );
}