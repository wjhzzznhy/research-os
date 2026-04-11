import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',

  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'libraries.excalidraw.com',
        pathname: '/**',
      },
    ],
  },

  transpilePackages: [
    '@excalidraw/excalidraw',
    '@excalidraw/common',
    '@excalidraw/element',
    '@excalidraw/math',
    '@excalidraw/utils',
    'tunnel-rat',
    'zustand',
    'use-sync-external-store',
  ],

  webpack: (config, { isServer, webpack }) => {
    config.externals.push({ canvas: 'commonjs canvas' });

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }

    config.module.rules.push({
      test: /\.(woff2?|woff|ttf|otf|eot)$/i,
      type: 'asset/resource',
    });

    config.resolve.alias = {
      ...config.resolve.alias,
      '@excalidraw/excalidraw': path.resolve(__dirname, '../../packages/vendor/excalidraw/packages/excalidraw'),
      '@excalidraw/common': path.resolve(__dirname, '../../packages/vendor/excalidraw/packages/common/src'),
      '@excalidraw/element': path.resolve(__dirname, '../../packages/vendor/excalidraw/packages/element/src'),
      '@excalidraw/math': path.resolve(__dirname, '../../packages/vendor/excalidraw/packages/math/src'),
      '@excalidraw/utils': path.resolve(__dirname, '../../packages/vendor/excalidraw/packages/utils/src'),
    };

    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /@excalidraw\/.*\/dist\//,
        (resource) => {
          if (resource.request.includes('@excalidraw/excalidraw')) {
            resource.request = path.resolve(__dirname, '../../packages/vendor/excalidraw/packages/excalidraw/index.tsx');
          } else if (resource.request.includes('@excalidraw/common')) {
            resource.request = path.resolve(__dirname, '../../packages/vendor/excalidraw/packages/common/src/index.ts');
          } else if (resource.request.includes('@excalidraw/element')) {
            resource.request = path.resolve(__dirname, '../../packages/vendor/excalidraw/packages/element/src/index.ts');
          } else if (resource.request.includes('@excalidraw/math')) {
            resource.request = path.resolve(__dirname, '../../packages/vendor/excalidraw/packages/math/src/index.ts');
          } else if (resource.request.includes('@excalidraw/utils')) {
            resource.request = path.resolve(__dirname, '../../packages/vendor/excalidraw/packages/utils/src/index.ts');
          }
        }
      ),
      new webpack.NormalModuleReplacementPlugin(
        /\/packages\/vendor\/excalidraw\/packages\/.*\/dist\//,
        (resource) => {
          if (resource.request.includes('excalidraw/index')) {
            resource.request = path.resolve(__dirname, '../../packages/vendor/excalidraw/packages/excalidraw/index.tsx');
          } else if (resource.request.includes('common/src')) {
            resource.request = path.resolve(__dirname, '../../packages/vendor/excalidraw/packages/common/src/index.ts');
          } else if (resource.request.includes('element/src')) {
            resource.request = path.resolve(__dirname, '../../packages/vendor/excalidraw/packages/element/src/index.ts');
          } else if (resource.request.includes('math/src')) {
            resource.request = path.resolve(__dirname, '../../packages/vendor/excalidraw/packages/math/src/index.ts');
          } else if (resource.request.includes('utils/src')) {
            resource.request = path.resolve(__dirname, '../../packages/vendor/excalidraw/packages/utils/src/index.ts');
          }
        }
      )
    );

    return config;
  },

  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: process.env.API_URL_INTERNAL || 'http://localhost:8000/api/v1/:path*',
      },
    ];
  },
};

export default nextConfig;
