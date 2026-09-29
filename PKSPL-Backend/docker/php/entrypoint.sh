#!/bin/bash
set -e

# =============================================================
# PKSPL Entrypoint Script
# Purpose: Ensure vendor dependencies exist in the named volume
#          before starting the main process (php-fpm or queue).
# =============================================================

if [ ! -f /var/www/html/vendor/autoload.php ]; then
    echo "[entrypoint] vendor/autoload.php not found in named volume."
    echo "[entrypoint] Running composer install..."
    cd /var/www/html
    composer install --prefer-dist --no-interaction --no-scripts
else
    echo "[entrypoint] Vendor dependencies ready."
fi

# Set permissions quickly without heavy recursive traversals on Windows mounts
chmod 0777 /var/www/html/storage /var/www/html/bootstrap/cache 2>/dev/null || true

# Execute the main command (php-fpm, queue:work, etc.)
exec "$@"
