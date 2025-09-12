/** @type {import('next').NextConfig} */
const nextConfig = {
  // Webpack configuration for Three.js
  webpack: (config, { isServer }) => {
    // Handle Three.js imports
    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/,
      type: 'asset/source',
    });
    
    // Optimize for Three.js
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'three': require.resolve('three')
      };
    }
    
    return config;
  },
  
  // Enable React Strict Mode
  reactStrictMode: true,
  
  // Use standalone output for production deployment
  output: 'standalone',
  
  // Disable trailing slash handling
  trailingSlash: false,
  skipTrailingSlashRedirect: true,
};

module.exports = nextConfig;
