#!/usr/bin/env bash
# Extract Mario Kart DS ROM contents with ndstool (Docker) and build object-id-report.json.
#
# Usage:
#   ./scripts/extract-mkds-rom.sh [path/to/game.nds] [output-dir]
#
# Defaults:
#   ROM: test/mkds.nds
#   OUT: test/nds-extract/out

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ROM="${1:-$ROOT/test/mkds.nds}"
OUT="${2:-$ROOT/test/nds-extract/out}"

if [[ ! -f "$ROM" ]]; then
	echo "ROM not found: $ROM" >&2
	exit 1
fi

if ! docker info >/dev/null 2>&1; then
	echo "Docker unavailable, using Node extractor..." >&2
	exec node "$ROOT/scripts/extract-mkds-rom-node.mjs" "$ROM" "$OUT"
fi

if ! docker image inspect mkjs-ndstool >/dev/null 2>&1; then
	echo "Building mkjs-ndstool image..."
	docker build -f "$ROOT/Dockerfile.ndstool" -t mkjs-ndstool "$ROOT"
fi

mkdir -p "$OUT"
ROM_ABS="$(cd "$(dirname "$ROM")" && pwd)/$(basename "$ROM")"
OUT_ABS="$(mkdir -p "$OUT" && cd "$OUT" && pwd)"

echo "Extracting $ROM_ABS -> $OUT_ABS"
docker run --rm \
	-u "$(id -u):$(id -g)" \
	-v "$ROM_ABS:/rom/input.nds:ro" \
	-v "$OUT_ABS:/rom/out" \
	-w /rom/out \
	mkjs-ndstool \
	-x /rom/input.nds \
	-9 arm9.bin \
	-7 arm7.bin \
	-d data \
	-y overlay \
	-vv

echo "Analyzing object IDs..."
node "$ROOT/scripts/analyze-mkds-objects.mjs" "$OUT_ABS"

echo "Done. Report: $OUT_ABS/object-id-report.json"
echo "Optional ARM9 RE: ./scripts/analyze-arm9-ghidra.sh \"$OUT_ABS\""
