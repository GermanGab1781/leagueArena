import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true, // disables next/image optimization globally
  },
};

export default nextConfig;
