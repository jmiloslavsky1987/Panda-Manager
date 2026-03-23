#!/bin/bash
# Start Redis for BigPanda App development
REDIS_SERVER="$(dirname "$0")/tools/redis/redis-7.2.4/src/redis-server"
REDIS_CLI="$(dirname "$0")/tools/redis/redis-7.2.4/src/redis-cli"

# Check if already running
if $REDIS_CLI ping 2>/dev/null | grep -q PONG; then
  echo "Redis already running on port 6379"
  exit 0
fi

echo "Starting Redis..."
nohup "$REDIS_SERVER" --port 6379 --daemonize yes --logfile /tmp/redis-bigpanda.log --dir /tmp > /dev/null 2>&1
sleep 1

if $REDIS_CLI ping 2>/dev/null | grep -q PONG; then
  echo "Redis started successfully (port 6379)"
else
  echo "ERROR: Redis failed to start. Check /tmp/redis-bigpanda.log"
  exit 1
fi
