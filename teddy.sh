#!/usr/bin/env bash
# Deprecated compatibility shim. The supported lifecycle is npm start.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"
echo "DEPRECATED: teddy.sh now forwards to npm run start:local. Use npm start or npm run start:local." >&2
if ! command -v npm >/dev/null 2>&1; then
  echo "Teddy requires Node.js 24.x and npm. Install Node 24, then run npm start." >&2
  exit 127
fi
exec npm run start:local -- "$@"
