#!/usr/bin/env node
/**
 * guard-tests.mjs — 受保護路徑守門員（三層防線共用同一份規則）
 *
 *   ① Agent 層（PreToolUse Hook）： node .claude/hooks/guard-tests.mjs
 *   ② 提交層（Git pre-commit）：    node .claude/hooks/guard-tests.mjs --staged
 *   ③ CI 層（檢查 PR 範圍）：       node .claude/hooks/guard-tests.mjs --range origin/main...HEAD
 *
 * 角色由 SDV_ROLE 決定（spec | reviewer | qa | dev）。
 *   - Hook 模式未設定角色 → 一律視為 dev（Fail-Closed）
 *   - --staged 模式未設定角色 → 在 Claude Code 內（CLAUDECODE=1）視為 dev，否則視為人類並放行
 * 每次攔截都會寫入 evidence/guard-events.jsonl，供統計與社群素材使用。
 */
import { appendFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const args = process.argv.slice(2);
const MODE = args.includes('--staged') ? 'staged' : args.includes('--range') ? 'range' : 'hook';

// 治理檔：任何 Agent 都不可修改，只能由人類透過 PR 審核變更
const GOVERNANCE = [
  [/^semgrep\//i, 'semgrep/ 反作弊規則'],
  [/^\.github\//i, '.github/ CI 與 CODEOWNERS'],
  [/^\.claude\//i, '.claude/ 角色與 Hook 設定'],
  [/^\.githooks\//i, '.githooks/ Git Hook'],
  [/^CLAUDE\.md$/i, 'CLAUDE.md 專案憲法'],
  [/^quality-gates\.yml$/i, 'quality-gates.yml 品質門檻'],
  [/^tests\.lock\.json$/i, 'tests.lock.json 測試指紋'],
  [/^scripts\/test-lock\.mjs$/i, 'test-lock 驗證腳本'],
  [/^evidence\/guard-events\.jsonl$/i, '攔截事件紀錄'],
  [/(^|\/)stryker-config\.json$/i, 'Stryker 突變測試設定'],
  [/\.runsettings$/i, '.NET 測試執行設定'],
  [/(^|\/)Directory\.Build\.(props|targets)$/i, '全域建置設定（警告即錯誤）'],
];

const SPECS = [/^specs\//i, 'specs/ 只有 Spec Agent 可起草，且須經人類核准'];
const TESTS = [/^tests\//i, 'tests/ 只有 QA Agent 可寫'];
const SRC = [/^src\//i, 'src/ 只有 Dev Agent 可寫（QA 僅限 NotImplemented 骨架，由 S0 強制）'];

const PROTECTED = {
  spec: [...GOVERNANCE, TESTS, SRC], // 只能寫 specs/
  reviewer: [...GOVERNANCE, SPECS, TESTS, SRC], // 唯讀；意見寫到 evidence/spec-reviews/
  qa: [...GOVERNANCE, SPECS],
  dev: [...GOVERNANCE, SPECS, TESTS],
};

const roleKey = (role) => (Object.hasOwn(PROTECTED, role) ? role : 'dev'); // 未知角色一律最嚴格

function toRel(p) {
  if (!p) return null;
  let s = String(p).replace(/^['"]|['"]$/g, '').replace(/\\/g, '/');
  if (path.isAbsolute(s) || /^[a-z]:\//i.test(s)) s = path.relative(ROOT, s).replace(/\\/g, '/');
  return s.replace(/^\.\//, '');
}

function protectedRule(p, role) {
  const rel = toRel(p);
  if (!rel || rel.startsWith('..')) return null;
  return PROTECTED[role].find(([re]) => re.test(rel))?.[1] ?? null;
}

// ── Bash / PowerShell 指令檢查（字串啟發式；權威防線在 CI）────────────────
const ALWAYS_BLOCK = [
  [/--no-verify\b/, '禁止略過 Git Hook（--no-verify）'],
  [/core\.hooksPath/i, '禁止變更 Git Hook 路徑'],
  [/\bSDV_ROLE\b/, '禁止變更或偽造角色（SDV_ROLE）'],
];
const WRITE_CMDS = /^(rm|rmdir|mv|cp|touch|truncate|chmod|chown|ln|install|dd|patch|tee|set-content|add-content|out-file|remove-item|move-item|copy-item|new-item|rename-item|clear-content)$/i;
const IN_PLACE_CMDS = /^(sed|perl)$/i; // 只有加上 -i 才會寫檔
const INLINE_CODE_CMDS = /^(python[0-9.]*|py|node|deno|bun|ruby|perl|pwsh|powershell|bash|sh)$/i;
const GIT_WRITE_SUBCMDS = /^(checkout|restore|reset|rm|mv|apply|am|stash|clean|update-index)$/;

function inspectCommand(command, role) {
  for (const [re, reason] of ALWAYS_BLOCK) {
    if (re.test(command)) return { target: command.slice(0, 120), reason };
  }
  const segments = command.split(/&&|\|\||[;|\n]/);
  for (const seg of segments) {
    // 重新導向目標：> file、>> file（略過 2>&1 之類的 fd 複製）
    for (const m of seg.matchAll(/>>?\s*([^\s&|;<>]+)/g)) {
      const rule = protectedRule(m[1], role);
      if (rule) return { target: toRel(m[1]), reason: `重新導向寫入受保護路徑（${rule}）` };
    }
    const tokens = seg.trim().split(/\s+/).filter(Boolean);
    while (tokens.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[0])) tokens.shift(); // 略過 VAR=value 前綴
    if (!tokens.length) continue;
    const cmd = path.basename(tokens[0].replace(/\\/g, '/')).replace(/\.exe$/i, '');
    const hits = tokens.slice(1).map((t) => [t, protectedRule(t, role)]).filter(([, r]) => r);
    const firstHit = hits[0];

    if (firstHit && WRITE_CMDS.test(cmd)) return { target: toRel(firstHit[0]), reason: `以 ${cmd} 修改受保護路徑` };
    if (firstHit && IN_PLACE_CMDS.test(cmd) && tokens.some((t) => /^-[a-z]*i/.test(t))) {
      return { target: toRel(firstHit[0]), reason: `以 ${cmd} -i 就地修改受保護路徑` };
    }
    if (firstHit && cmd === 'git' && GIT_WRITE_SUBCMDS.test(tokens[1] ?? '')) {
      return { target: toRel(firstHit[0]), reason: `以 git ${tokens[1]} 變更受保護路徑` };
    }
    if (INLINE_CODE_CMDS.test(cmd) && tokens.some((t) => /^-(c|e|command)$/i.test(t))) {
      const mention = (seg.match(/[\w.\-/\\]+/g) ?? []).find((t) => protectedRule(t, role));
      if (mention) return { target: toRel(mention), reason: `以內嵌程式碼（${cmd}）存取受保護路徑` };
    }
  }
  return null;
}

// ── 紀錄與攔截 ────────────────────────────────────────────────────────────
function record(event) {
  try {
    mkdirSync(path.join(ROOT, 'evidence'), { recursive: true });
    appendFileSync(
      path.join(ROOT, 'evidence', 'guard-events.jsonl'),
      JSON.stringify({ ts: new Date().toISOString(), ...event }) + '\n',
    );
  } catch {
    // 紀錄失敗不影響攔截
  }
}

function block({ layer, role, tool, target, reason, session, exitCode }) {
  record({ layer, role, tool, target, reason, session });
  const rule = '━'.repeat(56);
  process.stderr.write(
    [
      '',
      rule,
      `🔒 TEST-LOCK · ${layer}已攔截`,
      rule,
      `   role   : ${role}`,
      `   tool   : ${tool}`,
      `   target : ${target}`,
      `   reason : ${reason}`,
      '',
      '   測試是規格的化身，不能為了通過而修改。',
      '   → 請修改 src/ 中的實作。',
      '   → 若確信測試有誤：在 evidence/test-disputes/ 寫下異議後停止。',
      rule,
      '',
    ].join('\n'),
  );
  process.exit(exitCode);
}

// ── 模式：Git 變更檢查（--staged / --range）──────────────────────────────
if (MODE !== 'hook') {
  const rawRole = process.env.SDV_ROLE || (MODE === 'staged' && process.env.CLAUDECODE !== '1' ? 'human' : 'dev');
  if (rawRole === 'human') process.exit(0);
  const role = roleKey(rawRole);
  const gitArgs =
    MODE === 'staged'
      ? ['diff', '--cached', '--name-only', '--diff-filter=ACDMR']
      : ['diff', '--name-only', '--diff-filter=ACDMR', args[args.indexOf('--range') + 1]];
  const files = execFileSync('git', gitArgs, { encoding: 'utf8' }).split('\n').filter(Boolean);
  const blocked = files.filter((f) => protectedRule(f, role));
  if (blocked.length) {
    block({
      layer: MODE === 'staged' ? '② 提交層' : '③ CI 層',
      role,
      tool: 'git',
      target: blocked.join(', '),
      reason: '變更包含受保護路徑',
      exitCode: 1,
    });
  }
  process.exit(0);
}

// ── 模式：Claude Code PreToolUse Hook ────────────────────────────────────
let raw = '';
for await (const chunk of process.stdin) raw += chunk;

let input;
try {
  input = JSON.parse(raw);
} catch {
  block({ layer: '① Agent 層', role: 'unknown', tool: 'unknown', target: '-', reason: '無法解析 Hook 輸入（Fail-Closed）', exitCode: 2 });
}

const role = roleKey(process.env.SDV_ROLE || 'dev');
const tool = input.tool_name;
const ti = input.tool_input ?? {};
const base = { layer: '① Agent 層', role, tool, session: input.session_id, exitCode: 2 };

if (['Edit', 'Write', 'MultiEdit', 'NotebookEdit'].includes(tool)) {
  const file = ti.file_path ?? ti.notebook_path;
  const rule = protectedRule(file, role);
  if (rule) block({ ...base, target: toRel(file), reason: rule });
} else if (tool === 'Bash' || tool === 'PowerShell') {
  const finding = inspectCommand(String(ti.command ?? ''), role);
  if (finding) block({ ...base, ...finding });
}

process.exit(0);
