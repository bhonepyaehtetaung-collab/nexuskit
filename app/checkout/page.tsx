"use client";

import { useCart } from "../context/cartContext";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "../../utils/supabase/client";

export default function CheckoutPage() {
  const { cartItems, clearCart } = useCart();
  const router = useRouter();
  const [totalPrice, setTotalPrice] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState("pending"); // New state for payment status
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const total = cartItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    setTotalPrice(total);
  }, [cartItems]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleCompletePurchase = async () => {
    if (!selectedFile) {
      alert("Please select a payment slip to upload.");
      return;
    }

    setPaymentStatus("uploading");

    const fileExtension = selectedFile.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExtension}`;
    const filePath = `public/${fileName}`;

    const { error } = await supabase.storage
      .from("payment-slips")
      .upload(filePath, selectedFile);

    if (error) {
      console.error("Error uploading file:", error);
      setPaymentStatus("pending"); // Revert status on error
      alert("Error uploading payment slip. Please try again.");
      return; // Stop execution if upload fails
    }

    const { data: publicUrlData } = await supabase.storage
      .from("payment-slips")
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;

    // Insert order details into the 'orders' table
    const { error: insertError } = await supabase.from("orders").insert({
      total_amount: totalPrice,
      slip_image_url: publicUrl,
      cart_items: cartItems,
    });

    if (insertError) {
      console.error("Error inserting order:", insertError);
      setPaymentStatus("pending"); // Revert status on error
      alert("Error recording order details. Please try again.");
      return; // Stop execution if insert fails
    }

    // If both upload and insert are successful
    setPaymentStatus("submitted");
    clearCart();

    if (error) {
      console.error("Error uploading file:", error);
      setPaymentStatus("pending"); // Revert status on error
      alert("Error uploading payment slip. Please try again.");
    } else {
      setPaymentStatus("submitted");
      clearCart();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-950 text-white font-sans antialiased flex items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-gray-800 rounded-3xl shadow-2xl p-8 md:p-12 border border-gray-700">
        <h2 className="text-5xl font-extrabold text-center mb-10 text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-600 drop-shadow-lg">
          Checkout
        </h2>

        {cartItems.length === 0 ? (
          <p className="text-center text-gray-400 text-xl">Your cart is empty.</p>
        ) : (
          <div className="mb-10">
            <h3 className="text-3xl font-bold text-gray-200 mb-6">Order Summary</h3>
            <div className="space-y-4">
              {cartItems.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center bg-gray-700 p-4 rounded-xl shadow-md"
                >
                  <div className="flex items-center">
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded-lg mr-4"
                    />
                    <div>
                      <p className="text-xl font-semibold text-gray-50">{item.name}</p>
                      <p className="text-gray-400">
                        ${item.price.toFixed(2)} x {item.quantity}
                      </p>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-teal-400">
                    ${(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
            <div className="text-right text-4xl font-extrabold text-teal-300 mt-8 pt-6 border-t border-gray-700">
              Total: ${totalPrice.toFixed(2)}
            </div>
          </div>
        )}

        {paymentStatus !== "submitted" ? (
          <form className="space-y-6">
            <div>
              <label htmlFor="fullName" className="block text-gray-300 text-lg font-medium mb-2">
                Full Name
              </label>
              <input
                type="text"
                id="fullName"
                className="w-full p-4 rounded-xl bg-gray-700 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition duration-300 ease-in-out text-lg"
                placeholder="John Doe"
                required
              />
            </div>

            <div className="bg-gray-700 p-6 rounded-xl shadow-md">
              <h4 className="text-2xl font-bold text-gray-200 mb-4">Payment Instructions</h4>
              <p className="text-gray-300 mb-4">
                Please transfer the total amount to the following digital wallet:
              </p>
              <p className="text-xl font-semibold text-teal-400 mb-2">Phone Number: +95 9XXX XXX XXX</p>
              <div className="flex justify-center mb-4">
                <img src="/qr-placeholder.png" alt="QR Code" className="w-48 h-48 object-cover rounded-lg" />
              </div>
              <p className="text-gray-300 text-center">
                Scan the QR code or use the phone number above to make your payment.
              </p>
            </div>

            <div>
              <label htmlFor="paymentSlip" className="block text-gray-300 text-lg font-medium mb-2">
                Upload Payment Screenshot
              </label>
              <input
                type="file"
                id="paymentSlip"
                className="w-full p-4 rounded-xl bg-gray-700 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition duration-300 ease-in-out text-lg file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-lg file:font-semibold file:bg-teal-500 file:text-white hover:file:bg-teal-600"
                accept="image/*"
                required
                onChange={handleFileChange}
              />
            </div>

            <button
              type="button"
              onClick={handleCompletePurchase}
              disabled={cartItems.length === 0 || !selectedFile || paymentStatus === "uploading"}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white text-xl font-bold shadow-lg hover:from-teal-700 hover:to-cyan-700 transition duration-300 ease-in-out transform hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-teal-500 focus:ring-opacity-70 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {paymentStatus === "uploading" ? "Uploading..." : "Submit Payment Slip"}
            </button>
          </form>
        ) : ( // paymentStatus is "submitted"
          <div className="text-center py-10">
            <h3 className="text-4xl font-bold text-teal-400 mb-4">Payment Submitted!</h3>
            <p className="text-xl text-gray-300">Your order is now under review. We will confirm your payment shortly.</p>
            <p className="text-lg text-gray-400 mt-2">Thank you for your patience.</p>
            <button
              onClick={() => router.push(
                '/'
              )}
              className="mt-8 py-3 px-8 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white text-lg font-bold shadow-lg hover:from-teal-700 hover:to-cyan-700 transition duration-300 ease-in-out transform hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-teal-500 focus:ring-opacity-70"
            >
              Continue Shopping
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
