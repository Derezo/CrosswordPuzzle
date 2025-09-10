/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable all experimental features
  experimental: {
    turbo: undefined,
    turbopack: undefined
  },
  
  // Webpack configuration optimized for stability
  webpack: (config, { isServer }) => {
    // Handle Three.js imports
    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/,
      type: 'asset/source',
    });
    
    // Disable webpack cache for clean builds
    config.cache = false;
    
    // Set mode explicitly
    config.mode = 'development';
    
    // Optimize for Three.js
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'three': require.resolve('three')
      };
    }
    
    return config;
  },
  
  // Disable fast refresh for stability
  reactStrictMode: false,
  
  // Disable SWC minification
  swcMinify: false,
  
  // Use babel instead of SWC
  compiler: undefined
};

module.exports = nextConfig;
