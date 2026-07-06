import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    authInterrupts: true,
  },
  turbopack: {
    rules: {
      "*.graphql": {
        as: "*.ts",
        loaders: [
          {
            loader: "graphql-tag/loader",
          },
        ],
      },
    },
  },
};

export default nextConfig;
