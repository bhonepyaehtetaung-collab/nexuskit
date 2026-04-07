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

  if (fetchingData) {
    return <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center font-bold text-2xl animate-pulse">Loading Portal...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center px-6 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none -z-10"></div>
        
        <div className="w-full max-w-md bg-white/5 border border-white/10 p-10 rounded-3xl shadow-2xl backdrop-blur-xl relative z-10 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg mx-auto mb-6">👤</div>
          <h1 className="text-3xl font-black tracking-tight text-white mb-2">My Account</h1>
          <p className="text-gray-400 text-sm mb-8">Enter the email you used during checkout to access your purchases.</p>

          {message && (
             <div className={`p-4 rounded-xl mb-6 text-sm font-bold ${message.includes('Error') ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'}`}>
               {message}
             </div>
          )}

          <form onSubmit={handleMagicLinkLogin} className="space-y-4">
            <input 
              required type="email" placeholder="your@email.com" 
              value={email} onChange={e => setEmail(e.target.value)} 
              className="w-full p-4 rounded-xl bg-black/40 border border-white/10 outline-none focus:border-indigo-500 text-center" 
            />
            <button disabled={loading} type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 py-4 rounded-xl font-bold text-white shadow-lg transition-all">
              {loading ? "Sending Link..." : "Send Login Link"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-32 pb-20 px-6">
      <div className="max-w-5xl mx-auto">
        
        <div className="flex flex-col md:flex-row justify-between items-center bg-white/5 border border-white/10 p-8 rounded-3xl mb-10 shadow-xl">
          <div className="flex items-center space-x-6 mb-4 md:mb-0">
             <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-2xl font-bold shadow-lg shadow-indigo-500/30">
               {user.email?.charAt(0).toUpperCase()}
             </div>
             <div>
               <h1 className="text-2xl font-bold text-white">Welcome back!</h1>
               <p className="text-gray-400">{user.email}</p>
             </div>
          </div>
          <button onClick={handleLogout} className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-bold transition-all text-sm">
            Logout
          </button>
        </div>

        <h2 className="text-2xl font-bold mb-6 text-indigo-400">My Purchases & Subscriptions</h2>
        
        {myOrders.length === 0 ? (
          <div className="bg-white/5 border border-white/10 p-12 rounded-3xl text-center">
             <p className="text-gray-400 text-lg mb-6">You haven't purchased anything yet.</p>
             <Link href="/products" className="bg-indigo-600 px-8 py-3 rounded-xl font-bold">Browse Shop</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {myOrders.map((order) => {
              const diff = new Date(order.end_date).getTime() - new Date().getTime();
              const daysLeft = Math.ceil(diff / (1000 * 3600 * 24));
              const isSubActive = order.end_date && daysLeft > 0;

              return (
                <div key={order.id} className="bg-white/5 border border-white/10 p-6 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between md:items-center gap-6 group hover:border-indigo-500/30 transition-all">
                   <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="text-sm font-mono text-gray-500">Order #{order.id.toString().slice(0,8)}</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${order.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : order.status === 'cancelled' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="space-y-2 mt-4">
                        {(order.items || []).map((item: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-3">
                             <img src={item.image} className="w-10 h-10 rounded-lg object-cover bg-black/40" />
                             <div>
                               <p className="font-bold text-white text-sm">{item.name}</p>
                               <p className="text-xs text-gray-400">Qty: {item.quantity || 1} • {item.product_type}</p>
                             </div>
                          </div>
                        ))}
                      </div>
                   </div>

                   <div className="md:text-right border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6">
                      <p className="text-2xl font-black text-emerald-400 mb-2">${order.total_amount}</p>
                      
                      {order.end_date && (
                        <div className="mb-4">
                          <p className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-1">Subscription</p>
                          {isSubActive ? (
                             <span className="text-indigo-400 font-bold text-sm bg-indigo-500/10 px-3 py-1 rounded-lg border border-indigo-500/20">{daysLeft} Days Remaining</span>
                          ) : (
                             <span className="text-red-400 font-bold text-sm bg-red-500/10 px-3 py-1 rounded-lg border border-red-500/20">Expired</span>
                          )}
                        </div>
                      )}

                      {order.status === 'completed' && (
                        <button 
                          onClick={() => setSelectedOrder(order)} 
                          className="w-full md:w-auto bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 px-6 py-2 rounded-xl font-bold text-sm shadow-lg"
                        >
                          Access / View Details
                        </button>
                      )}
                      {order.status === 'pending' && (
                        <p className="text-xs text-yellow-400 italic">Verifying payment...</p>
                      )}
                   </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- 🌟 ORDER DETAILS & DOWNLOAD MODAL 🌟 --- */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#111] border border-white/10 p-8 rounded-3xl w-full max-w-2xl shadow-2xl relative my-8">
            
            <button 
              onClick={() => setSelectedOrder(null)} 
              className="absolute top-6 right-6 text-gray-500 hover:text-white font-black text-xl transition-colors"
            >
              ✕
            </button>
            
            <h3 className="text-2xl font-bold text-white mb-2">Access Details</h3>
            <p className="text-sm text-emerald-400 font-mono mb-8 pb-4 border-b border-white/10">
              Order #{selectedOrder.id.toString().slice(0,8)}
            </p>

            <div className="space-y-4">
               {(selectedOrder.items || []).map((item: any, idx: number) => (
                 <div key={idx} className="bg-black/40 p-5 rounded-2xl border border-white/5 flex flex-col md:flex-row justify-between md:items-center gap-4 hover:border-indigo-500/30 transition-colors">
                    
                    <div className="flex items-center gap-4">
                       <img src={item.image || "https://via.placeholder.com/150"} className="w-16 h-16 rounded-xl object-cover bg-white/5" />
                       <div>
                         <p className="font-bold text-white text-lg">{item.name}</p>
                         <p className="text-sm text-gray-400 mb-1">{item.product_type} • Qty: {item.quantity || 1}</p>
                       </div>
                    </div>
                    
                    <div className="text-right md:text-left">
                       {/* Product Type က 'download' လို့ ပေးထားရင်သာ Download ခလုတ်ပေါ်မည်။ ကျန်တာအားလုံး Status ပဲပေါ်မည်။ */}
                       {item.product_type && item.product_type.toLowerCase().includes('download') ? (
                          <a 
                            href={item.file_url || item.image} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all text-center w-full md:w-auto shadow-lg"
                          >
                            Download File ⬇
                          </a>
                       ) : (
                          <div className="bg-emerald-500/10 border border-emerald-500/20 px-5 py-3 rounded-xl flex flex-col items-center md:items-end">
                            <span className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-1">Access Status</span>
                            <span className="text-emerald-400 font-bold flex items-center gap-2">
                               <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                               Activated / Premium
                            </span>
                          </div>
                       )}
                    </div>

                 </div>
               ))}
            </div>

            <div className="mt-8 pt-6 border-t border-white/10">
               <h4 className="text-sm text-gray-300 font-bold mb-3">Your Account Setup Details:</h4>
               {/* 🌟 🔐 လျှို့ဝှက်စာသား (Admin Note / Credentials) ပြသမည့်နေရာ 🌟 */}
               {selectedOrder.admin_note && (
                 <div className="bg-emerald-500/10 p-5 rounded-xl border border-emerald-500/30 mb-4 shadow-[inset_0_0_20px_rgba(16,185,129,0.05)]">
                    <p className="text-xs text-emerald-400 mb-3 uppercase tracking-wider font-bold flex items-center gap-2">
                       <span>🔐</span> Your Access Credentials:
                    </p>
                    <div className="font-mono text-emerald-50 text-sm bg-[#0a0a0a] p-4 rounded-lg border border-white/5 break-words space-y-2">
                       {selectedOrder.admin_note.split('\n').map((line: string, i: number) => (
                           <p key={i}>{line}</p>
                       ))}
                    </div>
                 </div>
               )}
               {selectedOrder.order_note ? (
                 <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20 space-y-2 mb-4">
                    <p className="text-xs text-blue-300/70 mb-1 uppercase tracking-wider font-bold">Information you provided:</p>
                    {selectedOrder.order_note.split('|').map((note: string, idx: number) => (
                        <p key={idx} className="text-sm text-blue-100 font-mono">{note.trim()}</p>
                    ))}
                 </div>
               ) : (
                 <p className="text-sm text-gray-500 mb-4 italic">No specific details provided during checkout.</p>
               )}
               
               {/* 🌟 ညွှန်ကြားချက် 🌟 */}
               <div className="bg-white/5 p-5 rounded-xl border border-white/10">
                  <p className="text-sm text-gray-300 leading-relaxed">
                    <span className="text-indigo-400 font-bold">Instruction:</span> အထက်ပါ သင်ပေးပို့ထားသော အကောင့်သို့ Premium / Paid Plan ချိတ်ဆက်ပေးပြီး ဖြစ်ပါသည်။ သက်ဆိုင်ရာ Application ထဲသို့ ဝင်ရောက်စစ်ဆေးနိုင်ပါသည်။ (အခက်အခဲ တစ်စုံတစ်ရာ ရှိပါက Customer Support သို့ ဆက်သွယ်ပါ။)
                  </p>
               </div>
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
}