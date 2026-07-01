import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // No locale-less routes exist; send the bare root to the default locale.
      { source: "/", destination: "/pt", permanent: false },
    ];
  },
};

export default nextConfig;
