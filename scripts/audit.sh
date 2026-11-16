#!/usr/bin/env bash
# 质量审计脚本 —— 跑 4 类检查防漂移
#
# 1. 静态校验：JSON parse / SKILL.md frontmatter / symlink / hook 可执行性
# 2. Installer 功能：23 款工具装 / 卸载 / 幂等
# 3. 上游对齐：hooks 3 文件 + brainstorm scripts 3 文件 + 15 翻译 skill 结构层级
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

# 1e. shell 脚本里「变量后紧跟多字节字符」
#
# bash 解析变量名时会把紧随其后的多字节字符吞进名字里，于是 set -u 下直接报
# unbound variable 并中断脚本。本仓已踩过两次，两次都是「脚本半途崩掉、看起来
# 像没跑」。写成花括号界定即可。
#
# 注意实现：这里不能用 grep -P —— macOS 的 /usr/bin/grep 是 BSD grep，不支持 -P，
# 配上 2>/dev/null 就成了静默失效的检查（本检查第一版正是这么写的，交互 shell 里
# 用 ugrep 看着能用，进了脚本一个都匹配不到）。用 LC_ALL=C + ERE：C locale 下
# 多字节字符按单字节处理，>0x7F 的字节自然落在 [^ -~] 之外，BSD/GNU 都支持。
# 排除注释行，否则本条说明文字自己会被命中。
while IFS= read -r hit; do
  case "${hit#*:*:}" in
    \#*|" "*\#*) continue ;;   # 注释行（含缩进注释）不算
  esac
  bad "变量后紧跟多字节字符，bash 会吞进变量名（用 \${VAR} 界定）: $hit"
