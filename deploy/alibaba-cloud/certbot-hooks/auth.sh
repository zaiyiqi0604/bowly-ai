#!/bin/sh
set -eu

printf '%s' "$CERTBOT_VALIDATION" > /work/validation.txt
printf '%s' "_acme-challenge.$CERTBOT_DOMAIN" > /work/record-name.txt

while [ ! -f /work/continue ]; do
  sleep 2
done
