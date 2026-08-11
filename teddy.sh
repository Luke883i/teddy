#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEDDY_HOME="${TEDDY_HOME:-$HOME/.teddy}"
PORT="${TEDDY_PORT:-8787}"
OPEN_BROWSER=1
DOCTOR=0
for arg in "$@"; do
  case "$arg" in
    --no-open) OPEN_BROWSER=0 ;;
    --doctor) DOCTOR=1 ;;
    --port=*) PORT="${arg#*=}" ;;
    --help|-h) echo "Usage: ./teddy.sh [--no-open] [--doctor] [--port=8787]"; exit 0 ;;
    *) echo "Unknown option: $arg" >&2; exit 2 ;;
  esac
done
[[ "$PORT" =~ ^[0-9]+$ ]] && (( PORT >= 1 && PORT <= 65535 )) || { echo "Invalid port: $PORT" >&2; exit 2; }
umask 077
mkdir -p "$TEDDY_HOME"
NODE_BIN="$(command -v node || true)"
need_bootstrap=1
if [[ -n "$NODE_BIN" ]]; then major="$($NODE_BIN -p 'process.versions.node.split(".")[0]')"; if [[ "$major" -ge 24 ]]; then need_bootstrap=0; fi; fi
if [[ "$need_bootstrap" -eq 1 ]]; then
  VERSION="24.19.0"; OS="$(uname -s)"; ARCH="$(uname -m)"
  case "$OS/$ARCH" in
    Linux/x86_64) platform="linux-x64"; ext="tar.xz" ;;
    Linux/aarch64|Linux/arm64) platform="linux-arm64"; ext="tar.xz" ;;
    Darwin/x86_64) platform="darwin-x64"; ext="tar.gz" ;;
    Darwin/arm64) platform="darwin-arm64"; ext="tar.gz" ;;
    *) echo "Teddy requires Node.js 24+ on this platform." >&2; exit 1 ;;
  esac
  runtime="$TEDDY_HOME/runtime/node-v$VERSION-$platform"; NODE_BIN="$runtime/bin/node"
  if [[ ! -x "$NODE_BIN" ]]; then
    command -v curl >/dev/null || { echo "curl is required to bootstrap Node.js." >&2; exit 1; }
    command -v tar >/dev/null || { echo "tar is required to bootstrap Node.js." >&2; exit 1; }
    mkdir -p "$TEDDY_HOME/runtime"; archive="$TEDDY_HOME/runtime/node-v$VERSION-$platform.$ext"; sums="$TEDDY_HOME/runtime/SHASUMS256.txt"; base="https://nodejs.org/dist/v$VERSION"; name="node-v$VERSION-$platform.$ext"
    echo "Bootstrapping Node.js $VERSION..."; curl --proto '=https' --tlsv1.2 -fsSL "$base/$name" -o "$archive"; curl --proto '=https' --tlsv1.2 -fsSL "$base/SHASUMS256.txt" -o "$sums"
    expected="$(awk -v n="$name" '$2==n {print $1}' "$sums")"; [[ -n "$expected" ]] || { echo "Node checksum entry missing." >&2; exit 1; }
    if command -v sha256sum >/dev/null; then actual="$(sha256sum "$archive" | awk '{print $1}')"; else actual="$(shasum -a 256 "$archive" | awk '{print $1}')"; fi
    [[ "$actual" == "$expected" ]] || { rm -f "$archive"; echo "Node checksum mismatch." >&2; exit 1; }
    if [[ "$ext" == "tar.xz" ]]; then tar -xJf "$archive" -C "$TEDDY_HOME/runtime"; else tar -xzf "$archive" -C "$TEDDY_HOME/runtime"; fi
    rm -f "$archive" "$sums"
  fi
fi
export TEDDY_HOME TEDDY_PORT="$PORT"
if [[ "$DOCTOR" -eq 1 ]]; then exec "$NODE_BIN" "$ROOT/server/doctor.mjs"; fi
"$NODE_BIN" "$ROOT/server/main.mjs" & PID=$!
trap 'kill "$PID" 2>/dev/null || true' EXIT INT TERM
url="http://127.0.0.1:$PORT"; ready=0
for _ in $(seq 1 100); do if command -v curl >/dev/null && curl -fsS "$url/api/health" >/dev/null 2>&1; then ready=1; break; fi; if ! kill -0 "$PID" 2>/dev/null; then break; fi; sleep 0.1; done
[[ "$ready" -eq 1 ]] || { echo "Teddy failed to become healthy." >&2; exit 1; }
if [[ "$OPEN_BROWSER" -eq 1 ]]; then if command -v xdg-open >/dev/null; then xdg-open "$url" >/dev/null 2>&1 || true; elif command -v open >/dev/null; then open "$url" >/dev/null 2>&1 || true; fi; fi
echo "Teddy: $url"; wait "$PID"
