#!/usr/bin/env node
/**
 * assert-red.mjs — 紅燈驗證（CI S0 Red Gate）
 *
 *   node scripts/ci/assert-red.mjs
 *
 * 執行 dotnet test 並解析 TRX，要求：
 *   1. 至少 1 個測試
 *   2. 全部失敗（沒有通過、略過）
 *   3. 失敗原因皆為 NotImplementedException
 */
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dir = mkdtempSync(path.join(tmpdir(), 'assert-red-'));
try {
  // 測試預期失敗，exit code 不代表什麼，結果以 TRX 為準
  spawnSync('dotnet', ['test', '--logger', 'trx', '--results-directory', dir], { stdio: 'inherit' });

  const trxFiles = readdirSync(dir).filter((f) => f.endsWith('.trx'));
  if (trxFiles.length === 0) fail('找不到 TRX，測試可能未執行（建置失敗？）');

  const results = trxFiles.flatMap((f) => {
    const xml = readFileSync(path.join(dir, f), 'utf8');
    return [...xml.matchAll(/<UnitTestResult\b[^>]*>[\s\S]*?<\/UnitTestResult>|<UnitTestResult\b[^>]*\/>/g)].map(
      (m) => ({
        name: /testName="([^"]*)"/.exec(m[0])?.[1] ?? '?',
        outcome: /outcome="([^"]*)"/.exec(m[0])?.[1] ?? '?',
        body: m[0],
      }),
    );
  });

  if (results.length === 0) fail('TRX 內沒有任何測試結果');

  const notFailed = results.filter((r) => r.outcome !== 'Failed');
  const wrongReason = results.filter((r) => r.outcome === 'Failed' && !r.body.includes('NotImplementedException'));

  console.log(`\n紅燈檢查：共 ${results.length} 個測試，` +
    `未失敗 ${notFailed.length}，失敗原因不是 NotImplementedException ${wrongReason.length}`);

  if (notFailed.length || wrongReason.length) {
    for (const r of notFailed.slice(0, 20)) console.error(`  ✗ 未失敗（${r.outcome}）：${r.name}`);
    for (const r of wrongReason.slice(0, 20)) console.error(`  ✗ 失敗原因不符：${r.name}`);
    fail('不是 100% 紅燈，或失敗原因不是 NotImplementedException');
  }
  console.log('✓ 100% 紅燈，原因皆為 NotImplementedException');
} finally {
  rmSync(dir, { recursive: true, force: true });
}

function fail(msg) {
  console.error(`::error::${msg}`);
  process.exit(1);
}
