import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    /** `next/image` quality değerleri — VehicleCard vb. */
    qualities: [75, 88],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "s3.algorycode.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
