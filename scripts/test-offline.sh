#!/usr/bin/env bash
# Repository-only regression entry point. No real publishing or native CLI sessions.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

for tool in node npm jq pytest python3 git tar; do
  command -v "$tool" >/dev/null || { echo "Missing test dependency: $tool" >&2; exit 2; }
done
node -e 'const [major, minor] = process.versions.node.split(".").map(Number); if (major < 22 || (major === 22 && minor < 6)) { console.error("Offline development tests require Node >=22.6 for Pi TypeScript loading; package runtime still supports Node 20."); process.exit(2); }'

node --test tests/versioning/test-release-versions.mjs tests/installer/*.mjs \
  tests/native/*.mjs tests/skill-size/test-boundaries.mjs tests/brainstorm-server/project-path.test.mjs
pytest -q tests/hermes
bash tests/pi/run-tests.sh
bash tests/opencode/run-tests.sh
bash tests/hooks/test-session-start.sh
bash tests/claude-code/test-sdd-workspace.sh
bash tests/claude-code/test-executing-plans-scripts.sh
bash tests/skill-size/test-skill-size.sh
bash tests/skill-layout/test-no-dev-files-in-skills.sh
bash tests/shell-lint/test-lint-shell.sh
bash tests/antigravity/test-antigravity-tools.sh
bash tests/devin/test-devin-plugin.sh
bash tests/codex-plugin-sync/test-sync-to-codex-plugin.sh
bash scripts/verify-release.sh --offline
node scripts/sync-plugin-version.js --check
git diff --check
echo 'Offline regressions passed. This excludes network server lifecycle, native CLI acceptance, Windows execution and Codex archive tests requiring a committed snapshot.'
echo 'Any platform-specific SKIP lines above remain unverified; they are not passing acceptance results.'
