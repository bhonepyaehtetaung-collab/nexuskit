"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [isDark, setIsDark] = useState(true); // Theme Toggle State
  
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [settings, setSettings] = useState({ site_name: "", contact_email: "", contact_phone: "", address: "" });
  
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [addingProduct, setAddingProduct] = useState(false);
  
  // New Product Form State
  const [newProduct, setNewProduct] = useState({ name: "", price: "", image: "", description: "" });

  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersRes, productsRes, settingsRes] = await Promise.all([
        supabase.from("orders").select("*").order("created_at", { ascending: false }),
        supabase.from("products").select("*").order("created_at", { ascending: false }),
        supabase.from("site_settings").select("*").eq("id", 1).single()
      ]);

      if (ordersRes.data) setOrders(ordersRes.data);
      if (productsRes.data) setProducts(productsRes.data);
      if (settingsRes.data) setSettings(settingsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- Orders Functions ---
  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    } catch (error) {
      alert("Failed to update status.");
    }
  };

  const exportReport = () => {
    if (orders.length === 0) return alert("No orders to export.");
    let csvContent = "Date,Customer Name,Email,Total Amount,Status\n";
    orders.forEach((order) => {
      const date = new Date(order.created_at).toLocaleDateString();
      csvContent += `${date},"${order.customer_name || ''}","${order.customer_email || ''}",${order.total_amount || 0},${order.status || 'pending'}\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "admin_report.csv";
    link.click();
  };

  // --- Settings Function ---
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await supabase.from("site_settings").upsert({ id: 1, ...settings });
      alert("Settings updated!");
    } catch (error) {
      alert("Failed to save settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  // --- Products Functions ---
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingProduct(true);
    try {
      const { data, error } = await supabase.from("products").insert([{
        name: newProduct.name,
        price: parseFloat(newProduct.price),
        image: newProduct.image,
        description: newProduct.description
      }]).select();
      
      if (error) throw error;
      if (data) setProducts([data[0], ...products]);
      setNewProduct({ name: "", price: "", image: "", description: "" }); // Reset form
      alert("Product added successfully!");
    } catch (error) {
      console.error(error);
      alert("Failed to add product.");
    } finally {
      setAddingProduct(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      await supabase.from("products").delete().eq("id", id);
      setProducts(products.filter(p => p.id !== id));
    } catch (error) {
      alert("Failed to delete product.");
    }
  };

  // Theme Colors
  const themeBg = isDark ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900";
  const sidebarBg = isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200";
  const cardBg = isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200 shadow-sm";
  const inputBg = isDark ? "bg-gray-900 border-gray-600 text-white" : "bg-gray-50 border-gray-300 text-gray-900";
  const textMuted = isDark ? "text-gray-400" : "text-gray-500";
  const tableHeader = isDark ? "bg-gray-900/50" : "bg-gray-100";

  return (
    <div className={`min-h-screen flex flex-col md:flex-row transition-colors duration-300 ${themeBg}`}>
      
      {/* Sidebar */}
      <aside className={`w-full md:w-64 border-r md:min-h-screen p-6 flex flex-col ${sidebarBg}`}>
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
            NexusKit
          </h2>
          {/* Theme Toggle Button */}
          <button onClick={() => setIsDark(!isDark)} className="p-2 rounded-full hover:bg-gray-500/20 transition">
            {isDark ? "☀️" : "🌙"}
          </button>
        </div>

        <nav className="flex-1 space-y-2">
          {['overview', 'products', 'orders', 'settings'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-all ${
                activeTab === tab 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" 
                  : `hover:bg-gray-500/10 ${textMuted}`
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 md:h-screen overflow-y-auto">
        <h1 className="text-3xl font-bold mb-8 capitalize">{activeTab} Dashboard</h1>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className={`p-6 rounded-2xl border ${cardBg}`}>
              <h3 className={`text-sm font-medium mb-2 ${textMuted}`}>Total Revenue</h3>
              <p className="text-3xl font-bold">${orders.reduce((acc, o) => acc + Number(o.total_amount || 0), 0).toLocaleString()}</p>
            </div>
            <div className={`p-6 rounded-2xl border ${cardBg}`}>
              <h3 className={`text-sm font-medium mb-2 ${textMuted}`}>Total Orders</h3>
              <p className="text-3xl font-bold">{orders.length}</p>
            </div>
            <div className={`p-6 rounded-2xl border ${cardBg}`}>
              <h3 className={`text-sm font-medium mb-2 ${textMuted}`}>Total Products</h3>
              <p className="text-3xl font-bold">{products.length}</p>
            </div>
            <div className={`p-6 rounded-2xl border ${cardBg}`}>
              <h3 className={`text-sm font-medium mb-2 ${textMuted}`}>Pending Orders</h3>
              <p className="text-3xl font-bold">{orders.filter(o => o.status === 'pending').length}</p>
            </div>
          </div>
        )}

        {/* Products Tab */}
        {activeTab === "products" && (
          <div className="space-y-8">
            {/* Add Product Form */}
            <div className={`p-6 rounded-2xl border ${cardBg}`}>
              <h2 className="text-xl font-semibold mb-4">Add New Product</h2>
              <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input required type="text" placeholder="Product Name" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className={`px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none ${inputBg}`} />
                <input required type="number" step="0.01" placeholder="Price ($)" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} className={`px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none ${inputBg}`} />
                <input required type="url" placeholder="Image URL (e.g., Unsplash link)" value={newProduct.image} onChange={e => setNewProduct({...newProduct, image: e.target.value})} className={`px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none md:col-span-2 ${inputBg}`} />
                <textarea required placeholder="Description" rows={3} value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} className={`px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none md:col-span-2 resize-none ${inputBg}`} />
                <div className="md:col-span-2">
                  <button type="submit" disabled={addingProduct} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition">
                    {addingProduct ? "Adding..." : "+ Add Product"}
                  </button>
                </div>
              </form>
            </div>

            {/* Product List */}
            <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`${tableHeader} ${textMuted} text-sm uppercase tracking-wider`}>
                      <th className="p-4 font-medium">Product</th>
                      <th className="p-4 font-medium">Price</th>
                      <th className="p-4 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {products.map((product) => (
                      <tr key={product.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <td className="p-4 font-medium">{product.name}</td>
                        <td className="p-4 text-green-500 font-semibold">${product.price}</td>
                        <td className="p-4">
                          <button onClick={() => handleDeleteProduct(product.id)} className="text-red-500 hover:text-red-700 font-medium text-sm">
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === "orders" && (
          <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-semibold">Recent Orders</h2>
              <button onClick={exportReport} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition text-sm">
                Export (CSV)
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={`${tableHeader} ${textMuted} text-sm uppercase tracking-wider`}>
                    <th className="p-4 font-medium">Date</th>
                    <th className="p-4 font-medium">Customer</th>
                    <th className="p-4 font-medium">Total</th>
                    <th className="p-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition">
                      <td className={`p-4 ${textMuted}`}>{new Date(order.created_at).toLocaleDateString()}</td>
                      <td className="p-4 font-medium">{order.customer_name}</td>
                      <td className="p-4 font-semibold">${order.total_amount}</td>
                      <td className="p-4">
                        <select
                          value={order.status || "pending"}
                          onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                          className={`border rounded-lg p-2 outline-none ${inputBg}`}
                        >
                          <option value="pending">Pending</option>
                          <option value="processing">Processing</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div className={`p-6 md:p-8 rounded-2xl border max-w-3xl ${cardBg}`}>
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div>
                <label className={`block text-sm font-medium mb-2 ${textMuted}`}>Site Name</label>
                <input required type="text" value={settings.site_name} onChange={(e) => setSettings({...settings, site_name: e.target.value})} className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none ${inputBg}`} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${textMuted}`}>Contact Email</label>
                  <input required type="email" value={settings.contact_email} onChange={(e) => setSettings({...settings, contact_email: e.target.value})} className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none ${inputBg}`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${textMuted}`}>Contact Phone</label>
                  <input required type="text" value={settings.contact_phone} onChange={(e) => setSettings({...settings, contact_phone: e.target.value})} className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none ${inputBg}`} />
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${textMuted}`}>Physical Address</label>
                <textarea required rows={3} value={settings.address} onChange={(e) => setSettings({...settings, address: e.target.value})} className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none resize-none ${inputBg}`} />
              </div>
              <button type="submit" disabled={savingSettings} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition">
                {savingSettings ? "Saving..." : "Save Settings"}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}