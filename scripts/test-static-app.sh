#!/bin/sh
set -eu

fail() {
  printf '%s\n' "static deployment contract: $*" >&2
  exit 1
}

for file in \
  Dockerfile \
  compose.yml \
  ops/nginx.conf \
  scripts/runtime-entrypoint.sh \
  app/package.json \
  app/package-lock.json \
  app/index.html \
  app/public/THIRD_PARTY_NOTICES.txt
do
  [ -f "$file" ] || fail "$file is required"
done

assert_contains() {
  needle=$1
  file=$2
  grep -Fq -- "$needle" "$file" || fail "$file must contain: $needle"
}

assert_contains 'FROM node:24-alpine@sha256:' Dockerfile
assert_contains 'FROM nginx:alpine@sha256:' Dockerfile
assert_contains '/workspace/app/dist/ /usr/share/nginx/html/dukkeobi/' Dockerfile
assert_contains 'USER 10001:10001' Dockerfile
assert_contains 'mem_limit: 128m' compose.yml
assert_contains 'read_only: true' compose.yml
assert_contains 'pids_limit: 64' compose.yml
assert_contains 'http://127.0.0.1:8080/dukkeobi/healthz' compose.yml
assert_contains 'location = /dukkeobi/healthz' ops/nginx.conf
assert_contains 'location = /dukkeobi/runtime-config.js' ops/nginx.conf
assert_contains 'public, max-age=31536000, immutable' ops/nginx.conf
assert_contains 'window.DUKKEOBI_CONFIG = Object.freeze({' scripts/runtime-entrypoint.sh
assert_contains '*[!A-Za-z0-9_-]*' scripts/runtime-entrypoint.sh
assert_contains 'must contain 16 to 80 characters' scripts/runtime-entrypoint.sh
assert_contains 'src="/dukkeobi/runtime-config.js"' app/index.html
assert_contains 'BSD 2-Clause License' app/public/THIRD_PARTY_NOTICES.txt

if grep -Eq 'DUKKEOBI_DB_|cksDB|maven|tomcat|source/Dukkeobi' Dockerfile compose.yml; then
  fail 'the static runtime must not retain the legacy Java or database deployment'
fi

printf '%s\n' 'static deployment contract: ok'
