/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Enable source maps in development mode for better debugging
  webpack(config, { dev }) {
    if (dev) {
      config.devtool = 'source-map';
    }
    
    return config;
  },
};

export default nextConfig;
