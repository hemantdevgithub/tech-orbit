const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Standalone mode emits a self-contained server at .next/standalone — Docker
  // prod image copies only that + .next/static + public/ for a slim runtime.
  output: "standalone",
  transpilePackages: ["@techorbit/ui"],
  webpack: (config) => {
    // Ensure .tsx files are resolved for the UI package
    config.resolve.extensionAlias = {
      ".js": [".tsx", ".ts", ".jsx", ".js"],
    };
    return config;
  },
};

// Run `ANALYZE=true pnpm --filter @techorbit/web build` to open treemaps.
module.exports = withBundleAnalyzer(nextConfig);
