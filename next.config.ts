import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Development only: lets phones and tablets on the same Wi-Fi open the dev
  // server (http://192.168.x.x:3000) to test the site and Razorpay checkout.
  // Without this the page never finishes loading on those devices.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "*.local"],
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
