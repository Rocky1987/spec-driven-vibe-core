#!/usr/bin/env node
/**
 * test-lock.mjs — 測試指紋鎖（防線 ③ CI 層）
 *
 *   node scripts/test-lock.mjs generate   # Test Reviewer 簽核後執行，產生 tests.lock.json
 *   node scripts/test-lock.mjs verify     # CI S2 Guard Gate 執行，任何不符即失敗
 *
 * 指紋以 SHA-256 計算，文字檔先將 CRLF 正規化為 LF，
 * 避免 Windows（autocrlf）與 Linux CI 之間出現假性不符。
 */
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const ROOT = process.cwd();
const LOCK_FILE = path.join(ROOT, 'tests.lock.json');
const LOCKED_DIRS = ['tests'];

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return ['bin', 'obj', 'node_modules'].includes(entry.name) ? [] : walk(full);
    return [path.relative(ROOT, full).replace(/\\/g, '/')];
  });
}

function fingerprint(file) {
  const buf = readFileSync(path.join(ROOT, file));
  const content = buf.includes(0) ? buf : Buffer.from(buf.toString('utf8').replace(/\r\n/g, '\n'));
  return createHash('sha256').update(content).digest('hex');
}

function snapshot() {
  const files = LOCKED_DIRS.flatMap((d) => walk(path.join(ROOT, d))).sort();
  return Object.fromEntries(files.map((f) => [f, fingerprint(f)]));
}

const rootHash = (files) =>
  createHash('sha256')
    .update(Object.entries(files).map(([f, h]) => `${h}  ${f}`).join('\n'))
    .digest('hex');

function git(...args) {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function generate() {
  const files = snapshot();
  const lock = {
    version: 1,
    algorithm: 'sha256 (text files LF-normalized)',
    generatedAt: new Date().toISOString(),
    generatedBy: `${git('config', 'user.name')} <${git('config', 'user.email')}>`,
    baseCommit: git('rev-parse', 'HEAD'),
    rootHash: rootHash(files),
    files,
  };
  writeFileSync(LOCK_FILE, JSON.stringify(lock, null, 2) + '\n');
  console.log(`🔒 已鎖定 ${Object.keys(files).length} 個檔案 · rootHash ${lock.rootHash.slice(0, 12)}`);
}

function verify() {
  if (!existsSync(LOCK_FILE)) {
    console.error('❌ 找不到 tests.lock.json：測試尚未經過簽核鎖定');
    process.exit(1);
  }
  const lock = JSON.parse(readFileSync(LOCK_FILE, 'utf8'));
  const current = snapshot();
  const added = Object.keys(current).filter((f) => !(f in lock.files));
  const removed = Object.keys(lock.files).filter((f) => !(f in current));
  const changed = Object.keys(current).filter((f) => f in lock.files && lock.files[f] !== current[f]);
  const ok = !added.length && !removed.length && !changed.length;

  const rows = [
    ...changed.map((f) => `| ✏️ changed | \`${f}\` |`),
    ...added.map((f) => `| ➕ added | \`${f}\` |`),
    ...removed.map((f) => `| ➖ removed | \`${f}\` |`),
  ];
  const summary = ok
    ? `✅ Test lock verified · ${Object.keys(current).length} files · rootHash \`${rootHash(current).slice(0, 12)}\``
    : ['❌ Test lock mismatch', '', '| Change | File |', '|---|---|', ...rows].join('\n');

  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### 🛡️ Test Lock\n\n${summary}\n\n`);
  process.exit(ok ? 0 : 1);
}

const command = process.argv[2];
if (command === 'generate') generate();
else if (command === 'verify') verify();
else {
  console.error('用法：node scripts/test-lock.mjs <generate|verify>');
  process.exit(2);
}
