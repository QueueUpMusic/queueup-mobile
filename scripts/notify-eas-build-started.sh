#!/usr/bin/env bash
set -euo pipefail

PLATFORM="${1:?Usage: $0 <ios|android|all>}"

case "$PLATFORM" in
  ios|android|all) ;;
  *)
    echo "Invalid platform: $PLATFORM" >&2
    exit 2
    ;;
esac

curl --fail --silent --show-error \
  -X POST \
  -H "Content-Type: application/json" \
  --data "{\"project\":\"QueueUp\",\"platform\":\"${PLATFORM}\"}" \
  https://queueup-ntfy-receiver.kingdmvr.com/build-started