done < <(LC_ALL=C grep -nE '\$[A-Za-z_][A-Za-z0-9_]*[^ -~]' scripts/*.sh hooks/session-start 2>/dev/null)
ok

#==============================================================================
if [ "$QUICK" != "1" ]; then
hdr "Category 2: Installer 功能测试（23 款工具）"
#==============================================================================

declare -a TOOLS=(claude cursor codex kiro deerflow trae antigravity vscode openclaw windsurf gemini aider opencode qwen hermes claw copilot qoder codebuddy codearts cline kilocode crush zcode dsh reasonix)

# 只有用户级路径有官方出处的工具（项目级路径官方未公开，我们不猜）——
# 对它们，项目级安装**必须被明确拒绝**，而不是装到一个猜出来的目录里。
declare -a GLOBAL_ONLY=(zcode)

for tool in "${TOOLS[@]}"; do
  TMP=$(mktemp -d)
  pushd "$TMP" >/dev/null

  # 全局-only 工具：断言「拒绝 + 退出码非 0 + 项目里零写入」，然后跳过后续项目级断言
  case " ${GLOBAL_ONLY[*]} " in
    *" $tool "*)
      out=$(node "$INSTALLER" --tool "$tool" 2>&1); rc=$?
      wrote=$(find . -type f | wc -l | tr -d ' ')
      if [ "$rc" != "0" ] && echo "$out" | grep -q "不支持项目级安装" && [ "$wrote" = "0" ]; then ok; else
        bad "Installer: $tool 是全局-only，项目级应明确拒绝（退出码非 0、零写入），实际 rc=$rc 写入 $wrote 个文件"
      fi
      popd >/dev/null; rm -rf "$TMP"; continue
      ;;
  esac

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
  # Exceptions bind exact reviewed upstream/fork content, not unrestricted paths.
  if ! FORK_AUDIT_ALLOWANCES=$(node scripts/audit-fork-allowances.mjs); then
    bad "已审核 fork 差异失效：内容或声明变化，必须重新核对"
    FORK_AUDIT_ALLOWANCES='{}'
  fi
  export FORK_AUDIT_ALLOWANCES
  fork_allowance() {
    node -e 'const e = JSON.parse(process.env.FORK_AUDIT_ALLOWANCES)[process.argv[1]] || {}; const v = e[process.argv[2]]; if (v === undefined) process.exit(1); console.log(v);' "$1" "$2"
  }
  # 3a. Hooks 3 文件 + cursor manifest
  for f in hooks/session-start hooks/hooks.json hooks/run-hook.cmd hooks/hooks-cursor.json; do
    d=$(diff <(git show upstream/main:$f 2>/dev/null) "$f" 2>/dev/null | wc -l | tr -d ' ')
    if [ "$d" = "0" ] || [ "$(fork_allowance "$f" runtime)" = "true" ]; then ok; else bad "Hooks 漂移: $f ($d 行)"; fi
  done

  # 3b. Brainstorm scripts 3 文件
  for f in skills/brainstorming/scripts/server.cjs \
           skills/brainstorming/scripts/start-server.sh \
           skills/brainstorming/scripts/stop-server.sh; do
    d=$(diff <(git show upstream/main:$f 2>/dev/null) "$f" 2>/dev/null | wc -l | tr -d ' ')
    if [ "$d" = "0" ]; then ok; else bad "Brainstorm script 漂移: $(basename $f) ($d 行)"; fi
  done

  # 3b-bis. 应与上游逐字一致的运行时文件（fork 没有定制）
  # OpenCode 插件此前不在任何门禁里，停在 v5.0.7 一年多，给模型的映射表还是
  # 「Task → @mention」（#131）。脚本类文件同理：跟丢一次就是运行时 bug。
  # task-brief 有意分歧（识别「任务 N」标题），不在此列。
  for f in .opencode/plugins/superpowers.js index.js \
           skills/subagent-driven-development/scripts/sdd-workspace \
           skills/subagent-driven-development/scripts/review-package \
           skills/executing-plans/scripts/task-start \
           skills/executing-plans/scripts/task-done; do
    d=$(diff <(git show upstream/main:$f 2>/dev/null) "$f" 2>/dev/null | wc -l | tr -d ' ')
    if [ "$d" = "0" ] || [ "$(fork_allowance "$f" runtime)" = "true" ]; then ok; else bad "运行时文件漂移: $f ($d 行) —— 应与上游逐字一致: git show upstream/main:$f > $f"; fi
  done

  # 3c. 15 翻译 skill 结构层级（H1-H4 标题数）
  #
  # 必须排除 ``` 围栏内的行：shell 注释（`# 运行测试`）同样匹配 ^#{1,4} ，
  # 会被当成 markdown 标题数进去。用 grep 直接数的话，一个 skill 里多几行
  # bash 注释就能凭空造出「结构漂移」—— executing-plans 与
  # finishing-a-development-branch 两条告警此前就是这么来的假阳性。
  count_headings() {  # 读 stdin，只数围栏之外的 H1-H4
    awk '/^```/{fence = !fence; next} !fence && /^#{1,4} /{n++} END{print n+0}'
  }
  declare -a SKILLS=(brainstorming diagnosing-superpowers dispatching-parallel-agents executing-plans \
    finishing-a-development-branch receiving-code-review requesting-code-review \
    subagent-driven-development systematic-debugging test-driven-development \
    using-git-worktrees using-superpowers verification-before-completion \
    writing-plans writing-skills)

  for s in "${SKILLS[@]}"; do
    up=$(git show upstream/main:skills/$s/SKILL.md 2>/dev/null | count_headings || echo 0)
    our=$(count_headings < "skills/$s/SKILL.md" 2>/dev/null || echo 0)
    diff=$((up - our))
    abs=${diff#-}
    # 允许 3 个 header 差异（翻译造成的合并/拆分小幅波动）
    if [ "$abs" -le "3" ]; then
      ok
    else
      warn "Skill 结构漂移: ${s} (上游 H=${up}, 我们 H=${our}) -- 可能 v5.1.0 没跟，或主动扩写"
    fi
  done

  # 3c-bis. fork 增量必须显式声明
  #
  # 翻译 skill 的标题数应等于「上游标题数 + 本文件里声明的 fork 增量节数」。
  # 增量节靠正文里的一行标记声明（见下方 FORK_MARK），标记与内容同处一文件，
  # 不会各自漂移。没打标记就多出章节 = 隐性分叉，下次同步时会被误当成漏译。
  FORK_MARK='本节是 superpowers-zh 的增量内容'
  for s in "${SKILLS[@]}"; do
    up=$(git show upstream/main:skills/$s/SKILL.md 2>/dev/null | count_headings || echo 0)
    our=$(count_headings < "skills/$s/SKILL.md" 2>/dev/null || echo 0)
    # 注意：grep -c 找到 0 个时输出 "0" 但退出码为 1，写成 `|| echo 0` 会拼出
    # "0\n0"，后续整数比较直接报错、检查静默失效。用 `; true` 只吞退出码。
    declared=$(grep -c "$FORK_MARK" "skills/$s/SKILL.md" 2>/dev/null; true)
    declared=${declared:-0}
    reviewed_delta=$(fork_allowance "skills/$s/SKILL.md" headingDelta || echo 0)
    declared=$((declared + reviewed_delta))
    delta=$((our - up))
    if [ "$delta" = "$declared" ]; then
      ok
    elif [ "$delta" -gt "$declared" ]; then
      bad "未声明的 fork 增量: ${s} 比上游多 ${delta} 节，但只声明了 ${declared} 节 —— 给增量节加上「${FORK_MARK}」标记，或回归上游"
    else
      # delta < declared = 上游加了章节而我们没跟。
      # 这一支原来既不 ok 也不 bad —— 什么都不计。于是上游一发新版，PASS 总数就
      # 悄悄少一条，而「少的是哪一节」没有任何人看得见（v6.3.0 给 brainstorming
      # 加了 2 节，就是这么溜过去的）。3c 的漂移检查容忍 ≤3 节，正好把这种小幅
      # 落后一起放过 —— 两道网都漏。现在明确报出来。
      warn "落后上游: ${s} 比上游少 $((declared - delta)) 节（上游 H=${up}, 我们 H=${our}, 已声明 fork 增量 ${declared} 节）—— 上游新增内容待同步"
    fi
  done

  # 3f. skill 正文里不得出现上游的 `superpowers:` 技能前缀
  #
  # 本插件在 .claude-plugin/plugin.json 里叫 superpowers-zh，Claude Code 按
  # 「<插件名>:<技能名>」注册插件技能 —— 照抄上游的 `superpowers:xxx` 会得到
  # 「Unknown skill」（#124，插件市场用户实测）。而 npx 装进 .claude/skills/ 时是
  # 项目级技能、按**裸名**调用（安装器生成的 bootstrap 列的就是裸名）。
  # 结论：正文一律用裸技能名，两种分发模式都能解析。
  #
  # 这条门禁不能省：上游正文里全是 `superpowers:`，每次同步都会把它带回来。
  stale_prefix=$(grep -rno "superpowers:[a-z][a-z-]*" "$ROOT/skills" 2>/dev/null | grep -v "superpowers-zh:" | wc -l | tr -d ' ')
  if [ "${stale_prefix:-0}" = "0" ]; then ok; else
    bad "skill 正文里有 ${stale_prefix} 处上游前缀 superpowers: —— 插件模式下会 Unknown skill（#124）。改成裸技能名：grep -rn 'superpowers:[a-z]' skills/"
  fi


  # 3e. 正文级上游漂移：自上次同步基线以来，上游动了哪些我们镜像的文件
  #
  # 3c/3c-bis 只比标题数 —— 上游把一节正文重写 50 行、标题数不变，我们这边完全
  # 看不见。v6.3.0 给 subagent-driven-development 加了 113 行就是这么溜过去的。
  # .upstream-sync.json 记着上次同步对齐到的 commit，据此把「欠同步的量」算成数字。
  # 报 warn 不报 fail：同步是有计划的内容工作，不该卡住每一次构建。
  SYNC_FILE="$ROOT/.upstream-sync.json"
  if [ -f "$SYNC_FILE" ] && command -v node >/dev/null 2>&1; then
    base=$(node -p "require('$SYNC_FILE').commit" 2>/dev/null)
    basever=$(node -p "require('$SYNC_FILE').version" 2>/dev/null)
    if [ -n "$base" ] && git cat-file -e "$base^{commit}" 2>/dev/null; then
      drift=$(git diff --numstat "$base" upstream/main -- skills hooks 2>/dev/null \
              | awk '{a+=$1; d+=$2; n++} END {printf "%d %d %d", n+0, a+0, d+0}')
      set -- $drift; nfiles=$1; nadd=$2; ndel=$3
      if [ "${nfiles:-0}" = "0" ]; then
        ok   # 与上游完全同步
      else
        warn "欠同步: 自 ${basever} 基线以来上游改了 ${nfiles} 个镜像文件（+${nadd} / -${ndel} 行）—— 明细: git diff --stat ${base} upstream/main -- skills hooks"
      fi
    else
      warn "无法解析 .upstream-sync.json 的基线 commit（${base:-空}）—— 同步漂移检查已跳过"
    fi
  else
    warn ".upstream-sync.json 缺失 —— 无法计算与上游的正文级漂移"
  fi


  # 3g. 标识符漂移：上游正文里出现的命令参数 / 环境变量 / 文件名 / 脚本路径，译文里必须都有
  #
  # 3c 只比标题数、3e 只比基线之后的增量 —— 基线**之前**就没译对的内容两者都看不见。
  # 真实案例：visual-companion.md 的译文长期停在旧版，教人读 `$SCREEN_DIR/.server-info`，
  # 而脚本早已改写 `$STATE_DIR/server-info`、新增 `--open`；标题数一样，门禁全绿。
  # 这类标识符不会被翻译，所以「上游有、我们没有」基本就等于正文过期。
  # 有意的分歧写进 .upstream-sync.json 的 identifierAllow（{ "文件": ["标识符"] }）。
  if command -v node >/dev/null 2>&1; then
    id_drift=$(cd "$ROOT" && node -e '
      const { execSync } = require("child_process");
      const fs = require("fs");
      const pat = /(--[a-z][a-z0-9-]{2,}|\$\{?[A-Z_]{3,}\}?|[\w./-]+\.(?:sh|js|mjs|md|json|py|ts|html)\b|scripts\/[\w-]+)/g;
      let allow = {};
      try { allow = JSON.parse(fs.readFileSync(".upstream-sync.json", "utf8")).identifierAllow || {}; } catch {}
      for (const [f, e] of Object.entries(JSON.parse(process.env.FORK_AUDIT_ALLOWANCES || "{}"))) { allow[f] = [...(allow[f] || []), ...(e.identifiers || [])]; }
      const files = execSync("git ls-tree -r --name-only upstream/main skills").toString().split("\n")
        .filter(f => f.endsWith(".md") && fs.existsSync(f));
      const out = [];
      for (const f of files) {
        const norm = t => t.replace(/\\/g, "");
        const up = new Set((norm(execSync("git show upstream/main:" + f).toString()).match(pat)) || []);
        const ours = new Set((norm(fs.readFileSync(f, "utf8")).match(pat)) || []);
        const miss = [...up].filter(t => !ours.has(t) && !(allow[f] || []).includes(t));
        if (miss.length) out.push(f + " 缺 " + miss.slice(0, 5).join(" "));
      }
      console.log(out.join("\n"));
    ' 2>/dev/null)
    if [ -z "$id_drift" ]; then ok; else
      while IFS= read -r line; do
        bad "标识符漂移（译文过期）: $line —— 对照 git show upstream/main:<文件> 重译相应段落"
      done <<< "$id_drift"
    fi
  fi


  # 3d. requesting-code-review/code-reviewer.md 结构（v5.1.0 self-contained）
  up=$(git show upstream/main:skills/requesting-code-review/code-reviewer.md 2>/dev/null | count_headings || echo 0)
  our=$(count_headings < skills/requesting-code-review/code-reviewer.md)
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

# 4b. Skill 间引用完整性
#
# 原来靠 `superpowers:xxx` 前缀发现引用。#124 之后正文改用**裸技能名**（插件名是
# superpowers-zh，照抄上游前缀会 Unknown skill），前缀一去这个检查就一条也匹配不到 ——
# 25 条断言静默消失、PASS 从 170 掉到 145 而 FAIL 仍是 0。
#
# 重写时还踩了第二个坑：第一版拿「现有技能名清单」当匹配模式，于是只可能匹配到
# 存在的技能、再断言它存在 —— 同义反复，永远不会失败。现在改成先按**语法位置**
# 抽出被引用的名字（「使用 X 技能」/「必需子技能：使用 X」），再验证 X 是否存在，
# 这样引用一个不存在的技能才会被抓到。
#
# 含冒号的跳过：那是别的插件的技能（如 elements-of-style:xxx），不归我们校验。
while IFS= read -r line; do
  skill_file=$(echo "$line" | cut -d: -f1)
  refs=$(echo "$line" \
    | grep -oE '使用 `?[a-z][a-z0-9-]*`? 技能|必需子技能：\*\* 使用 `?[a-z][a-z0-9-]*`?|必需子技能：使用 `?[a-z][a-z0-9-]*`?' \
    | sed -E 's/.*使用 //; s/ 技能$//' | tr -d '`' | grep -v ':' | sort -u)
  for name in $refs; do
    if [ -d "skills/$name" ]; then ok; else
      src=$(basename $(dirname "$skill_file"))
      bad "Skill 引用断: $src 引用了不存在的 skills/$name"
    fi
  done
done < <(grep -rHn -E '使用 `?[a-z][a-z0-9-]*`? 技能|必需子技能：' skills/*/SKILL.md 2>/dev/null)

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
hdr "Category 5: 工具计数一致性"
#==============================================================================
# 文案里宣称的工具数必须与 installer 实际支持的数量一致。
#
# 口径说明：installer 的 TARGETS 是「安装目标」；Copilot CLI 与 Claude Code 共用
# .claude/skills（别名 copilot -> Claude Code），在 TARGETS 里不占独立条目，但文案
# 里作为独立产品单独计数 —— 所以「文案工具数 = TARGETS 条目数 + 1」。
#
# 加新工具时最容易漏改文案：计数散落在简繁 README、package.json、CLAUDE.md、
# site/build.mjs、3 份 plugin manifest 十几处。这一类检查专门堵这个。

