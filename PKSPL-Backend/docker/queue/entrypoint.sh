#!/bin/sh
set -e
cd /var/www/html
php artisan queue:work --queue=default --tries=3 --timeout=90 --sleep=3 --max-jobs=500 --max-time=3600
