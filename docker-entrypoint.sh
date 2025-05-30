#!/bin/sh

# Replace environment variables in env-config.js
envsubst < /usr/share/nginx/html/env-config.js > /usr/share/nginx/html/env-config.tmp
mv /usr/share/nginx/html/env-config.tmp /usr/share/nginx/html/env-config.js

# Start supervisord
exec /usr/bin/supervisord -c /etc/supervisord.conf