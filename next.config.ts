import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  experimental: {
    useCache: true,
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    // Vercel's Hobby plan caps monthly image-optimization transforms; once hit,
    // /_next/image starts returning 402 and every unoptimized-variant image breaks.
    // Source images are already served as .webp from Supabase Storage, so skip
    // Vercel's optimizer entirely and serve them as-is.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "cdn.shopify.com",
      },
      {
        protocol: "https",
        hostname: "www.bagues.com.ar",
      },
      {
        protocol: "https",
        hostname: "**.cloudinary.com",
      },
    ],
  },
};

export default nextConfig;
