import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
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
