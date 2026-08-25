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
grep -Fq 'id="sheet-toggle"' "$work_dir/app.html" || fail 'responsive sheet toggle must remain in the built app'
grep -Fq 'id="active-filters"' "$work_dir/app.html" || fail 'active filter region must remain in the built app'
grep -Fq 'class="panel-intro-meta"' "$work_dir/app.html" || fail 'analysis overview must remain in the built app'
grep -Eiq '^Content-Security-Policy:' "$work_dir/app.headers" || fail 'CSP header is required'
grep -Eiq '^X-Content-Type-Options: *nosniff' "$work_dir/app.headers" || fail 'nosniff header is required'
grep -Eiq '^X-Frame-Options: *DENY' "$work_dir/app.headers" || fail 'frame denial header is required'

curl -fsS -D "$work_dir/runtime.headers" "$base/dukkeobi/runtime-config.js" -o "$work_dir/runtime.js"
grep -Eiq '^Cache-Control: *no-store' "$work_dir/runtime.headers" || fail 'runtime config must not be cached'
grep -Fq 'dataMode: "snapshot"' "$work_dir/runtime.js" || fail 'empty-key runtime must use snapshot mode'

curl -fsS "$base/dukkeobi/THIRD_PARTY_NOTICES.txt" -o "$work_dir/notices.txt"
grep -Fq 'Leaflet 1.9.4 — BSD 2-Clause License' "$work_dir/notices.txt" || fail 'Leaflet runtime notice is required'
grep -Fq 'Pretendard 1.3.9 — SIL Open Font License 1.1' "$work_dir/notices.txt" || fail 'Pretendard runtime notice is required'
grep -Fq 'SIL OPEN FONT LICENSE Version 1.1' "$work_dir/notices.txt" || fail 'Pretendard OFL text is required'

css_asset=$(sed -n 's/.*href="\([^"?]*\/assets\/[^"?]*\.css\)".*/\1/p' "$work_dir/app.html" | head -n 1)
[ -n "$css_asset" ] || fail 'fingerprinted CSS asset was not found'
curl -fsS -D "$work_dir/css.headers" "$base$css_asset" -o "$work_dir/app.css"
grep -Eiq '^Cache-Control: *public, *max-age=31536000, *immutable' "$work_dir/css.headers" || fail 'fingerprinted CSS needs immutable caching'
grep -Fq 'Pretendard' "$work_dir/app.css" || fail 'Pretendard font faces must remain in the CSS bundle'
grep -Fq '.sheet-handle' "$work_dir/app.css" || fail 'responsive sheet styles must remain in the CSS bundle'
grep -Fq '.active-filters' "$work_dir/app.css" || fail 'active filter styles must remain in the CSS bundle'
grep -Fq '.control-panel[data-sheet-state=open]' "$work_dir/app.css" || fail 'open sheet state must remain in the CSS bundle'
grep -Fq '@media (max-width:599px)' "$work_dir/app.css" || fail 'phone breakpoint must remain in the CSS bundle'
grep -Fq '@media (min-width:600px) and (max-width:899px)' "$work_dir/app.css" || fail 'tablet portrait breakpoint must remain in the CSS bundle'
grep -Fq '@media (min-width:900px) and (max-width:1199px)' "$work_dir/app.css" || fail 'tablet landscape breakpoint must remain in the CSS bundle'

font_asset=$(grep -Eo "/dukkeobi/assets/[^)\"']+\\.woff2" "$work_dir/app.css" | head -n 1)
[ -n "$font_asset" ] || fail 'fingerprinted Pretendard WOFF2 asset was not found'
curl -fsS -D "$work_dir/font.headers" "$base$font_asset" -o "$work_dir/font.woff2"
[ -s "$work_dir/font.woff2" ] || fail 'Pretendard WOFF2 asset is empty'
grep -Eiq '^Content-Type: *font/woff2' "$work_dir/font.headers" || fail 'Pretendard asset must use the WOFF2 content type'
grep -Eiq '^Cache-Control: *public, *max-age=31536000, *immutable' "$work_dir/font.headers" || fail 'fingerprinted font needs immutable caching'

js_asset=$(sed -n 's/.*src="\([^"?]*\/assets\/[^"?]*\.js\)".*/\1/p' "$work_dir/app.html" | head -n 1)
[ -n "$js_asset" ] || fail 'fingerprinted JavaScript asset was not found'
curl -fsS -D "$work_dir/js.headers" "$base$js_asset" -o "$work_dir/app.js"
grep -Eiq '^Cache-Control: *public, *max-age=31536000, *immutable' "$work_dir/js.headers" || fail 'fingerprinted JavaScript needs immutable caching'
grep -Fq '#sheet-toggle' "$work_dir/app.js" || fail 'sheet interaction hook must remain in the JavaScript bundle'
grep -Fq '#active-filters' "$work_dir/app.js" || fail 'active filter hook must remain in the JavaScript bundle'
grep -Fq -- '--range-progress' "$work_dir/app.js" || fail 'range feedback hook must remain in the JavaScript bundle'

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
