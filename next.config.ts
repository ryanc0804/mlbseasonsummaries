import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bundle the pregenerated recap JSONs into the serverless function so the
  // cache-first API can read them when deployed (fs reads aren't auto-traced).
  outputFileTracingIncludes: {
    "/api/recap": ["./data/recaps/**"],
  },
};

export default nextConfig;