TARGET_COUNT=$(sed -n '/^const TARGETS = \[/,/^\];/p' "$INSTALLER" | grep -cE "^  \{ name: '")
# 镜像的另一半例外：标了 editionOf 的条目是「某款工具的另一个发行版」（如 TRAE CN
# 之于 Trae），它只是为了承载该发行版独有的磁盘路径才单独成条，**不是一款新工具**。
# 计进去会让文案宣称的款数灌水，站点工具墙也会出现两张同名卡片。
EDITION_COUNT=$(sed -n '/^const TARGETS = \[/,/^\];/p' "$INSTALLER" | grep -cE "^  \{ name: '[^']+'.*editionOf:" || true)
TARGET_COUNT=$((TARGET_COUNT - EDITION_COUNT))
EXPECTED_TOOLS=$((TARGET_COUNT + 1))
[ "$EDITION_COUNT" -gt 0 ] && echo "  （其中 $EDITION_COUNT 条是发行版变体，不计入产品数）"
echo "  installer TARGETS = $TARGET_COUNT 个安装目标  ->  文案应宣称 $EXPECTED_TOOLS 款"

# check_count <文件> <正则> <说明>：正则匹配到的所有数字都必须等于 EXPECTED_TOOLS
check_count() {
  local file="$1" re="$2" label="$3" got n
  if [ ! -f "$file" ]; then bad "计数检查: $file 不存在"; return; fi
  got=$(grep -oE "$re" "$file" 2>/dev/null | grep -oE '[0-9]+' | sort -u)
  if [ -z "$got" ]; then
    bad "计数检查: ${file} 里没匹配到「${label}」—— 文案改动过？正则需同步更新"
    return
  fi
  for n in $got; do
    if [ "$n" != "$EXPECTED_TOOLS" ]; then
      bad "计数不一致: ${file}「${label}」= ${n}，应为 ${EXPECTED_TOOLS}"
      return
    fi
  done
  ok
}

