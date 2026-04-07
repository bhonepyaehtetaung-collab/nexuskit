import type { NextConfig } from "next";
import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development", // Dev မှာမလိုပါ၊ Live လွှင့်မှ အလုပ်လုပ်မည်
});

const nextConfig: NextConfig = {
  // သင့်ရဲ့ မူလ config များ (ရှိလျှင် ဤနေရာတွင် ထည့်ပါ)
  reactStrictMode: true,
};

export default withPWA(nextConfig);