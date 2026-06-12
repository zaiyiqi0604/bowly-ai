#!/bin/sh
set -eu

printf '%s' "$CERTBOT_VALIDATION" > /work/cleanup-validation.txt
