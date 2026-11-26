FROM php:8.3-apache-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
      git ca-certificates libcurl4-openssl-dev libonig-dev \
  && docker-php-ext-install curl mbstring \
  && a2enmod rewrite headers \
  && rm -rf /var/lib/apt/lists/*

# Pinned, noncommercial upstream (no third-party binaries or browser tools).
ARG UPSTREAM_COMMIT=c2e6065cf45418e302405e827192db3a8ba984c1
RUN git clone --depth 1 --filter=blob:none --sparse \
      https://github.com/gogetta69/TMDB-To-VOD-Playlist.git /tmp/upstream \
  && git -C /tmp/upstream sparse-checkout set --no-cone \
      '/*.php' '/.htaccess' '/LICENSE.md' '/README.md' '/channels/*' '/libs/*' \
  && git -C /tmp/upstream fetch --depth 1 origin "$UPSTREAM_COMMIT" \
  && git -C /tmp/upstream checkout --detach "$UPSTREAM_COMMIT" \
  && cd /tmp/upstream && tar --exclude='.git' -cf - . | tar -C /var/www/html -xf - \
  && rm -rf /tmp/upstream

RUN printf '%s\n' \
      '<Directory /var/www/html>' \
      '    Options -Indexes' \
      '    AllowOverride All' \
      '    Require all granted' \
      '</Directory>' \
      'SetEnvIf X-Forwarded-Proto "^https$" HTTPS=on' \
      > /etc/apache2/conf-available/kizano.conf \
  && a2enconf kizano

COPY .htaccess /var/www/html/.htaccess
COPY generate_live_playlist.php /var/www/html/generate_live_playlist.php
COPY health.php /var/www/html/health.php
COPY index.php /var/www/html/index.php
COPY auth.php /opt/tmdb-lab/auth.php
COPY start.sh /opt/tmdb-lab/start.sh

RUN echo 'auto_prepend_file=/opt/tmdb-lab/auth.php' > /usr/local/etc/php/conf.d/99-kizano-auth.ini \
 && chown -R www-data:www-data /var/www/html \
 && chmod 755 /opt/tmdb-lab/start.sh

ENV PORT=10000
EXPOSE 10000
CMD ["/bin/sh", "/opt/tmdb-lab/start.sh"]
