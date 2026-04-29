const nextConfig = {
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
        protocol: 'https',
        hostname: 'loremflickr.com',
        port: '',
        pathname: '/**', // Разрешаем все пути на этом домене
      },
    ],
  },
};

module.exports = nextConfig;
