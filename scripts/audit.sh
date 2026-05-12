#!/usr/bin/env bash
# 质量审计脚本 —— 跑 4 类检查防漂移
#
# 1. 静态校验：JSON parse / SKILL.md frontmatter / symlink / hook 可执行性
# 2. Installer 功能：17 款工具装 / 卸载 / 幂等
# 3. 上游对齐：hooks 3 文件 + brainstorm scripts 3 文件 + 14 翻译 skill 结构层级
# 4. 交叉引用：README → docs/ 链接 + skill 间引用 + bootstrap 注入路径
#
# 用法：
#   bash scripts/audit.sh                 # 跑全部，FAIL > 0 时 exit 1
#   bash scripts/audit.sh --quick         # 跳过 installer 功能测试
#   bash scripts/audit.sh --no-upstream   # 跳过上游对齐（CI 没 upstream remote 时）
#
# CI 默认在 PR + push to main 跑，发现漂移立刻拦下。

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

QUICK=0
NO_UPSTREAM=0
for arg in "$@"; do
  case "$arg" in
    --quick) QUICK=1 ;;
    --no-upstream) NO_UPSTREAM=1 ;;
  esac
done

PASS=0; FAIL=0; WARN=0
declare -a FAILURES=()
declare -a WARNINGS=()
INSTALLER="$ROOT/bin/superpowers-zh.js"

ok()   { PASS=$((PASS+1)); }
bad()  { FAIL=$((FAIL+1)); FAILURES+=("$1"); echo "  ❌ $1"; }
warn() { WARN=$((WARN+1)); WARNINGS+=("$1"); echo "  ⚠️  $1"; }
hdr()  { echo ""; echo "=== $1 ==="; }

# 确保有 upstream remote（CI 上需要 fetch）
ensure_upstream() {
  if [ "$NO_UPSTREAM" = "1" ]; then return 1; fi
  if ! git ls-remote --exit-code upstream HEAD >/dev/null 2>&1; then
    if git remote get-url upstream >/dev/null 2>&1; then
      git fetch upstream main --depth=50 --quiet 2>/dev/null || return 1
    else
      git remote add upstream https://github.com/obra/superpowers.git 2>/dev/null
      git fetch upstream main --depth=50 --quiet 2>/dev/null || return 1
    fi
  fi
  return 0
}

#==============================================================================
hdr "Category 1: 静态校验"
#==============================================================================

# 1a. JSON parse
while IFS= read -r f; do
  if node -e "JSON.parse(require('fs').readFileSync('$f','utf8'))" 2>/dev/null; then
    ok
  else
    bad "JSON parse failure: $f"
  fi
done < <(find . -name "*.json" \
            -not -path "./node_modules/*" \
            -not -path "./.git/*" \
            -not -path "./tests/*/node_modules/*")

