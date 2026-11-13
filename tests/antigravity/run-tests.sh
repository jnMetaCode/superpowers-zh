#!/usr/bin/env bash
# Run all Antigravity (agy) integration tests.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== Antigravity manifest and tool-mapping checks ==="

for t in "$SCRIPT_DIR"/test-*.sh; do
  echo
  echo ">>> $t"
  bash "$t"
done

echo
echo "=== Non-skipped Antigravity checks passed; SKIP lines remain unverified ==="
echo "Native session acceptance is not covered by this suite."
