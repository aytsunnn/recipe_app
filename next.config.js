const nextConfig = {
  // output: 'standalone', // Disabled to simplify deployment for now
  allowedDevOrigins: ['umami-recipes.ru'],
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
    unoptimized: true,
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
        hostname: 'umami-recipes.ru',
      },
      {
        protocol: 'https',
        hostname: 'umami-recipes.ru',
      },
      {
        protocol: 'http',
        hostname: 'umami-recipes.ru',
        port: '9001',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'umami-recipes.ru',
        port: '9000',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'umami-recipes.ru',
        port: '9001',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'umami-recipes.ru',
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