# ── 简体 README ──
check_count README.md '等 \*\*[0-9]+ 款 AI 编程工具\*\*'        '首屏标语'
check_count README.md '\*\*[0-9]+ 款\*\*：上述'                  '对比表支持工具'
check_count README.md '\*\*\+\*\* [0-9]+ 款工具一键适配'         '一句话总结'
check_count README.md '### 🤖 支持 [0-9]+ 款主流'                 '工具表标题'
check_count README.md '等 [0-9]+ 款工具真正会干活'                 '页脚标语'
check_count README.md 'across [0-9]+ AI coding tools'            '英文简介'

# ── 繁體 README ──
check_count README.zh-Hant.md '等 \*\*[0-9]+ 款 AI 編程工具\*\*'  '首屏標語'
check_count README.zh-Hant.md '\*\*[0-9]+ 款\*\*：上述'           '對比表支援工具'
check_count README.zh-Hant.md '\*\*\+\*\* [0-9]+ 款工具一鍵適配'  '一句話總結'
check_count README.zh-Hant.md '### 🤖 支援 [0-9]+ 款主流'          '工具表標題'
check_count README.zh-Hant.md '等 [0-9]+ 款工具真正會幹活'          '頁腳標語'
check_count README.zh-Hant.md 'across [0-9]+ AI coding tools'     '英文簡介'

