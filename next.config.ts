import type { NextConfig } from "next";
import type { RemotePattern } from "next/dist/shared/lib/image-config";
import withBundleAnalyzer from "@next/bundle-analyzer";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabasePattern: RemotePattern | null = null;

if (supabaseUrl) {
  try {
    const url = new URL(supabaseUrl);
    supabasePattern = {
      protocol: url.protocol.replace(":", "") as "http" | "https",
      hostname: url.hostname,
      ...(url.port ? { port: url.port } : {}),
    };
  } catch {
    console.warn("Invalid NEXT_PUBLIC_SUPABASE_URL value configured:", supabaseUrl);
  }
}

const remotePatterns: RemotePattern[] = [
  {
    protocol: "https",
    hostname: "images.unsplash.com",
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
    remotePatterns,
  },
};

const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

export default withAnalyzer(nextConfig);
