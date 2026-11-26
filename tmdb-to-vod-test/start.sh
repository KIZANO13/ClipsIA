#!/bin/sh
set -eu
sed -i "s/^Listen 80$/Listen $PORT/" /etc/apache2/ports.conf
sed -i "s/<VirtualHost \*:80>/<VirtualHost *:$PORT>/" /etc/apache2/sites-available/000-default.conf
cd /var/www/html
php generate_live_playlist.php >/tmp/tmdb-playlist-init.log 2>&1 || true
exec apache2-foreground