# ── 元数据与 manifest ──
check_count package.json                    '等 [0-9]+ 款工具'      'npm description'
check_count CLAUDE.md                       '支持 [0-9]+ 款 IDE/CLI' '贡献者指南'
check_count .claude-plugin/plugin.json      '等 [0-9]+ 款工具'      'plugin manifest'
check_count .claude-plugin/marketplace.json '等 [0-9]+ 款工具'      'marketplace manifest'
check_count .cursor-plugin/plugin.json      '等 [0-9]+ 款工具'      'cursor manifest'

# ── 官网（三语言） ──
# 官网文案的工具数由 {toolCount} = TOOLS 条目数生成（下方结构性检查卡死条目数），
# FAQ 枚举清单的条数由 build.mjs 构建期断言。这里只防有人重新手写数字。
# bookDesc 是三卷书的介绍（书中教程覆盖的工具数），不是本项目支持的工具数，排除。
site_literal=$(grep -nE "[0-9]+ (款 AI 编程工具|款 AI 編程工具|款工具通用|AI coding tools|tools'|tools: )|共 [0-9]+ 款：" site/build.mjs | grep -v 'bookDesc:' || true)
if [ -z "$site_literal" ]; then ok; else
  bad "官网文案手写了工具数，应改用 {toolCount}：$(echo "$site_literal" | head -1 | cut -c1-80)"
