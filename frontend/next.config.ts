import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/inventory/upakovka",
        destination: "/touch/pack",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
