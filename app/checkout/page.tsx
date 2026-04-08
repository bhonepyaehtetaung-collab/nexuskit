"use client";

import { useCart } from "@/app/context/cartContext";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export default function CheckoutPage() {
  const { cart, dispatch } = useCart();
  const router = useRouter();
  const supabase = createClient();

  const [methods, setMethods] = useState<any[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<any>(null);
  const [customerInfo, setCustomerInfo] = useState<any>({ name: "", email: "", contact: "" });
  const [issubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchMethods = async () => {
      const { data } = await supabase.from("payment_methods").select("*");
      if (data) setMethods(data);
    };
    fetchMethods();
  }, []);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMethod) return alert("ကျေးဇူးပြု၍ ငွေပေးချေမည့်စနစ်ကို ရွေးချယ်ပေးပါ");
    setIsSubmitting(true);
    alert("Order တင်ခြင်း အောင်မြင်ပါသည်။");
    dispatch({ type: "CLEAR_CART" });
    router.push("/success");
  };

  if (cart.length === 0) return <div className="p-10 sm:p-20 text-center font-bold">Cart ထဲတွင် ပစ္စည်းမရှိသေးပါ။</div>;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-24 pb-12 px-4 sm:px-6">
      {/* max-w-lg က ဖုန်းနဲ့ကြည့်ရင် အနေတော်အဖြစ်ဆုံး Size ပါ */}
      <div className="max-w-lg mx-auto flex flex-col gap-5 sm:gap-6">
        
        {/* 1. Order Total Card */}
        <div className="bg-white/5 border border-white/10 p-5 sm:p-6 rounded-[2rem] flex justify-between items-center shadow-lg">
            <span className="text-gray-300 font-bold text-sm sm:text-base">Total Amount:</span>
            <span className="text-emerald-400 font-black text-2xl sm:text-3xl">
                ${cart.reduce((a, b) => a + (b.price * b.quantity), 0).toFixed(2)}
            </span>
        </div>

        {/* 2. Payment Methods List */}
        <section>
          <h2 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 ml-2 text-gray-200">ငွေပေးချေမှု ရွေးချယ်ပါ</h2>
          <div className="grid grid-cols-1 gap-3">
            {methods.map((m) => (
              <div 
                key={m.id}
                onClick={() => setSelectedMethod(m)}
                className={`flex items-center gap-3 sm:gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                  selectedMethod?.id === m.id 
                    ? "border-indigo-500 bg-indigo-500/10 shadow-[0_0_15px_rgba(79,70,229,0.15)]" 
                    : "border-white/5 bg-white/5 hover:bg-white/10"
                }`}
              >
                {/* QR Code Container - Fixed size for mobile */}
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white rounded-xl flex-shrink-0 p-1 flex items-center justify-center overflow-hidden">
                  <img 
  src={m.qr_url || `https://placehold.co/200x200/4f46e5/ffffff?text=${m.provider_name}`} 
  className="w-full h-full object-contain" 
  alt={m.provider_name}
  onError={(e) => {
      (e.target as HTMLImageElement).src = `https://placehold.co/200x200/4f46e5/ffffff?text=${m.provider_name}`;
  }}
/>
                </div>
                
                {/* Payment Text Details - Added truncate to prevent overflow */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-base sm:text-lg truncate">{m.provider_name}</p>
                  <p className="text-gray-400 font-mono text-xs sm:text-sm truncate">{m.account_details}</p>
                </div>

                {/* Checkmark Indicator */}
                {selectedMethod?.id === m.id && (
                  <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 3. Customer Info Form */}
        <section className="bg-white/5 p-5 sm:p-6 rounded-[2rem] border border-white/10 shadow-lg mt-2">
          <h2 className="text-base sm:text-lg font-bold mb-4 sm:mb-5 text-gray-200">အချက်အလက် ဖြည့်သွင်းပါ</h2>
          <form onSubmit={handleCheckout} className="space-y-3 sm:space-y-4">
            <div>
              <input 
                required
                type="text" 
                placeholder="အမည် (Full Name)"
                className="w-full bg-black/40 border border-white/10 p-3.5 sm:p-4 rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm sm:text-base"
                onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
              />
            </div>
            <div>
              <input 
                required
                type="email" 
                placeholder="အီးမေးလ် (Email)"
                className="w-full bg-black/40 border border-white/10 p-3.5 sm:p-4 rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm sm:text-base"
                onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
              />
            </div>
            <div>
              <input 
                required
                type="text" 
                placeholder="Telegram သို့မဟုတ် ဖုန်းနံပါတ်"
                className="w-full bg-black/40 border border-white/10 p-3.5 sm:p-4 rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm sm:text-base"
                onChange={(e) => setCustomerInfo({...customerInfo, contact: e.target.value})}
              />
            </div>
            
            <button 
              type="submit"
              disabled={issubmitting}
              className="w-full bg-indigo-600 hover:bg-indigo-500 py-4 sm:py-5 rounded-xl font-black text-base sm:text-lg mt-4 sm:mt-6 disabled:opacity-50 transition-all shadow-[0_4px_20px_rgba(79,70,229,0.3)] active:scale-95"
            >
              {issubmitting ? "Processing..." : "Confirm & Order"}
            </button>
          </form>
        </section>

      </div>
    </div>
  );
}