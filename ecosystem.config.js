/**
 * PM2 ecosystem configuration for BigPanda Project Assistant
 *
 * Manages two processes:
 * 1. Next.js server (port 3000)
 * 2. BullMQ worker (background job processor)
 *
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 reload ecosystem.config.js  (zero-downtime reload)
 *   pm2 stop ecosystem.config.js
 *   pm2 logs
 */

module.exports = {
  apps: [
    {
      name: 'bigpanda-next',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './logs/next-error.log',
      out_file: './logs/next-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
    {
      name: 'bigpanda-worker',
      script: 'node',
      args: './worker/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/worker-error.log',
      out_file: './logs/worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // Restart worker if it crashes
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
};
