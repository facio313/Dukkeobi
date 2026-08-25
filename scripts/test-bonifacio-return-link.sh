#!/bin/sh
set -eu

view='app/index.html'
styles='app/src/styles.css'

assert_contains() {
  needle=$1
  file=$2
  if ! grep -Fq -- "$needle" "$file"; then
    printf 'Expected %s to contain: %s\n' "$file" "$needle" >&2
    exit 1
  fi
}

assert_contains '<a class="bonifacio-return-link" href="https://bonifacio.work/">' "$view"
assert_contains '.bonifacio-return-link' "$styles"
assert_contains ':focus-visible' "$styles"

link_line=$(grep -n -m 1 'class="bonifacio-return-link"' "$view" | cut -d: -f1)
runtime_line=$(grep -n -m 1 'src="/dukkeobi/runtime-config.js"' "$view" | cut -d: -f1)
module_line=$(grep -n -m 1 'type="module"' "$view" | cut -d: -f1)
if [ "$link_line" -ge "$module_line" ]; then
  printf 'The Bonifacio return link must be present in the static app shell.\n' >&2
  exit 1
fi
if [ "$runtime_line" -ge "$module_line" ]; then
  printf 'runtime-config.js must load before the application module.\n' >&2
  exit 1
fi

printf 'Bonifacio return-link contract passed.\n'
