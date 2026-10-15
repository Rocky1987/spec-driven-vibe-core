# 11 · 導入指南：把 TDD 四步加進既有專案

> 讀者：想讓 AI agent 日常開發時照 TDD 走的工程師。範例見價格計算（`specs/flash-sale/price-calculation.feature`）。

## 四步與兩個燈

| 步驟 | 做什麼 | 誰 | CI 把關 |
|---|---|---|---|
| 1 規則 | 規劃文件寫驗收規則，每條有 ID | 人 | — |
| 2 測試 | agent 依規則寫測試與 `NotImplemented` 骨架，人看過後鎖定 | agent + 人 | 🔴 紅燈：測試必須 100% 失敗，且原因是 `NotImplementedException` |
| 3 實作 | agent 只改實作，測試失敗不可改測試 | agent | 🟢 綠燈：測試全過，同時確認測試沒被改過 |
| 4 完成 | 兩個燈都過才算完成 | CI | Gate Summary 全綠 |

測試與實作各開一個 PR：測試 PR 只看紅燈，實作 PR 只看綠燈。

## 最輕量做法（只要這些就能跑）

1. **規則表**：每條規則一個 ID，寫成表格或條列。
   ```
   | ID | 規則 | 範例 |
   | PRC-001 | 折扣金額向下捨去至分 | 19.99 × 3，折扣 0.15 → 折扣 8.99 |
   ```
2. **提示詞樣板**（步驟 2，交給 agent）：
   > 依下列規則寫測試。每條規則至少 1 個測試，測試加上 `[Trait("Rule", "<ID>")]`。實作類別只放 `throw new NotImplementedException()`。不要寫實作。
3. **測試鎖**：人看過測試後，執行 `node scripts/test-lock.mjs generate`，把 `tests.lock.json` 一起提交。
4. **CI**：測試 PR 跑紅燈檢查，實作 PR 跑 `dotnet test` 與 `node scripts/test-lock.mjs verify`。

步驟 3 的提示詞：
> 讓 `tests/` 的測試全部通過。只能修改 `src/`。測試失敗時改實作，不改測試。

## 要複製哪些檔案

| 檔案 | 用途 | 必要 |
|---|---|---|
| `scripts/test-lock.mjs` | 產生與驗證 `tests.lock.json` | 必要 |
| `scripts/ci/assert-red.mjs` | CI 紅燈檢查 | 必要 |
| `.github/workflows/verification-pipeline.yml` | 區分測試 PR 與實作 PR，執行兩個燈 | 必要 |
| `semgrep/anti-reward-hacking.yml` | 掃描 `Skip`、關閉警告等作弊寫法 | 建議 |
| `.github/CODEOWNERS` | 治理檔變更需人審 | 建議 |

分支保護：`main` 設 Required check 為 `Gate Summary`，一律走 PR。

## 進階（選用）：連 agent 都擋住

輕量做法靠 CI 把關，agent 在本機仍可改測試，只是 PR 會被擋。想在更早的階段攔下，可再加：

| 檔案 | 作用 |
|---|---|
| `.claude/hooks/guard-tests.mjs`、`.claude/settings.json` | agent 寫入受保護路徑時當場攔截並記錄 |
| `.githooks/pre-commit` | 提交時再擋一次，啟用：`git config core.hooksPath .githooks` |
| `.claude/roles/`、`.claude/agents/`、`CLAUDE.md` | 依角色（`qa` 寫測試、`dev` 寫實作）限制可寫路徑 |

這些不是必要的。先用輕量做法跑通，再依需要加上。

## 驗證你導入成功

1. 測試 PR：故意讓一個測試通過，CI 紅燈檢查應失敗。
2. 實作 PR：故意改一行測試，CI 的鎖檢查應失敗。
3. 兩項都擋得住，才算導入完成。
