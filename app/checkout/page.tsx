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
    // Order Logic Here
    alert("Order တင်ခြင်း အောင်မြင်ပါသည်။");
    dispatch({ type: "CLEAR_CART" });
    router.push("/success");
  };

  if (cart.length === 0) return <div className="p-20 text-center font-bold">Cart ထဲတွင် ပစ္စည်းမရှိသေးပါ။</div>;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-24 pb-10 px-4">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        
        {/* 1. Order Summary Card */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
          <h2 className="text-xl font-bold mb-4">သင်ဝယ်ယူမည့် ပစ္စည်းများ</h2>
          {cart.map((item) => (
            <div key={item.id} className="flex justify-between border-b border-white/5 py-3 text-sm">
              <span>{item.name} x {item.quantity}</span>
              <span className="text-indigo-400 font-bold">${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          <div className="flex justify-between pt-4 text-xl font-black text-emerald-400">
            <span>Total:</span>
            <span>${cart.reduce((a, b) => a + (b.price * b.quantity), 0).toFixed(2)}</span>
          </div>
        </div>

        {/* 2. Payment Methods - အဓိက ပြင်ဆင်ထားသော အပိုင်း */}
        <div>
          <h2 className="text-xl font-bold mb-4">ငွေပေးချေမှု ရွေးချယ်ပါ</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {methods.map((m) => (
              <div 
                key={m.id}
                onClick={() => setSelectedMethod(m)}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                  selectedMethod?.id === m.id ? "border-indigo-500 bg-indigo-500/10" : "border-white/10 bg-white/5"
                }`}
              >
                <div className="flex flex-col items-center">
                  {/* QR Image - Responsive အဖြစ်ဆုံး ပုံစံ */}
                  <div className="w-32 h-32 bg-white rounded-xl p-2 mb-3">
                    <img 
                      src={m.qr_image_url || "/placeholder-qr.png"} 
                      className="w-full h-full object-contain" 
                      alt="QR"
                    />
                  </div>
                  <span className="font-bold text-sm">{m.provider_name}</span>
                  <span className="text-xs text-gray-400 font-mono">{m.account_details}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Customer Info Form */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 mb-10">
          <h2 className="text-xl font-bold mb-6">အချက်အလက် ဖြည့်သွင်းပါ</h2>
          <form onSubmit={handleCheckout} className="space-y-4">
            <input 
              required
              type="text" 
              placeholder="အမည်"
              className="w-full bg-black/40 border border-white/10 p-4 rounded-xl outline-none focus:border-indigo-500"
              onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
            />
            <input 
              required
              type="email" 
              placeholder="Email"
              className="w-full bg-black/40 border border-white/10 p-4 rounded-xl outline-none focus:border-indigo-500"
              onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
            />
            <input 
              required
              type="text" 
              placeholder="Telegram / Phone"
              className="w-full bg-black/40 border border-white/10 p-4 rounded-xl outline-none focus:border-indigo-500"
              onChange={(e) => setCustomerInfo({...customerInfo, contact: e.target.value})}
            />
            <button 
              type="submit"
              disabled={issubmitting}
              className="w-full bg-indigo-600 hover:bg-indigo-500 py-4 rounded-xl font-black text-lg mt-4 disabled:opacity-50"
            >
              {issubmitting ? "Processing..." : "Order တင်မည်"}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}