fi

# ── 结构性检查：README 工具表的实际行数 ──
rows=$(awk '/^### 🤖 支持 [0-9]+ 款主流/,/^> 运行 `npx/' README.md | grep -cE '^\| \[')
if [ "$rows" = "$EXPECTED_TOOLS" ]; then ok; else
  bad "README 工具表有 $rows 行，应为 $EXPECTED_TOOLS 行（漏加/多加了表格行）"
fi

# ── 结构性检查：官网工具墙 / 安装命令下拉的条目数 ──
# 计数文案对了不代表列表对了：v1.7.10 时三处文案都写着 23，而 site/build.mjs 的
# TOOLS 只有 20 条 —— 首页统计块显示「20 支持工具」、下拉里根本找不到
# Cline / Kilo Code / Crush。这条专门卡列表本身。
site_tools=$(sed -n '/^const TOOLS = \[/,/^\];/p' site/build.mjs | grep -cE "^  \{ name: '")
if [ "$site_tools" = "$EXPECTED_TOOLS" ]; then ok; else
  bad "官网 TOOLS 有 ${site_tools} 条，应为 ${EXPECTED_TOOLS} 条（site/build.mjs 漏加工具）"
fi

# ── 一致性检查：官网 FAQ 的「支持全局」清单必须与 installer 的 global 目标一致 ──
# 同理：CodeArts / Crush / Hermes / CodeBuddy 陆续拿到 --global，官网 FAQ 一直停在 7 款。
global_targets=$(sed -n '/^const TARGETS = \[/,/^\];/p' "$INSTALLER" | grep -E "^  \{ name: '" | grep 'global:' | sed -E "s/^  \{ name: '([^']+)'.*/\1/")
global_n=$(echo "$global_targets" | grep -c .)
faq_line=$(grep -n '支持全局的工具' site/build.mjs | head -1 | cut -d: -f2-)
missing=""
while IFS= read -r g; do
  case "$faq_line" in *"$g"*) ;; *) missing="$missing $g";; esac
done <<< "$global_targets"
if [ -n "$missing" ]; then
  bad "官网 FAQ 全局清单漏了：${missing}（installer 共 ${global_n} 款支持 --global）"
else
  ok
fi

# ── 自检：Category 2 测的工具数应等于宣称数（宣称了就必须测） ──
tools_tested=$(grep -oE '^declare -a TOOLS=\(.*\)' "$0" | sed -E 's/^declare -a TOOLS=\(//; s/\)$//' | wc -w | tr -d ' ')
if [ "$tools_tested" = "$EXPECTED_TOOLS" ]; then ok; else
  bad "Category 2 只测了 $tools_tested 款，但文案宣称 $EXPECTED_TOOLS 款（宣称的工具必须都有回归测试）"
fi

