/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@techorbit/ui'],
  webpack: (config) => {
    // Ensure .tsx files are resolved for the UI package
    config.resolve.extensionAlias = {
      '.js': ['.tsx', '.ts', '.jsx', '.js'],
    };
    return config;
  },
};

module.exports = nextConfig;