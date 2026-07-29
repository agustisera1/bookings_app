import type { NextConfig } from "next";

const s3 = "https://bookings-app-listings-bucket.s3.us-east-2.amazonaws.com/**";
const mocks = "https://dummyimage.com/**"; // Reset DB and clearup mock images

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [new URL(s3), new URL(mocks)],
    // Floor for entries whose origin sends no Cache-Control (objects uploaded
    // before we started setting it, and the mocks). Next takes whichever is
    // larger, so new uploads are already governed by their own 1-year header.
    // Safe only because every URL above is immutable — an S3 key carries a
    // UUID and a dummyimage URL fully describes its image. There is no cache
    // invalidation API: to purge, delete `.next/cache/images`.
    minimumCacheTTL: 31536000,
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
