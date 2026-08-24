#!/bin/sh
set -eu

view='source/Dukkeobi/webapp/WEB-INF/views/index.jsp'
styles='source/Dukkeobi/webapp/resources/css/index.css'

assert_contains() {
  needle=$1
  file=$2
  if ! grep -Fq -- "$needle" "$file"; then
    printf 'Expected %s to contain: %s\n' "$file" "$needle" >&2
    exit 1
  fi
}

assert_contains '<a class="bonifacio-return-link" href="https://bonifacio.work/">← Bonifacio</a>' "$view"
assert_contains 'min-width: 44px;' "$styles"
assert_contains 'min-height: 44px;' "$styles"
assert_contains '.bonifacio-return-link:focus-visible' "$styles"

header_line=$(grep -n -m 1 '<header class="portfolio-header">' "$view" | cut -d: -f1)
link_line=$(grep -n -m 1 'class="bonifacio-return-link"' "$view" | cut -d: -f1)
canvas_line=$(grep -n -m 1 '<main id="appCanvas">' "$view" | cut -d: -f1)
menu_line=$(grep -n -m 1 '<div id="menu"' "$view" | cut -d: -f1)
if [ "$header_line" -ge "$link_line" ] || [ "$link_line" -ge "$canvas_line" ] || [ "$canvas_line" -ge "$menu_line" ]; then
  printf 'The return link header must precede the isolated app canvas in document flow.\n' >&2
  exit 1
fi

body_rule=$(sed -n '/^body {$/,/^}$/p' "$styles")
header_rule=$(sed -n '/^\.portfolio-header {$/,/^}$/p' "$styles")
link_rule=$(sed -n '/^\.bonifacio-return-link {$/,/^}$/p' "$styles")
canvas_rule=$(sed -n '/^#appCanvas {$/,/^}$/p' "$styles")
map_rule=$(sed -n '/^#map {$/,/^}$/p' "$styles")

case "$body_rule" in
  *'display: flex;'*'flex-direction: column;'*) ;;
  *)
    printf 'The page must stack the return header and app canvas in document flow.\n' >&2
    exit 1
    ;;
esac
case "$header_rule" in
  *'flex: 0 0 var(--portfolio-header-height);'*'align-items: center;'*) ;;
  *)
    printf 'The return header must reserve its own fixed-height flex row.\n' >&2
    exit 1
    ;;
esac
case "$link_rule" in
  *'position: fixed;'*|*'position: absolute;'*)
    printf 'The return link must not overlay app controls.\n' >&2
    exit 1
    ;;
esac
case "$canvas_rule" in
  *'position: relative;'*'flex: 1 1 auto;'*'min-height: 0;'*) ;;
  *)
    printf 'The app canvas must occupy only the space below the return header.\n' >&2
    exit 1
    ;;
esac
case "$map_rule" in
  *'width: 100%;'*'height: 100%;'*) ;;
  *)
    printf 'The map must stay inside the isolated app canvas.\n' >&2
    exit 1
    ;;
esac

printf 'Bonifacio return-link contract passed.\n'
