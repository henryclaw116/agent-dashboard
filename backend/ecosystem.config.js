module.exports = {
  apps: [{
    name: 'agent-dashboard-backend',
    script: 'dist/server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      PORT: 3002,
      WS_PORT: 3003
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    // Auto-restart configuration
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000
  }]
};
