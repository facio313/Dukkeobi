#!/bin/sh
set -eu

image=${1:-dukkeobi:contract-test}
container="dukkeobi-contract-$$"
work_dir=$(mktemp -d)

cleanup() {
  docker rm -f "$container" >/dev/null 2>&1 || true
  rm -rf "$work_dir"
}
trap cleanup EXIT HUP INT TERM

fail() {
  printf '%s\n' "container contract: $*" >&2
  exit 1
}

docker run -d \
  --name "$container" \
  --init \
  --read-only \
  --tmpfs /tmp:size=16m,mode=1777,noexec,nosuid,nodev \
  --memory 128m \
  --pids-limit 64 \
  --security-opt no-new-privileges \
  --cap-drop ALL \
  --health-cmd 'wget -q -T 3 -O /dev/null http://127.0.0.1:8080/dukkeobi/healthz' \
  --health-interval 1s \
  --health-timeout 3s \
  --health-retries 15 \
  -e PORTFOLIO_BRANCH=main \
  -e PORTFOLIO_AUTH_MODE=sso \
  -p 127.0.0.1::8080 \
  "$image" >/dev/null

attempt=0
while [ "$attempt" -lt 20 ]; do
  status=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$container")
  [ "$status" = healthy ] && break
  [ "$status" = unhealthy ] && fail 'health check became unhealthy'
  attempt=$((attempt + 1))
  sleep 1
done
[ "${status:-none}" = healthy ] || fail 'health check did not become ready'

port=$(docker port "$container" 8080/tcp | sed -n '1s/.*://p')
case "$port" in
  ''|*[!0-9]*) fail 'published port could not be resolved' ;;
esac
base="http://127.0.0.1:$port"

curl -fsS -D "$work_dir/health.headers" "$base/dukkeobi/healthz" -o "$work_dir/health.body"
[ "$(cat "$work_dir/health.body")" = ok ] || fail 'health body is not the static ok response'
grep -Eiq '^Cache-Control: *no-store' "$work_dir/health.headers" || fail 'health response must not be cached'

curl -sS -D "$work_dir/root.headers" "$base/" -o /dev/null
grep -Eq '^HTTP/[^ ]+ 308' "$work_dir/root.headers" || fail 'root must return 308'
grep -Eiq '^Location: */dukkeobi/' "$work_dir/root.headers" || fail 'root redirect must stay relative'

curl -fsS -D "$work_dir/app.headers" "$base/dukkeobi/deep/link" -o "$work_dir/app.html"
grep -Fq '<title>두꺼비' "$work_dir/app.html" || fail 'deep link must fall back to the SPA'
grep -Fq 'src="/dukkeobi/runtime-config.js"' "$work_dir/app.html" || fail 'deep links must load the canonical runtime config'
grep -Eiq '^Content-Security-Policy:' "$work_dir/app.headers" || fail 'CSP header is required'
grep -Eiq '^X-Content-Type-Options: *nosniff' "$work_dir/app.headers" || fail 'nosniff header is required'
grep -Eiq '^X-Frame-Options: *DENY' "$work_dir/app.headers" || fail 'frame denial header is required'

curl -fsS -D "$work_dir/runtime.headers" "$base/dukkeobi/runtime-config.js" -o "$work_dir/runtime.js"
grep -Eiq '^Cache-Control: *no-store' "$work_dir/runtime.headers" || fail 'runtime config must not be cached'
grep -Fq 'dataMode: "snapshot"' "$work_dir/runtime.js" || fail 'empty-key runtime must use snapshot mode'

curl -fsS "$base/dukkeobi/THIRD_PARTY_NOTICES.txt" -o "$work_dir/notices.txt"
grep -Fq 'Leaflet 1.9.4 — BSD 2-Clause License' "$work_dir/notices.txt" || fail 'Leaflet runtime notice is required'

asset=$(sed -n 's/.*href="\([^"?]*\/assets\/[^"?]*\.css\)".*/\1/p' "$work_dir/app.html" | head -n 1)
[ -n "$asset" ] || fail 'fingerprinted CSS asset was not found'
curl -fsS -D "$work_dir/asset.headers" "$base$asset" -o /dev/null
grep -Eiq '^Cache-Control: *public, *max-age=31536000, *immutable' "$work_dir/asset.headers" || fail 'fingerprinted assets need immutable caching'

[ "$(docker exec "$container" id -u)" = 10001 ] || fail 'runtime must not run as root'
[ "$(docker inspect --format '{{.HostConfig.Memory}}' "$container")" = 134217728 ] || fail '128 MiB hard memory limit is required'
[ "$(docker inspect --format '{{.HostConfig.PidsLimit}}' "$container")" = 64 ] || fail 'PID limit is required'
[ "$(docker inspect --format '{{.HostConfig.ReadonlyRootfs}}' "$container")" = true ] || fail 'read-only root filesystem is required'

docker run --rm \
  --read-only \
  --tmpfs /tmp:size=16m,mode=1777,noexec,nosuid,nodev \
  -e PORTFOLIO_BRANCH=main \
  -e PORTFOLIO_AUTH_MODE=sso \
  -e DUKKEOBI_KAKAO_JS_KEY=abcdefghijklmnop \
  "$image" sh -c 'grep -Fq '\''dataMode: "snapshot+kakao"'\'' /tmp/runtime-config.js' \
  || fail 'valid Kakao key must enable snapshot+kakao mode'

if docker run --rm \
  --read-only \
  --tmpfs /tmp:size=16m,mode=1777,noexec,nosuid,nodev \
  -e PORTFOLIO_BRANCH=main \
  -e PORTFOLIO_AUTH_MODE=sso \
  -e DUKKEOBI_KAKAO_JS_KEY=short \
  "$image" true >/dev/null 2>&1; then
  fail 'invalid Kakao key length was accepted'
fi

printf '%s\n' 'container contract: ok'
