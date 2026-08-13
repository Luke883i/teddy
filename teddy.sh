#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEDDY_HOME="${TEDDY_HOME:-$HOME/.teddy}"
PORT="${TEDDY_PORT:-8787}"
OPEN_BROWSER=1
DOCTOR=0
AUTOINSTALL="${TEDDY_RUNTIME_AUTOINSTALL:-1}"
for arg in "$@"; do
  case "$arg" in
    --no-open) OPEN_BROWSER=0 ;;
    --no-install) AUTOINSTALL=0 ;;
    --doctor) DOCTOR=1 ;;
    --port=*) PORT="${arg#*=}" ;;
    --help|-h) echo "Usage: ./teddy.sh [--no-open] [--no-install] [--doctor] [--port=8787]"; exit 0 ;;
    *) echo "Unknown option: $arg" >&2; exit 2 ;;
  esac
done
[[ "$PORT" =~ ^[0-9]+$ ]] && (( PORT >= 1 && PORT <= 65535 )) || { echo "Invalid port: $PORT" >&2; exit 2; }
umask 077
mkdir -p "$TEDDY_HOME" "$TEDDY_HOME/runtime"
chmod 700 "$TEDDY_HOME" "$TEDDY_HOME/runtime" 2>/dev/null || true
NODE_BIN="$(command -v node || true)"
need_bootstrap=1
if [[ -n "$NODE_BIN" ]]; then major="$($NODE_BIN -p 'process.versions.node.split(".")[0]' 2>/dev/null || true)"; [[ "$major" == "24" ]] && need_bootstrap=0; fi
bootstrap_tmp=""
cleanup_bootstrap(){ [[ -z "$bootstrap_tmp" ]] || rm -rf "$bootstrap_tmp"; }
trap cleanup_bootstrap EXIT
if [[ "$need_bootstrap" -eq 1 ]]; then
  VERSION="24.19.0"; OS="$(uname -s)"; ARCH="$(uname -m)"
  case "$OS/$ARCH" in
    Linux/x86_64) platform="linux-x64"; ext="tar.xz" ;;
    Linux/aarch64|Linux/arm64) platform="linux-arm64"; ext="tar.xz" ;;
    Darwin/x86_64) platform="darwin-x64"; ext="tar.gz" ;;
    Darwin/arm64) platform="darwin-arm64"; ext="tar.gz" ;;
    *) echo "Teddy requires Node.js 24.x on this platform." >&2; exit 1 ;;
  esac
  runtime="$TEDDY_HOME/runtime/node-v$VERSION-$platform"; NODE_BIN="$runtime/bin/node"
  existing_version="$([[ -x "$NODE_BIN" ]] && "$NODE_BIN" -p 'process.versions.node' 2>/dev/null || true)"
  if [[ "$existing_version" != "$VERSION" ]]; then
    command -v curl >/dev/null || { echo "curl is required to bootstrap Node.js." >&2; exit 1; }
    command -v tar >/dev/null || { echo "tar is required to bootstrap Node.js." >&2; exit 1; }
    bootstrap_tmp="$(mktemp -d "$TEDDY_HOME/runtime/.bootstrap.XXXXXX")"; archive="$bootstrap_tmp/node-v$VERSION-$platform.$ext"; sums="$bootstrap_tmp/SHASUMS256.txt"; base="https://nodejs.org/dist/v$VERSION"; name="node-v$VERSION-$platform.$ext"
    echo "Bootstrapping Node.js $VERSION..."
    curl --proto '=https' --tlsv1.2 --retry 3 --retry-delay 1 --retry-connrefused -fsSL "$base/$name" -o "$archive"
    curl --proto '=https' --tlsv1.2 --retry 3 --retry-delay 1 --retry-connrefused -fsSL "$base/SHASUMS256.txt" -o "$sums"
    expected="$(awk -v n="$name" '$2==n {print $1}' "$sums")"; [[ -n "$expected" ]] || { echo "Node checksum entry missing." >&2; exit 1; }
    if command -v sha256sum >/dev/null; then actual="$(sha256sum "$archive" | awk '{print $1}')"; elif command -v shasum >/dev/null; then actual="$(shasum -a 256 "$archive" | awk '{print $1}')"; else echo "A SHA-256 tool is required." >&2; exit 1; fi
    [[ "$actual" == "$expected" ]] || { echo "Node checksum mismatch." >&2; exit 1; }
    if [[ "$ext" == "tar.xz" ]]; then tar -xJf "$archive" -C "$bootstrap_tmp"; else tar -xzf "$archive" -C "$bootstrap_tmp"; fi
    candidate="$bootstrap_tmp/node-v$VERSION-$platform"; [[ -x "$candidate/bin/node" ]] || { echo "Bootstrapped Node binary missing." >&2; exit 1; }
    [[ "$($candidate/bin/node -p 'process.versions.node')" == "$VERSION" ]] || { echo "Bootstrapped Node version mismatch." >&2; exit 1; }
    rm -rf "$runtime"; mv "$candidate" "$runtime"; NODE_BIN="$runtime/bin/node"
  fi
fi
cleanup_bootstrap; bootstrap_tmp=""; trap - EXIT
export TEDDY_HOME TEDDY_PORT="$PORT" TEDDY_RUNTIME_AUTOINSTALL="$AUTOINSTALL"
if [[ "$DOCTOR" -eq 1 ]]; then exec "$NODE_BIN" "$ROOT/server/doctor.mjs"; fi
"$NODE_BIN" "$ROOT/server/main.mjs" & PID=$!
cleanup(){ if kill -0 "$PID" 2>/dev/null; then kill "$PID" 2>/dev/null || true; wait "$PID" 2>/dev/null || true; fi; }
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
url="http://127.0.0.1:$PORT"; live=0
for ((i=0;i<100;i++)); do
  if "$NODE_BIN" -e 'fetch(process.argv[1]).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))' "$url/api/health" >/dev/null 2>&1; then live=1; break; fi
  if ! kill -0 "$PID" 2>/dev/null; then break; fi
  sleep 0.1
done
[[ "$live" -eq 1 ]] || { echo "Teddy failed to become live." >&2; exit 1; }
if [[ "$OPEN_BROWSER" -eq 1 ]]; then if command -v xdg-open >/dev/null; then xdg-open "$url" >/dev/null 2>&1 || true; elif command -v open >/dev/null; then open "$url" >/dev/null 2>&1 || true; fi; fi
echo "Teddy server: $url"
if [[ "$AUTOINSTALL" == "1" && "${TEDDY_PROVIDER:-local}" == "local" ]]; then
  echo "Teddy prepara ASR + LLM + TTS locali; avanzamento e provenienza sono visibili nel browser."
  (
    last=""
    while kill -0 "$PID" 2>/dev/null; do
      line="$($NODE_BIN -e 'fetch(process.argv[1]).then(async r=>{const x=await r.json();console.log(`${x.availability}|${x.installPhase}|${x.ready}`)}).catch(()=>{})' "$url/api/availability" 2>/dev/null || true)"
      if [[ -n "$line" && "$line" != "$last" ]]; then echo "runtime: $line"; last="$line"; fi
      [[ "$line" == pronto\|ready\|true ]] && break
      sleep 1
    done
  ) & STATUS_PID=$!
fi
wait "$PID"; [[ -z "${STATUS_PID:-}" ]] || wait "$STATUS_PID" 2>/dev/null || true; trap - EXIT
