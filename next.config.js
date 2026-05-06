const nextConfig = {
  output: 'standalone',
  allowedDevOrigins: ['188.233.238.70'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:5000/:path*',
      },
      {
        source: '/storage/:path*',
        destination: 'http://127.0.0.1:9000/:path*',
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.jsdelivr.net',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'http',
        hostname: '188.233.238.70',
      },
      {
        protocol: 'https',
        hostname: '188.233.238.70',
      },
      {
        protocol: 'http',
        hostname: '188.233.238.70',
        port: '9001',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '188.233.238.70',
        port: '9000',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '188.233.238.70',
        port: '9001',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '188.233.238.70',
        port: '9000',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'loremflickr.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'img.freepik.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '9000',
        pathname: '/vkusno/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
};

module.exports = nextConfig;


