import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  devIndicators: false,
  allowedDevOrigins: [
    "192.168.97.178",
    "192.168.97.178:3000",
    "192.168.1.105",
    "192.168.1.105:3000",
    "localhost:3000",
  ],
};

export default nextConfig;
