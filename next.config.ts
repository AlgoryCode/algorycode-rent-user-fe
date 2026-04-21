import bundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";

const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

/**
 * Görseller `s3.algorycode.com` üzerinden geliyorsa, depoda `Cache-Control` (örn. max-age=86400)
 * ve uygun boyutta kaynak dosya en büyük LCP kazancını verir; FE yalnızca `next/image` ile optimize eder.
 */
const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    /** `next/image` quality değerleri — VehicleCard vb. */
    qualities: [75, 88],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
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

export default withBundleAnalyzer(nextConfig);
