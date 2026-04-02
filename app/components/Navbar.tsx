"use client";

import Link from "next/link";
import { useCart } from "../context/cartContext";

export default function Navbar() {
  const { cartItemCount } = useCart();

  return (
    <nav className="fixed top-0 left-0 right-0 z-10 backdrop-filter backdrop-blur-lg bg-opacity-30 bg-gray-800 p-4 flex justify-center items-center">
      <ul className="flex space-x-8">
        <li>
          <Link href="/" className="text-lg text-white hover:text-purple-300 transition duration-300 ease-in-out">
            Home
          </Link>
        </li>
        <li>
          <Link href="/products" className="text-lg text-white hover:text-purple-300 transition duration-300 ease-in-out">
            Shop
          </Link>
        </li>
        <li>
          <Link href="#about" className="text-lg text-white hover:text-purple-300 transition duration-300 ease-in-out">
            About
          </Link>
        </li>
        <li>
          <Link href="#contact" className="text-lg text-white hover:text-purple-300 transition duration-300 ease-in-out">
            Contact
          </Link>
        </li>
        <li>
          <div className="relative">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6 text-white"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 3h1.386c.51 0 .955.343 1.023.832l.51 3.515A2.25 2.25 0 007.453 12H17.25a2.25 2.25 0 002.245-2.079L21.75 6.75m0 0h-3.513c-.161 0-.319.04-.465.114L17.25 6.75m0 0V4.75A2.25 2.25 0 0015 2.5h-2.25a2.25 2.25 0 00-2.25 2.25v2.75m3.75 7.5c.414 0 .75.336.75.75s-.336.75-.75.75-.75-.336-.75-.75.336-.75.75-.75zm-9.75 0c.414 0 .75.336.75.75s-.336.75-.75.75-.75-.336-.75-.75.336-.75.75-.75z"
              />
            </svg>
            {cartItemCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                {cartItemCount}
              </span>
            )}
          </div>
        </li>
      </ul>
    </nav>
  );
}