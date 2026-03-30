import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

// Supabase URL'inden hostname ve protokol çıkarmak için
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabasePattern = null;

if (supabaseUrl) {
  try {
    const url = new URL(supabaseUrl);
    supabasePattern = {
      protocol: url.protocol.replace(':', '') as "http" | "https",
      hostname: url.hostname,
      ...(url.port ? { port: url.port } : {}),
    };
  } catch (error) {
    console.warn("Geçersiz NEXT_PUBLIC_SUPABASE_URL değeri yapılandırıldı:", supabaseUrl);
  }
}

const remotePatterns: any[] = [
  {
    protocol: "https",
    hostname: "images.unsplash.com",
  },
  {
    protocol: "https",
    hostname: "res.cloudinary.com",
  },
  {
    protocol: "https",
    hostname: "upload.wikimedia.org",
  },
];

if (supabasePattern) {
  remotePatterns.push(supabasePattern);
}

const nextConfig: NextConfig = {
  images: {
    loader: "custom",
    loaderFile: "./src/cloudinary-loader.ts",
    remotePatterns,
  },
};

const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

export default withAnalyzer(nextConfig);
