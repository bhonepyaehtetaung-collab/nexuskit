import type { Metadata, Viewport } from "next";
// 🔴 အောက်က စာကြောင်းလေးက CSS ကို အသက်သွင်းပေးမယ့် အရေးကြီးဆုံး စာကြောင်းပါ 🔴
import "./globals.css"; 
import { CartProvider } from "./context/cartContext";
import ConditionalUI from "./components/ConditionalUI";

export const metadata: Metadata = {
  title: "NexusKit | Premium Digital Assets",
  description: "Premium digital assets, UI kits, and resources for modern creators.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "NexusKit",
  },
  icons: {
    apple: "/icon-192x192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[#0a0a0a] text-white antialiased min-h-screen flex flex-col">
        <CartProvider>
          <ConditionalUI>
            {children}
          </ConditionalUI>
        </CartProvider>
      </body>
    </html>
  );
}