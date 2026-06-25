#!/usr/bin/env bash
# Run Ghidra headless on extracted MKDS arm9.bin (Docker: mkjs-ghidra or blacktop/ghidra:11).
#
# Usage:
#   ./scripts/analyze-arm9-ghidra.sh [extract-dir]
#
# Requires: test/nds-extract/out/arm9.bin (from extract-mkds-rom.sh)

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EXTRACT="${1:-$ROOT/test/nds-extract/out}"
ARM9="$EXTRACT/arm9.bin"
PROJECT="$ROOT/test/ghidra-project"
SCRIPTS="$ROOT/scripts/ghidra"
LOG="$EXTRACT/ghidra-object-ids.log"

if [[ ! -f "$ARM9" ]]; then
	echo "Missing $ARM9 — run ./scripts/extract-mkds-rom.sh first" >&2
	exit 1
fi

mkdir -p "$PROJECT" "$SCRIPTS"

IMAGE="${MKJS_GHIDRA_IMAGE:-mkjs-ghidra}"
if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
	IMAGE="blacktop/ghidra:11"
fi

echo "Ghidra analysis ($IMAGE) -> $LOG"
docker run --rm \
	--memory 4g \
	-e MAXMEM=3G \
	-v "$EXTRACT:/work:ro" \
	-v "$PROJECT:/project" \
	-v "$SCRIPTS:/scripts:ro" \
	"$IMAGE" \
	/project mkds_arm9 \
	-import /work/arm9.bin \
	-overwrite \
	-deleteProject \
	-processor "ARM:LE:32:v5t" \
	-cspec default \
	-scriptPath /scripts \
	-postScript FindMkdsObjectIds.java \
	> "$LOG" 2>&1

echo "Done. See $LOG"
tail -40 "$LOG"
