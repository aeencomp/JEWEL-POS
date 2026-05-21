/** PM2 process config — run: pm2 start ecosystem.config.cjs --env production */
module.exports = {
  apps: [
    {
      name: "jewel-pos",
      script: "dist/index.cjs",
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "development",
        PORT: 5001,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 5001,
      },
    },
  ],
};
