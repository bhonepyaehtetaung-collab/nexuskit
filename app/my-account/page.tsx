"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

export default function CustomerPortal() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  
  const [user, setUser] = useState<any>(null);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [fetchingData, setFetchingData] = useState(true);

  // Modal အဖွင့်/အပိတ်အတွက် State
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const supabase = createClient();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
      fetchMyOrders(session.user.email);
    } else {
      setFetchingData(false);
    }
  };

  const fetchMyOrders = async (userEmail: string | undefined) => {
    if (!userEmail) return;
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("customer_email", userEmail)
      .order("created_at", { ascending: false });
    
    if (data) setMyOrders(data);
    setFetchingData(false);
  };

  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: `${window.location.origin}/my-account`,
      },
    });

    if (error) {
      setMessage("Error: " + error.message);
    } else {
      setMessage("✨ Login link ပို့လိုက်ပါပြီ! သင့် Email ကို စစ်ဆေးပြီး Link ကို နှိပ်ပါ။");
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setMyOrders([]);
  };

  // --- LOADING STATE ---
  if (fetchingData) {
    return <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center font-bold text-xl sm:text-2xl animate-pulse px-4 text-center">Loading Portal...</div>;
  }

  // --- LOGIN STATE (UNAUTHENTICATED) ---
  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center px-4 sm:px-6 relative overflow-hidden">
        {/* Responsive Background Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-indigo-600/20 rounded-full blur-[80px] sm:blur-[120px] pointer-events-none -z-10"></div>
        
        <div className="w-full max-w-md bg-white/5 border border-white/10 p-6 sm:p-10 rounded-[2rem] sm:rounded-3xl shadow-2xl backdrop-blur-xl relative z-10 text-center">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl shadow-lg mx-auto mb-5 sm:mb-6">👤</div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2">My Account</h1>
          <p className="text-gray-400 text-xs sm:text-sm mb-6 sm:mb-8 px-2">Enter the email you used during checkout to access your purchases.</p>

          {message && (
             <div className={`p-3 sm:p-4 rounded-xl mb-6 text-xs sm:text-sm font-bold ${message.includes('Error') ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'}`}>
               {message}
             </div>
          )}

          <form onSubmit={handleMagicLinkLogin} className="space-y-3 sm:space-y-4">
            <input 
              required type="email" placeholder="your@email.com" 
              value={email} onChange={e => setEmail(e.target.value)} 
              className="w-full p-3.5 sm:p-4 rounded-xl bg-black/40 border border-white/10 outline-none focus:border-indigo-500 text-center text-sm sm:text-base" 
            />
            <button disabled={loading} type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 py-3.5 sm:py-4 rounded-xl font-bold text-white shadow-lg transition-all text-sm sm:text-base active:scale-95 disabled:opacity-50">
              {loading ? "Sending Link..." : "Send Login Link"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- LOGGED IN STATE ---
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        
        {/* Welcome Banner */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-white/5 border border-white/10 p-6 sm:p-8 rounded-[2rem] sm:rounded-3xl mb-8 sm:mb-10 shadow-xl text-center md:text-left gap-4 md:gap-0">
          <div className="flex flex-col md:flex-row items-center md:space-x-6 gap-3 md:gap-0">
             <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-xl sm:text-2xl font-bold shadow-lg shadow-indigo-500/30">
               {user.email?.charAt(0).toUpperCase()}
             </div>
             <div>
               <h1 className="text-xl sm:text-2xl font-bold text-white">Welcome back!</h1>
               <p className="text-gray-400 text-sm sm:text-base break-all">{user.email}</p>
             </div>
          </div>
          <button onClick={handleLogout} className="w-full md:w-auto bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-bold transition-all text-sm active:scale-95">
            Logout
          </button>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold mb-5 sm:mb-6 text-indigo-400 px-2 sm:px-0">My Purchases & Subscriptions</h2>
        
        {/* Empty State */}
        {myOrders.length === 0 ? (
          <div className="bg-white/5 border border-white/10 p-8 sm:p-12 rounded-[2rem] sm:rounded-3xl text-center">
             <p className="text-gray-400 text-sm sm:text-lg mb-6">You haven't purchased anything yet.</p>
             <Link href="/products" className="inline-block bg-indigo-600 hover:bg-indigo-500 px-6 sm:px-8 py-3 rounded-xl font-bold text-sm sm:text-base transition-all active:scale-95 shadow-lg shadow-indigo-600/20">
               Browse Shop
             </Link>
          </div>
        ) : (
          /* Orders List */
          <div className="grid grid-cols-1 gap-5 sm:gap-6">
            {myOrders.map((order) => {
              const diff = new Date(order.end_date).getTime() - new Date().getTime();
              const daysLeft = Math.ceil(diff / (1000 * 3600 * 24));
              const isSubActive = order.end_date && daysLeft > 0;

              return (
                <div key={order.id} className="bg-white/5 border border-white/10 p-5 sm:p-6 rounded-[1.5rem] sm:rounded-3xl shadow-xl flex flex-col md:flex-row justify-between md:items-center gap-5 sm:gap-6 group hover:border-indigo-500/30 transition-all">
                   
                   {/* Order Info Left */}
                   <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">
                        <span className="text-xs sm:text-sm font-mono text-gray-500">Order #{order.id.toString().slice(0,8)}</span>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider ${order.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : order.status === 'cancelled' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                          {order.status}
                        </span>
                      </div>
                      
                      <div className="space-y-3 mt-4">
                        {(order.items || []).map((item: any, idx: number) => (
                          <div key={idx} className="flex items-start sm:items-center gap-3 bg-black/20 p-3 sm:p-0 sm:bg-transparent rounded-xl sm:rounded-none">
                             <img src={item.image || "https://placehold.co/150"} className="w-12 h-12 sm:w-10 sm:h-10 rounded-lg object-cover bg-white/5 flex-shrink-0" />
                             <div className="min-w-0">
                               <p className="font-bold text-white text-sm truncate pr-2">{item.name}</p>
                               <p className="text-[10px] sm:text-xs text-gray-400 truncate">Qty: {item.quantity || 1} • {item.product_type || "Asset"}</p>
                             </div>
                          </div>
                        ))}
                      </div>
                   </div>

                   {/* Order Action Right */}
                   <div className="md:text-right border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6 flex flex-col sm:items-end">
                      <p className="text-xl sm:text-2xl font-black text-emerald-400 mb-2">${order.total_amount}</p>
                      
                      {order.end_date && (
                        <div className="mb-4 text-left sm:text-right">
                          <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider font-bold mb-1">Subscription</p>
                          {isSubActive ? (
                             <span className="inline-block text-indigo-400 font-bold text-xs sm:text-sm bg-indigo-500/10 px-2.5 sm:px-3 py-1 rounded-lg border border-indigo-500/20">{daysLeft} Days Remaining</span>
                          ) : (
                             <span className="inline-block text-red-400 font-bold text-xs sm:text-sm bg-red-500/10 px-2.5 sm:px-3 py-1 rounded-lg border border-red-500/20">Expired</span>
                          )}
                        </div>
                      )}

                      {order.status === 'completed' && (
                        <button 
                          onClick={() => setSelectedOrder(order)} 
                          className="w-full md:w-auto bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 px-6 py-3 md:py-2 rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-all text-center"
                        >
                          Access / View Details
                        </button>
                      )}
                      {order.status === 'pending' && (
                        <p className="text-xs sm:text-sm text-yellow-400 italic text-center sm:text-right mt-2 md:mt-0">Verifying payment...</p>
                      )}
                   </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- 🌟 ORDER DETAILS MODAL 🌟 --- */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
          {/* my-8 ensures scrolling space on mobile */}
          <div className="bg-[#111] border border-white/10 p-5 sm:p-8 rounded-[2rem] w-full max-w-2xl shadow-2xl relative my-8 m-auto">
            
            {/* Mobile-optimized close button */}
            <button 
              onClick={() => setSelectedOrder(null)} 
              className="absolute top-4 right-4 sm:top-6 sm:right-6 w-8 h-8 sm:w-auto sm:h-auto bg-white/10 sm:bg-transparent rounded-full flex items-center justify-center text-gray-400 hover:text-white font-black text-lg sm:text-xl transition-all hover:bg-white/20 active:scale-90"
              aria-label="Close modal"
            >
              ✕
            </button>
            
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-1.5 sm:mb-2 pr-8">Access Details</h3>
            <p className="text-xs sm:text-sm text-emerald-400 font-mono mb-6 sm:mb-8 pb-3 sm:pb-4 border-b border-white/10">
              Order #{selectedOrder.id.toString().slice(0,8)}
            </p>

            <div className="space-y-3 sm:space-y-4 max-h-[40vh] sm:max-h-none overflow-y-auto pr-2 custom-scrollbar">
               {(selectedOrder.items || []).map((item: any, idx: number) => (
                 <div key={idx} className="bg-black/40 p-4 sm:p-5 rounded-2xl border border-white/5 flex flex-col md:flex-row justify-between md:items-center gap-4 hover:border-indigo-500/30 transition-colors">
                    
                    <div className="flex items-center gap-3 sm:gap-4">
                       <img src={item.image || "https://placehold.co/150"} className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover bg-white/5 flex-shrink-0" />
                       <div className="min-w-0">
                         <p className="font-bold text-white text-base sm:text-lg truncate pr-2">{item.name}</p>
                         <p className="text-xs sm:text-sm text-gray-400 mb-0.5 sm:mb-1 truncate">{item.product_type || "Asset"} • Qty: {item.quantity || 1}</p>
                       </div>
                    </div>
                    
                    <div className="mt-2 md:mt-0">
                       {item.product_type && item.product_type.toLowerCase().includes('download') ? (
                          <a 
                            href={item.file_url || item.image} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 sm:px-6 py-3 rounded-xl font-bold text-sm transition-all text-center w-full shadow-lg active:scale-95"
                          >
                            <span>Download File</span>
                            <span className="text-lg">⬇</span>
                          </a>
                       ) : (
                          <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl flex flex-col items-start md:items-end w-full">
                            <span className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider font-bold mb-1">Access Status</span>
                            <span className="text-emerald-400 font-bold text-sm sm:text-base flex items-center gap-2">
                               <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0"></div>
                               Activated / Premium
                            </span>
                          </div>
                       )}
                    </div>

                 </div>
               ))}
            </div>

            <div className="mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-white/10">
               <h4 className="text-xs sm:text-sm text-gray-300 font-bold mb-3">Your Account Setup Details:</h4>
               
               {/* Admin Note / Credentials */}
               {selectedOrder.admin_note && (
                 <div className="bg-emerald-500/10 p-4 sm:p-5 rounded-[1rem] sm:rounded-xl border border-emerald-500/30 mb-4 shadow-[inset_0_0_20px_rgba(16,185,129,0.05)]">
                    <p className="text-[10px] sm:text-xs text-emerald-400 mb-2 sm:mb-3 uppercase tracking-wider font-bold flex items-center gap-2">
                       <span className="text-sm sm:text-base">🔐</span> Your Access Credentials:
                    </p>
                    <div className="font-mono text-emerald-50 text-xs sm:text-sm bg-[#0a0a0a] p-3 sm:p-4 rounded-lg sm:rounded-xl border border-white/5 break-words space-y-1.5 sm:space-y-2">
                       {selectedOrder.admin_note.split('\n').map((line: string, i: number) => (
                           <p key={i}>{line}</p>
                       ))}
                    </div>
                 </div>
               )}
               
               {/* Order Note */}
               {selectedOrder.order_note ? (
                 <div className="bg-blue-500/10 p-3.5 sm:p-4 rounded-xl border border-blue-500/20 space-y-1.5 sm:space-y-2 mb-4">
                    <p className="text-[10px] sm:text-xs text-blue-300/70 mb-1 uppercase tracking-wider font-bold">Information you provided:</p>
                    {selectedOrder.order_note.split('|').map((note: string, idx: number) => (
                        <p key={idx} className="text-xs sm:text-sm text-blue-100 font-mono break-words">{note.trim()}</p>
                    ))}
                 </div>
               ) : (
                 <p className="text-xs sm:text-sm text-gray-500 mb-4 italic px-1">No specific details provided during checkout.</p>
               )}
               
               {/* Instructions */}
               <div className="bg-white/5 p-4 sm:p-5 rounded-xl border border-white/10 mt-2">
                  <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                    <span className="text-indigo-400 font-bold block sm:inline mb-1 sm:mb-0">Instruction: </span> 
                    အထက်ပါ သင်ပေးပို့ထားသော အကောင့်သို့ Premium / Paid Plan ချိတ်ဆက်ပေးပြီး ဖြစ်ပါသည်။ သက်ဆိုင်ရာ Application ထဲသို့ ဝင်ရောက်စစ်ဆေးနိုင်ပါသည်။ <span className="opacity-70 mt-1 block sm:inline">(အခက်အခဲ တစ်စုံတစ်ရာ ရှိပါက Customer Support သို့ ဆက်သွယ်ပါ။)</span>
                  </p>
               </div>
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
}