#==============================================================================
# 6. dot 流程图：边引用的节点必须先声明
#==============================================================================
# 为什么要卡：graphviz 遇到「边引用了未声明的节点」不报错，只会自动新建一个
# 光秃秃的框。改节点文案时漏改某条边，渲染出来就是一张多了个孤儿节点、且原
# 分支断掉的图 —— 肉眼看图才发现，代码层面一点动静都没有。
# 同步上游 v6.3.0 时改了 subagent-driven-development 的两个节点名，正是这个
# 场景，当时靠手写脚本才验出来，之后就没人再验了。
hdr "npm 发布一致性"
# v1.7.13 写了日志、改了版本号、站点也显示新版本，但从没 npm publish（也没打 tag）——
# 用户跑 `npx superpowers-zh@latest` 一直装到 1.7.12，issue 里「已支持」的功能他们拿不到。
# 发版的唯一真相源是 RELEASE-NOTES.zh.md 的最新条目（site/build.mjs 也以它为准），
# 这里核对它在 npm 上确实存在。报 warn：写完日志、还没 publish 的发版窗口里它本来就该亮。
# RELEASED_VERSION 可覆盖，仅供自测本检查。
latest_rel=${RELEASED_VERSION:-$(grep -m1 -oE '^## v[0-9]+\.[0-9]+\.[0-9]+' "$ROOT/RELEASE-NOTES.zh.md" | sed 's/^## v//')}
if command -v npm >/dev/null 2>&1 && npm_versions=$(npm view superpowers-zh versions --json 2>/dev/null); then
  if echo "$npm_versions" | grep -q "\"${latest_rel}\""; then ok; else
    warn "RELEASE-NOTES 最新版 v${latest_rel} 不在 npm 上 —— 用户 npx 装不到它。发布：npm publish，再 git tag v${latest_rel} && git push origin v${latest_rel}"
  fi
else
  warn "无法查询 npm（离线？）—— 跳过发布一致性检查"
fi

# 文档里「固定版本」示例引用的 tag 必须真实存在：v1.7.11–v1.7.13 发到了 npm 却没打 tag，
# OpenCode 文档的示例一直写着 #v1.7.13，照抄就是 npm error。
pinned_tags=$(grep -rhoE 'superpowers-zh\.git#v[0-9]+\.[0-9]+\.[0-9]+' "$ROOT/docs" "$ROOT/.opencode" "$ROOT/README.md" "$ROOT/README.zh-Hant.md" 2>/dev/null | sed 's/.*#//' | sort -u)
if [ -n "$pinned_tags" ]; then
  if remote_tags=$(git -C "$ROOT" ls-remote --tags origin 2>/dev/null); then
    for t in $pinned_tags; do
      if echo "$remote_tags" | grep -q "refs/tags/${t}$"; then ok; else
        bad "文档引用的版本 tag ${t} 在 origin 上不存在 —— 照抄固定版本的写法会安装失败（改成已存在的 tag，或补打 git tag ${t}）"
      fi
    done
  else
    warn "无法访问 origin（离线？）—— 跳过文档 tag 引用检查"
  fi
fi

hdr "dot 流程图节点/边一致性"

DOT_OUT=$(python3 - "$ROOT" <<'PYEOF'
import re, glob, os, sys
root = sys.argv[1]
problems = 0
total = 0
for f in sorted(glob.glob(os.path.join(root, 'skills', '**', '*.md'), recursive=True)):
    src = open(f, encoding='utf-8').read()
    for block in re.findall(r'```dot\n(.*?)```', src, re.S):
        total += 1
        declared, used = set(), set()
        for ln in block.split('\n'):
            if '->' in ln:
                # 边行：只取箭头部分的节点，忽略行尾 [label=...]
                for m in re.finditer(r'"([^"]+)"', ln.split('[')[0]):
                    used.add(m.group(1))
            else:
                m = re.match(r'\s*"([^"]+)"\s*\[', ln)
                if m:
                    declared.add(m.group(1))
        orphan = used - declared
        if orphan:
            problems += 1
            rel = os.path.relpath(f, root)
            print('BAD\t%s\t%s' % (rel, ', '.join(sorted(orphan))))
print('TOTAL\t%d\t%d' % (total, problems))
PYEOF
)
DOT_TOTAL=$(echo "$DOT_OUT" | awk -F'\t' '$1=="TOTAL"{print $2}')
DOT_BAD=$(echo "$DOT_OUT"   | awk -F'\t' '$1=="TOTAL"{print $3}')
if [ "${DOT_BAD:-1}" = "0" ]; then
  ok
  echo "  ✅ $DOT_TOTAL 个 dot 图，边引用的节点全部已声明"
else
  echo "$DOT_OUT" | awk -F'\t' '$1=="BAD"{print $2": 边引用了未声明的节点 -> "$3}' | while read -r l; do echo "  ❌ $l"; done
  bad "dot 图有 $DOT_BAD 处「边引用了未声明的节点」——改节点文案时漏改了边，渲染会多出孤儿节点"
fi

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
