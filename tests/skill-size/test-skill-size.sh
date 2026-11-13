#!/usr/bin/env bash
# 20000 UTF-8 字节是保守打包预算，并非所有 harness 的字符截断阈值。
set -euo pipefail
ROOT="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
if [ ! -d "$ROOT/skills" ]; then echo "FAIL: missing skills directory"; exit 1; fi
failed=0
count=0
while IFS= read -r -d '' file; do
  count=$((count + 1))
  bytes=$(wc -c < "$file")
  if [ "$bytes" -ge 20000 ]; then
    printf 'FAIL: %s has %s bytes (must be < 20000)\n' "$file" "$bytes"
    failed=1
  fi
done < <(find "$ROOT/skills" -name SKILL.md -type f -print0)
if [ "$count" -eq 0 ]; then echo 'FAIL: no SKILL.md found'; exit 1; fi
if [ "$failed" -ne 0 ]; then exit 1; fi
printf 'PASS: %s skill files below 20000 UTF-8 bytes\n' "$count"
