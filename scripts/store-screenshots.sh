#!/usr/bin/env bash
#
# App Store screenshots from the simulator, one command.
#
# Boots the two simulators Apple's required sizes come from, gives them
# the 9:41 status bar every store screenshot has, deep-links the
# installed app to each screen and captures it. Needs a Release build
# already installed on each simulator:
#
#   npx expo run:ios --configuration Release --device "iPhone 17 Pro Max"
#   npx expo run:ios --configuration Release --device "iPad Pro 13-inch (M4)"
#
# and a library worth photographing (save six or so games, set a pace on
# The Plan) — the script cannot seed one, and an empty Plan is not a
# screenshot. Output: docs/app-store/screenshots/<device>/<n>-<screen>.png
#
# The scheme is the production one because APP_VARIANT is unset in a
# local run:ios (see app.config.js). A dev-client build answers to
# sidequest-dev:// instead and will not respond here.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/docs/app-store/screenshots"
SCHEME="${SCHEME:-sidequest}"
BUNDLE="${BUNDLE:-com.glstudio.sidequest}"

# Apple's slots: 6.9" iPhone (1320×2868) and 13" iPad (2064×2752).
DEVICES=(
  "iPhone 17 Pro Max"
  "iPad Pro 13-inch (M4)"
)

# In upload order. The widget shot is taken by hand from the Home Screen.
SCREENS=(
  "tonight:/"
  "plan:/plan"
  "library:/library"
  "game:/game/3498"
  "memcard:/memcard"
  "you:/you"
)

for device in "${DEVICES[@]}"; do
  udid="$(xcrun simctl list devices available -j \
    | python3 -c "import json,sys; d=json.load(sys.stdin)['devices']; print(next(x['udid'] for v in d.values() for x in v if x['name']=='$device'))")"
  slug="$(echo "$device" | tr -c 'A-Za-z0-9\n' '-' | tr -s '-' | sed 's/-$//')"
  mkdir -p "$OUT/$slug"

  echo "▶ $device ($udid)"
  xcrun simctl boot "$udid" 2>/dev/null || true
  xcrun simctl bootstatus "$udid" -b
  open -a Simulator --args -CurrentDeviceUDID "$udid"

  xcrun simctl status_bar "$udid" override \
    --time "9:41" --dataNetwork wifi --wifiMode active --wifiBars 3 \
    --cellularMode active --cellularBars 4 --batteryState charged --batteryLevel 100

  if ! xcrun simctl get_app_container "$udid" "$BUNDLE" >/dev/null 2>&1; then
    echo "  ✗ $BUNDLE is not installed on this simulator — run expo run:ios first" >&2
    continue
  fi

  xcrun simctl launch "$udid" "$BUNDLE" >/dev/null
  sleep 4

  n=1
  for entry in "${SCREENS[@]}"; do
    name="${entry%%:*}"; path="${entry#*:}"
    xcrun simctl openurl "$udid" "${SCHEME}://${path#/}"
    sleep 3
    file="$OUT/$slug/$(printf '%02d' "$n")-$name.png"
    xcrun simctl io "$udid" screenshot "$file" >/dev/null
    echo "  ✓ $file"
    n=$((n + 1))
  done

  xcrun simctl status_bar "$udid" clear
done

echo
echo "Now the widget: add a Sidequest widget to the Home Screen on the iPhone and run"
echo "  xcrun simctl io booted screenshot \"$OUT/iPhone-17-Pro-Max/00-widget.png\""
