#!/usr/bin/env node
/**
 * verify-all.mjs — 本機與容器共用的閘門驗證入口（與 CI 同一組指令）
 *
 *   node scripts/verify-all.mjs
 *
 * 前置條件尚未具備的步驟（Phase 1 才有的檔案、未安裝的工具）會標示 SKIP，不算失敗。
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const has = (cmd) => spawnSync(cmd, ['--version'], { shell: true, stdio: 'ignore' }).status === 0;

const steps = [
  { gate: 'S1', name: 'format', cmd: 'dotnet format --verify-no-changes' },
  { gate: 'S1', name: 'build', cmd: 'dotnet build -warnaserror' },
  { gate: 'S1', name: 'test', cmd: 'dotnet test --no-build' },
  { gate: 'S2', name: 'test lock', cmd: 'node scripts/test-lock.mjs verify', when: existsSync('tests.lock.json'), why: '尚無 tests.lock.json' },
  { gate: 'S2', name: 'anti-cheat scan', cmd: 'semgrep scan --config semgrep/ --error', when: has('semgrep'), why: '未安裝 semgrep' },
];

const results = [];
for (const s of steps) {
  if (s.when === false) {
    results.push([s, 'SKIP', s.why]);
    continue;
  }
  console.log(`\n▶ [${s.gate}] ${s.name}: ${s.cmd}`);
  const ok = spawnSync(s.cmd, { shell: true, stdio: 'inherit' }).status === 0;
  results.push([s, ok ? 'PASS' : 'FAIL', '']);
  if (!ok) break;
}

console.log('\n── 閘門摘要 ──');
for (const [s, r, why] of results) console.log(`${r.padEnd(4)}  [${s.gate}] ${s.name}${why ? `（${why}）` : ''}`);
process.exit(results.some(([, r]) => r === 'FAIL') ? 1 : 0);
