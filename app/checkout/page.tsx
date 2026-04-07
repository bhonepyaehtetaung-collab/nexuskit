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
    // Order Logic
    alert("Order တင်ခြင်း အောင်မြင်ပါသည်။");
    dispatch({ type: "CLEAR_CART" });
    router.push("/success");
  };

  if (cart.length === 0) return <div className="p-20 text-center font-bold">Cart ထဲတွင် ပစ္စည်းမရှိသေးပါ။</div>;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-28 pb-10 px-4">
      <div className="max-w-xl mx-auto flex flex-col gap-8">
        
        {/* 1. Customer Info (နံပါတ် ၁ အဖြစ် ပြောင်းလဲထားသည်) */}
        <section className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 shadow-2xl">
          <h2 className="text-xl font-black mb-6 flex items-center gap-3">
            <span className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-sm">1</span>
            Customer Info
          </h2>
          <div className="space-y-4">
            <input 
              required
              type="text" 
              placeholder="Full Name"
              className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl outline-none focus:border-indigo-500 transition-all"
              onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
            />
            <input 
              required
              type="email" 
              placeholder="Email Address"
              className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl outline-none focus:border-indigo-500 transition-all"
              onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
            />
            <input 
              required
              type="text" 
              placeholder="Telegram / WhatsApp"
              className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl outline-none focus:border-indigo-500 transition-all"
              onChange={(e) => setCustomerInfo({...customerInfo, contact: e.target.value})}
            />
          </div>
        </section>

        {/* 2. Payment Methods (နံပါတ် ၂ အဖြစ် အောက်တွင် ထားရှိသည်) */}
        <section className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 shadow-2xl">
          <h2 className="text-xl font-black mb-6 flex items-center gap-3">
            <span className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-sm">2</span>
            Payment Methods
          </h2>
          <div className="space-y-3">
            {methods.map((m) => (
              <div 
                key={m.id}
                onClick={() => setSelectedMethod(m)}
                className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                  selectedMethod?.id === m.id ? "border-indigo-500 bg-indigo-500/10" : "border-white/5 bg-black/20"
                }`}
              >
                {/* QR Image Container - Fixed size to prevent overlap */}
                <div className="w-16 h-16 bg-white rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center p-1">
                  <img 
                    src={m.qr_image_url || `https://placehold.co/200x200/000000/FFFFFF/png?text=${m.provider_name}`} 
                    className="w-full h-full object-contain" 
                    alt="Payment"
                  />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm text-white">{m.provider_name}</p>
                  <p className="text-xs text-gray-500 font-mono">{m.account_details}</p>
                </div>
                {selectedMethod?.id === m.id && (
                  <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 3. Final Checkout Button */}
        <div className="px-2">
          <div className="flex justify-between items-center mb-4 px-4">
            <span className="text-gray-400 font-bold uppercase text-xs">Total to pay</span>
            <span className="text-2xl font-black text-emerald-400">
              ${cart.reduce((a, b) => a + (b.price * b.quantity), 0).toFixed(2)}
            </span>
          </div>
          <button 
            onClick={handleCheckout}
            disabled={issubmitting}
            className="w-full bg-indigo-600 hover:bg-indigo-500 py-5 rounded-[1.5rem] font-black text-lg shadow-xl shadow-indigo-600/20 active:scale-95 transition-all disabled:opacity-50"
          >
            {issubmitting ? "Processing..." : "Confirm Payment"}
          </button>
        </div>

      </div>
    </div>
  );
}