/**
 * Superpowers plugin for OpenCode.ai
 *
 * Features:
 * 1. Injects superpowers bootstrap context via user message transform.
 * 2. Auto-registers skills directory via config hook (no symlinks needed).
 * 3. Auto-updates superpowers-zh skills on startup (non-blocking).
 */

import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const execAsync = promisify(exec);

// Simple frontmatter extraction (avoid dependency on skills-core for bootstrap)
const extractAndStripFrontmatter = (content) => {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, content };

  const frontmatterStr = match[1];
  const body = match[2];
  const frontmatter = {};

  for (const line of frontmatterStr.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '');
      frontmatter[key] = value;
    }
  }

  return { frontmatter, content: body };
};

export const SuperpowersPlugin = async ({ client, directory }) => {
  const superpowersSkillsDir = path.resolve(__dirname, '../../skills');

  // Helper to generate bootstrap content
  const getBootstrapContent = () => {
    // Try to load using-superpowers skill
    const skillPath = path.join(superpowersSkillsDir, 'using-superpowers', 'SKILL.md');
    if (!fs.existsSync(skillPath)) return null;

    const fullContent = fs.readFileSync(skillPath, 'utf8');
    const { content } = extractAndStripFrontmatter(fullContent);

    const toolMapping = `**Tool Mapping for OpenCode:**
When skills reference tools you don't have, substitute OpenCode equivalents:
- \`TodoWrite\` → \`todowrite\`
- \`Task\` tool with subagents → Use OpenCode's subagent system (@mention)
- \`Skill\` tool → OpenCode's native \`skill\` tool
- \`Read\`, \`Write\`, \`Edit\`, \`Bash\` → Your native tools

Use OpenCode's native \`skill\` tool to list and load skills.`;

    return `<EXTREMELY_IMPORTANT>
You have superpowers.

**IMPORTANT: The using-superpowers skill content is included below. It is ALREADY LOADED - you are currently following it. Do NOT use the skill tool to load "using-superpowers" again - that would be redundant.**

${content}

${toolMapping}
</EXTREMELY_IMPORTANT>`;
  };

  return {
    // Inject skills path into live config so OpenCode discovers superpowers skills
    // without requiring manual symlinks or config file edits.
    // This works because Config.get() returns a cached singleton — modifications
    // here are visible when skills are lazily discovered later.
    config: async (config) => {
      // ---- (1) Register skills path ----
      config.skills = config.skills || {};
      config.skills.paths = config.skills.paths || [];
      if (!config.skills.paths.includes(superpowersSkillsDir)) {
        config.skills.paths.push(superpowersSkillsDir);
      }

      // ---- (2) Non-blocking auto-update ----
      // Delay 2 seconds then run npx -y superpowers-zh in the background.
      // Toast only when skills actually changed or update failed.
      setTimeout(async () => {
        // Snapshot skills mtime before update
        const skillsDir = path.join(directory, '.opencode', 'skills');
        const getMtime = () => {
          try {
            const files = fs.readdirSync(skillsDir, { recursive: true });
            return Math.max(0, ...files.map(f => {
              try { return fs.statSync(path.join(skillsDir, f)).mtimeMs; } catch { return 0; }
            }));
          } catch { return 0; }
        };
        const before = getMtime();

        try {
          await execAsync('npx -y superpowers-zh > /dev/null 2>&1', {
            cwd: directory,
            timeout: 120000,
          });
          // Only toast when skills were actually updated
          if (getMtime() > before) {
            client.tui.showToast({
              body: { variant: 'success', title: 'superpowers-zh', message: '中文 Skills 更新完成', duration: 3000 },
            }).catch(() => {});
          }
        } catch {
          client.tui.showToast({
            body: { variant: 'warning', title: 'superpowers-zh 更新', message: '自动更新未成功，可手动执行 npx superpowers-zh', duration: 5000 },
          }).catch(() => {});
        }
      }, 2000);
    },

    // Inject bootstrap into the first user message of each session.
    // Using a user message instead of a system message avoids:
    //   1. Token bloat from system messages repeated every turn (#750)
    //   2. Multiple system messages breaking Qwen and other models (#894)
    'experimental.chat.messages.transform': async (_input, output) => {
      const bootstrap = getBootstrapContent();
      if (!bootstrap || !output.messages.length) return;
      const firstUser = output.messages.find(m => m.info.role === 'user');
      if (!firstUser || !firstUser.parts.length) return;
      // Only inject once
      if (firstUser.parts.some(p => p.type === 'text' && p.text.includes('EXTREMELY_IMPORTANT'))) return;
      const ref = firstUser.parts[0];
      firstUser.parts.unshift({ ...ref, type: 'text', text: bootstrap });
    }
  };
};