# 1b. SKILL.md frontmatter 完整性
for f in skills/*/SKILL.md; do
  if ! head -1 "$f" | grep -q '^---$'; then
    bad "No frontmatter: $f"
    continue
  fi
  fm=$(sed -n '/^---$/,/^---$/p' "$f" | head -20)
  for field in name description; do
    if ! echo "$fm" | grep -q "^${field}:"; then
      bad "Missing frontmatter field '$field': $f"
    fi
  done
  ok
done

# 1c. Symlink 解析
while IFS= read -r l; do
  if [ -e "$l" ]; then ok; else bad "Broken symlink: $l"; fi
done < <(find . -type l -not -path "./node_modules/*" -not -path "./.git/*")

# 1d. Hook 脚本可执行权限
for f in hooks/session-start hooks/run-hook.cmd; do
  if [ -x "$f" ]; then ok; else bad "Not executable: $f"; fi
done

#==============================================================================
if [ "$QUICK" != "1" ]; then
hdr "Category 2: Installer 功能测试（17 款工具）"
#==============================================================================

declare -a TOOLS=(claude cursor codex kiro deerflow trae antigravity vscode openclaw windsurf gemini aider opencode qwen hermes claw copilot)

for tool in "${TOOLS[@]}"; do
  TMP=$(mktemp -d)
  pushd "$TMP" >/dev/null

  if ! node "$INSTALLER" --tool "$tool" >/dev/null 2>&1; then
    bad "Installer: $tool 安装失败"
    popd >/dev/null
    rm -rf "$TMP"
    continue
  fi

  # 幂等：再装一遍不应炸
  if ! node "$INSTALLER" --tool "$tool" >/dev/null 2>&1; then
    bad "Installer: $tool 二次安装失败（幂等性破坏）"
    popd >/dev/null
    rm -rf "$TMP"
    continue
  fi

  if ! node "$INSTALLER" --uninstall >/dev/null 2>&1; then
    bad "Installer: $tool 卸载失败"
  else
    ok
  fi

  popd >/dev/null
  rm -rf "$TMP"
done

else
echo ""
echo "[--quick 跳过 installer 功能测试]"
fi

#==============================================================================
hdr "Category 3: 上游对齐"
#==============================================================================

if ! ensure_upstream; then
  warn "无法访问 upstream，跳过对齐检查（CI 上请确保有网络）"
else
  # 3a. Hooks 3 文件 + cursor manifest
  for f in hooks/session-start hooks/hooks.json hooks/run-hook.cmd hooks/hooks-cursor.json; do
    d=$(diff <(git show upstream/main:$f 2>/dev/null) "$f" 2>/dev/null | wc -l | tr -d ' ')
    if [ "$d" = "0" ]; then ok; else bad "Hooks 漂移: $f ($d 行)"; fi
  done

  # 3b. Brainstorm scripts 3 文件
  for f in skills/brainstorming/scripts/server.cjs \
           skills/brainstorming/scripts/start-server.sh \
           skills/brainstorming/scripts/stop-server.sh; do
    d=$(diff <(git show upstream/main:$f 2>/dev/null) "$f" 2>/dev/null | wc -l | tr -d ' ')
    if [ "$d" = "0" ]; then ok; else bad "Brainstorm script 漂移: $(basename $f) ($d 行)"; fi
  done

  # 3c. 14 翻译 skill 结构层级（H1-H4 标题数）
  declare -a SKILLS=(brainstorming dispatching-parallel-agents executing-plans \
    finishing-a-development-branch receiving-code-review requesting-code-review \
    subagent-driven-development systematic-debugging test-driven-development \
    using-git-worktrees using-superpowers verification-before-completion \
    writing-plans writing-skills)

  for s in "${SKILLS[@]}"; do
    up=$(git show upstream/main:skills/$s/SKILL.md 2>/dev/null | grep -cE '^#{1,4} ' || echo 0)
    our=$(grep -cE '^#{1,4} ' "skills/$s/SKILL.md" 2>/dev/null || echo 0)
    diff=$((up - our))
    abs=${diff#-}
    # 允许 3 个 header 差异（翻译造成的合并/拆分小幅波动）
    if [ "$abs" -le "3" ]; then
      ok
    else
      warn "Skill 结构漂移: ${s} (上游 H=${up}, 我们 H=${our}) -- 可能 v5.1.0 没跟，或主动扩写"
    fi
  done

  # 3d. requesting-code-review/code-reviewer.md 结构（v5.1.0 self-contained）
  up=$(git show upstream/main:skills/requesting-code-review/code-reviewer.md 2>/dev/null | grep -cE '^#{1,3} ' || echo 0)
  our=$(grep -cE '^#{1,3} ' skills/requesting-code-review/code-reviewer.md)
  diff=$((up - our))
  abs=${diff#-}
  if [ "$abs" -le "2" ]; then
    ok
  else
    bad "code-reviewer.md 结构漂移 (上游 v5.1.0 self-contained, H=${up}; 我们 H=${our})"
  fi
fi

#==============================================================================
hdr "Category 4: 交叉引用完整性"
#==============================================================================

# 4a. README → docs/ 链接
BROKEN=0
while IFS= read -r link; do
  link=${link#(}; link=${link%)}
  if [ -f "$link" ]; then ok; else
    bad "README 链接断: $link"
    BROKEN=$((BROKEN+1))
  fi
done < <(grep -oE '\(docs/README\.[a-z-]+\.md\)' README.md)

# 4b. Skill 间引用（superpowers:xxx）
while IFS= read -r line; do
  skill_file=$(echo "$line" | cut -d: -f1)
  refs=$(echo "$line" | grep -oE '\bsuperpowers:[a-z-]+\b' | sort -u)
  for ref in $refs; do
    name=${ref#superpowers:}
    if [ -d "skills/$name" ]; then ok; else
      src=$(basename $(dirname "$skill_file"))
      bad "Skill 引用断: $src 引用了不存在的 skills/$name"
    fi
  done
done < <(grep -rln 'superpowers:' skills/*/SKILL.md 2>/dev/null | \
         xargs -I{} grep -H 'superpowers:' {} 2>/dev/null)

# 4c. 装完后 .claude/skills/using-superpowers/SKILL.md 路径必须存在（hook 依赖）
TMP=$(mktemp -d)
pushd "$TMP" >/dev/null
if node "$INSTALLER" --tool claude >/dev/null 2>&1; then
  if [ -f "$TMP/.claude/skills/using-superpowers/SKILL.md" ]; then
    ok
  else
    bad "装完后 .claude/skills/using-superpowers/SKILL.md 不存在（hook 会找不到）"
  fi
fi
popd >/dev/null
rm -rf "$TMP"

#==============================================================================
echo ""
echo "=========================================="
echo "📊 审计结果"
echo "=========================================="
echo "✅ PASS: $PASS"
echo "⚠️  WARN: $WARN"
echo "❌ FAIL: $FAIL"

if [ "$WARN" -gt 0 ]; then
  echo ""
  echo "Warnings（不阻塞）："
  for w in "${WARNINGS[@]}"; do echo "  ⚠️  $w"; done
fi

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "Failures（必须修）："
  for f in "${FAILURES[@]}"; do echo "  ❌ $f"; done
  echo ""
  echo "❌ Audit 失败：$FAIL 个 P0 问题。看 README 「质量审计」段了解每项含义。"
  exit 1
fi

echo ""
echo "✅ Audit 通过"
exit 0
