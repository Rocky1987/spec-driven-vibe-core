# 10 · 里程碑驗收總表 Milestone Checklist

> 範圍已收斂為日常開發導入 TDD 的四個步驟。完整護欄版（四角色、審稿、紅隊、突變測試）保存於標記 `v0.1-full`。
> 開發時逐項把 `[ ]` 改成 `[x]`，commit message 註明項目編號。不利的數據也要如實記錄。

## 四個步驟

1. **規劃文件寫驗收規則**：每條規則有 ID，表格或條列即可。
2. **先寫測試，人看過後鎖定**：agent 依規則寫測試，人簽核後產生 `tests.lock.json`。
3. **實作到全綠**：agent 只改實作，測試失敗不可改測試。
4. **CI 把關**：綠燈才算完成。

## A · 護欄基礎（已完成）

| ✓ | # | 驗收項目 | 證據 |
|---|---|---|---|
| [x] | A.1 | `main` 分支保護：Required check 為 `Gate Summary`，一律走 PR | PR #2、#4 合併被擋 |
| [x] | A.2 | CI 閘門跑通，`dotnet build` 0 警告 | Actions 全綠 |
| [x] | A.3 | Hook 與 pre-commit 擋下對 `tests/` 與治理檔的修改 | `v0.1-full` 的 `evidence/guardrail-redteam.md` |
| [x] | A.4 | 價格計算規格定稿並合併（PRC-001~004） | PR #6 |

## B · 用價格計算跑通四步

| ✓ | # | 步驟 | 驗收項目 | 驗證方式 |
|---|---|---|---|---|
| [x] | B.1 | 1 規則 | 價格計算驗收規則定稿並合併 | `specs/flash-sale/price-calculation.feature` |
| [x] | B.2 | 2 測試 | agent 依規則寫測試與 NotImplemented 骨架，每條規則至少 1 個測試 | PR #9，每條規則皆有測試（13 個方法、56 案例） |
| [x] | B.3 | 2 測試 | 測試先紅：全部失敗，且原因皆為 `NotImplementedException` | PR #9 S0：56 失敗 0 通過，原因皆為 NotImplementedException |
| [x] | B.4 | 2 測試 | 人看過測試並簽核，產生 `tests.lock.json` | `node scripts/test-lock.mjs verify` 通過 |
| [x] | B.5 | 3 實作 | agent 只改 `src/`，`dotnet test` 全數通過 | PR #11，56 個測試全過，`tests/` 無變更 |
| [x] | B.6 | 4 CI | PR 的 Gate Summary 全綠，含 Lock 相符 | PR #11 Gate Summary 全綠（S1、S2 通過） |

## C · 導入指南

| ✓ | # | 驗收項目 | 驗證方式 |
|---|---|---|---|
| [ ] | C.1 | 一頁導入指南：如何把四步加進既有專案（需要複製哪些檔案、怎麼設定） | 照指南能在空專案重現 |
| [ ] | C.2 | README 改寫為只講四步，附價格計算示範與不利數據 | 首頁閱讀 |

## 暫緩項目（不在本範圍）

四角色拆分、獨立審稿、突變測試、對照實驗、L2 庫存預留、發文與影片素材。需要時從 `v0.1-full` 取回。
