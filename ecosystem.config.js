module.exports = {
  apps: [
    {
      name: 'recipe-app',
      cwd: '/var/www/recipe_app',
      script: 'npm',
      args: 'run start:prod',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
    },
  ],
};
