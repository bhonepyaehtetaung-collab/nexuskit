"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/app/context/cartContext";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  
  const { cart } = useCart();

  // Cart ထဲက ပစ္စည်းတစ်ခုချင်းစီရဲ့ Quantity အားလုံးကို ပေါင်းခြင်း
  const totalItems = cart.reduce((total, item) => total + (item.quantity || 1), 0);

  // Scroll လုပ်တဲ့အခါ Navbar Background အရောင်ပြောင်းရန်
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 👈 My Account လင့်ခ် ထပ်တိုးထားသော နေရာ
  const navLinks = [
    { name: "Home", path: "/" },
    { name: "Shop", path: "/products" },
    { name: "About", path: "/about" },
    { name: "Contact", path: "/contact" },
    { name: "My Account", path: "/my-account" }, 
  ];

  return (
    <header 
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        isScrolled 
        ? "bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-white/10 py-4 shadow-2xl" 
        : "bg-transparent py-6"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
        
        {/* Logo */}
        <Link href="/" className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-600 hover:opacity-80 transition-opacity">
          NexusKit
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          {navLinks.map((link) => (
            <Link 
              key={link.name} 
              href={link.path} 
              className={`text-sm font-bold uppercase tracking-wider transition-colors ${
                pathname === link.path 
                ? "text-indigo-400" 
                : "text-gray-400 hover:text-white"
              }`}
            >
              {link.name}
            </Link>
          ))}
        </nav>

        {/* Cart Icon & Mobile Menu Toggle */}
        <div className="flex items-center space-x-6">
          
          <Link href="/cart" className="relative group flex items-center justify-center">
            <span className="text-2xl group-hover:scale-110 transition-transform">🛒</span>
            {totalItems > 0 && (
              <span className="absolute -top-2 -right-2 bg-indigo-600 text-white text-[11px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-[#0a0a0a] shadow-lg shadow-indigo-500/50">
                {totalItems}
              </span>
            )}
          </Link>
          
          {/* Mobile Hamburger Icon */}
          <button 
            className="md:hidden text-2xl text-gray-400 hover:text-white transition-colors" 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? "✕" : "☰"}
          </button>

        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/10 py-4 px-6 flex flex-col space-y-4 shadow-2xl">
          {navLinks.map((link) => (
            <Link 
              key={link.name} 
              href={link.path} 
              onClick={() => setIsMobileMenuOpen(false)} 
              className={`text-sm font-bold uppercase tracking-wider py-2 ${
                pathname === link.path ? "text-indigo-400" : "text-gray-400 hover:text-white"
              }`}
            >
              {link.name}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}