#!/bin/sh
set -eu

fail() {
  printf '%s\n' "dukkeobi runtime: $*" >&2
  exit 1
}

/usr/local/bin/portfolio-auth-mode check

kakao_js_key=${DUKKEOBI_KAKAO_JS_KEY:-}
case "$kakao_js_key" in
  *[!A-Za-z0-9_-]*)
    fail 'DUKKEOBI_KAKAO_JS_KEY contains unsupported characters'
    ;;
esac
if [ -n "$kakao_js_key" ]; then
  kakao_key_length=${#kakao_js_key}
  if [ "$kakao_key_length" -lt 16 ] || [ "$kakao_key_length" -gt 80 ]; then
    fail 'DUKKEOBI_KAKAO_JS_KEY must contain 16 to 80 characters'
  fi
fi

if [ -n "$kakao_js_key" ]; then
  data_mode='snapshot+kakao'
else
  data_mode='snapshot'
fi

build=${PORTFOLIO_BUILD:-${PORTFOLIO_BRANCH:-unknown}}
case "$build" in
  *[!A-Za-z0-9._/-]*)
    fail 'PORTFOLIO_BUILD contains unsupported characters'
    ;;
esac

umask 077
mkdir -p \
  /tmp/nginx/client_temp \
  /tmp/nginx/proxy_temp \
  /tmp/nginx/fastcgi_temp \
  /tmp/nginx/uwsgi_temp \
  /tmp/nginx/scgi_temp

runtime_config=/tmp/runtime-config.js
runtime_config_tmp=${runtime_config}.tmp.$$
cleanup() {
  rm -f "$runtime_config_tmp"
}
trap cleanup EXIT HUP INT TERM

{
  printf '%s\n' 'window.DUKKEOBI_CONFIG = Object.freeze({'
  printf '  kakaoJsKey: "%s",\n' "$kakao_js_key"
  printf '  build: "%s",\n' "$build"
  printf '  dataMode: "%s"\n' "$data_mode"
  printf '%s\n' '});'
} > "$runtime_config_tmp"

chmod 0444 "$runtime_config_tmp"
mv -f "$runtime_config_tmp" "$runtime_config"
trap - EXIT HUP INT TERM

[ "$#" -gt 0 ] || fail 'no runtime command was provided'
exec "$@"
