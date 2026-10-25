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

# Apply PHP-FPM pool tuning for performance and responsiveness
cat << 'EOF' > /usr/local/etc/php-fpm.d/zz-pkspl.conf
[www]
pm = dynamic
pm.max_children = 20
pm.start_servers = 4
pm.min_spare_servers = 2
pm.max_spare_servers = 6
pm.max_requests = 1000
EOF

# Apply OPcache tuning for high throughput and reduced mount stat overhead
cat << 'EOF' > /usr/local/etc/php/conf.d/zz-pkspl-opcache.ini
opcache.enable=1
opcache.enable_cli=0
opcache.memory_consumption=256
opcache.interned_strings_buffer=16
opcache.max_accelerated_files=20000
opcache.revalidate_freq=30
opcache.validate_timestamps=1
opcache.save_comments=1
opcache.enable_file_override=1
EOF

# Set permissions quickly without heavy recursive traversals on Windows mounts
chmod 0777 /var/www/html/storage /var/www/html/bootstrap/cache 2>/dev/null || true

# Execute the main command (php-fpm, queue:work, etc.)
exec "$@"
