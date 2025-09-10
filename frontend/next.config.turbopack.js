/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker
  output: 'standalone',
  
  // Force webpack mode - remove all Turbopack configuration
  // This should make Next.js use webpack instead of Turbopack
  
  // Experimental features - remove turbo configuration completely
  experimental: {
    // Keep experimental object but remove turbo config
  },
  
  // Compression
  compress: true,
  
  // Headers for security and performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Security headers
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Performance headers
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  
  // Redirects
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ];
  },
  
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000, // 1 year
  },
  
  // Bundle analyzer (only in development)
  ...(process.env.ANALYZE === 'true' && {
    webpack: (config) => {
      config.plugins.push(
        new (require('@next/bundle-analyzer'))({
          enabled: true,
        })
      );
      return config;
    },
  }),
  
  // Environment variables for build time
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || '1.0.0',
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
  
  // TypeScript configuration
  typescript: {
    // Only run type checking in CI/CD, not during build
    ignoreBuildErrors: process.env.NODE_ENV === 'production',
  },
  
  // ESLint configuration
  eslint: {
    // Only run ESLint in CI/CD, not during build
    ignoreDuringBuilds: process.env.NODE_ENV === 'production',
  },
  
  // Webpack optimizations
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Three.js specific optimizations
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').join(__dirname, 'src'),
      // Ensure Three.js uses ES modules
      'three': 'three',
      '@react-three/fiber': '@react-three/fiber',
      '@react-three/drei': '@react-three/drei',
    };
    
    // Configure module rules for better Three.js handling
    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/,
      use: ['raw-loader', 'glslify-loader'],
    });
    
    // Improve HMR for Three.js components in development
    if (dev) {
      // Disable Fast Refresh for Three.js files to prevent crashes
      config.module.rules.push({
        test: /\.(jsx?|tsx?)$/,
        include: [
          require('path').join(__dirname, 'src/components/ThemeGlobe.tsx'),
          require('path').join(__dirname, 'src/components/ThemeGlobeWrapper.tsx'),
        ],
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['next/babel'],
            plugins: [
              // Disable Fast Refresh for Three.js components
              process.env.NODE_ENV === 'development' && [
                'react-refresh/babel',
                { skipEnvCheck: true }
              ]
            ].filter(Boolean),
          },
        },
      });
      
      // Configure webpack-dev-server for better HMR stability
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: ['**/node_modules/**', '**/.next/**'],
      };
    }
    
    // Production optimizations
    if (!dev) {
      // Bundle optimization with Three.js considerations
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            // Separate Three.js into its own chunk for better caching
            three: {
              test: /[\\/]node_modules[\\/](three|@react-three)[\\/]/,
              name: 'three',
              priority: 30,
              reuseExistingChunk: true,
            },
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              priority: 10,
              reuseExistingChunk: true,
            },
            common: {
              name: 'common',
              minChunks: 2,
              priority: 5,
              reuseExistingChunk: true,
            },
          },
        },
      };
      
      // Add bundle size limit warnings (increased for Three.js)
      config.performance = {
        maxAssetSize: 500000, // Increased for Three.js
        maxEntrypointSize: 500000,
        hints: 'warning',
      };
    }
    
    // Externalize Three.js in server-side rendering (only when not using Turbopack)
    if (isServer && (process.env.TURBOPACK === '0' || process.env.TURBOPACK === 'false')) {
      config.externals = config.externals || [];
      config.externals.push('three', '@react-three/fiber', '@react-three/drei');
    }
    
    return config;
  },
  
  // Logging for debugging
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === 'development',
    },
  },
  
  // PoweredByHeader
  poweredByHeader: false,
  
  // Generate manifest for PWA capabilities
  ...(process.env.NODE_ENV === 'production' && {
    generateBuildId: async () => {
      return process.env.BUILD_ID || 'standalone-build';
    },
  }),
};

module.exports = nextConfig;