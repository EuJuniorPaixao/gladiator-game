/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  turbopack: {},
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), 'canvas'];
    }
    return config;
  },
};
module.exports = nextConfig;
