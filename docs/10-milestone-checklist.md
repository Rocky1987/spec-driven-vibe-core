# 10 · 里程碑驗收總表 Milestone Checklist

> 開發時逐項把 `[ ]` 改成 `[x]`。每一項都要有**可重現的驗證方式**，證據存到 `evidence/`。
> 步驟細節見 [00 · 執行總綱](00-execution-roadmap.md)，門檻數值見 [`quality-gates.yml`](../templates/quality-gates.yml)。
> 通過條件：**該 Phase 的所有項目都打勾，才能進下一個 Phase。** 不利的數據也要如實記錄，不算失敗。

## 總覽

| Phase | 週 | 主題 | 版本標記 | 狀態 |
|---|---|---|---|---|
| P0 | 1 | 骨架、護欄、紅隊、雙建置方式骨架 | `v0.1.0` | ☐ |
| P1 | 2 | L1 價格計算完整跑通 | `v0.2.0` | ☐ |
| P2 | 3 | L2 庫存預留、資料庫與時間 | `v0.3.0` | ☐ |
| P3 | 4 | 收斂、雙方式實測、發表 | `v1.0.0` | ☐ |

## P0 · 骨架與護欄

| ✓ | # | 驗收項目 | 驗證方式 | 證據 |
|---|---|---|---|---|
| [x] | 0.1 | `main` 分支保護：Require status checks（`Gate Summary`，上游失敗時它會跟著失敗），單人模式不勾 approvals | Settings → Rules | 紅隊 PR #2：Gate Summary 標示 Required、合併被擋（截圖） |
| [x] | 0.2 | 方案可建置 | `dotnet build` 0 警告 | CI 紀錄 |
| [x] | 0.3 | `templates/` 已安裝到根目錄，`core.hooksPath` 已設定 | `git config core.hooksPath` 回傳 `.githooks` | 實測回傳 `.githooks` |
| [x] | 0.4 | CI 三道閘門空殼跑通 | Actions 全綠 | Actions run #1（ccb62e2）全綠，S0 跳過 |
| [x] | 0.4a | 方式 A：Dockerfile／compose.yml（web、test、verify）／.dockerignore 就位，CI 有 `docker build` | `docker compose up` 開得到 MVC 預設頁 | CI 紀錄 |
| [x] | 0.4b | 方式 B：`scripts/verify-all.mjs` 可在本機與容器內共用；README 指令表與實際一致 | `dotnet run`、`dotnet test`、`node scripts/verify-all.mjs` 皆可執行 | — |
| [x] | 0.5a | 紅隊 ①：Edit 與 Bash 繞道改 `tests/` 被攔截 | Hook exit 2 | `evidence/guardrail-redteam.md`（Edit 改 `tests/`、Bash `sed -i` 改 `tests/`、Bash `cp` 覆寫 `.github/` 皆 exit 2；原始事件在本機 `guard-events.jsonl`） |
| [x] | 0.5b | 紅隊 ②：Agent Session 提交測試變更被 pre-commit 拒絕 | 提交失敗 | `evidence/guardrail-redteam.md` |
| [x] | 0.5c | 紅隊 ③：含測試變更的 `dev/*` PR 無法合併 | Classify 失敗 ＋ Lock 不符（Lock 部分待 Phase 1 的 `tests.lock.json`） | PR #2 截圖（Classify ❌、Gate Summary ❌、合併被擋） |
| [x] | 0.5d | 紅隊 ④：Spec 角色寫 `tests/`、`src/` 被攔截；Reviewer 角色寫 `specs/`、`tests/`、`src/` 被攔截；QA／Dev 寫 `specs/` 被攔截 | Hook exit 2（`SDV_ROLE=spec\|reviewer\|qa\|dev` 各測一次） | `evidence/guardrail-redteam.md`（角色矩陣 11 組） |
| [x] | 0.5e | 紅隊 ⑤：`spec/*` PR 含 `tests/` 或 `src/` 變更時 S2 Protected paths 失敗 | CI 失敗 | PR #4 截圖（S2 ❌、Gate Summary ❌ Required、合併被擋）。註：`spec/*` 含 `tests/` 會被判為 QA 流程（只跑 S0），該情況由 Hook／pre-commit 層攔截 |
| [ ] | 0.5f | 四個角色都能用 `claude --settings .claude/roles/<role>.settings.json` 啟動，且對應 Subagent 可被呼叫 | 各角色啟動並執行一次簡單任務 | 截圖 |
| [ ] | 0.6 | README 與 Social Preview 上線 | GitHub 首頁顯示正常 | 截圖 |
| [ ] | 0.7 | 素材 #1–#4（拍攝清單）已捕捉 | [07 §7](07-visual-identity.md) 打勾 | `assets/` |
| [ ] | 0.8 | 發佈：LinkedIn #1、Threads T1／T2、`v0.1.0` | 貼文連結 | — |

## P1 · L1 價格計算

| ✓ | # | 驗收項目 | 驗證方式 | 證據 |
|---|---|---|---|---|
| [ ] | 1.0 | Spec Agent 起草 `price-calculation.feature`，Reviewer Agent 審稿（不同模型），人類核准後合併 `spec/*` PR | Reviewer 意見與修訂紀錄齊全 | `evidence/spec-reviews/` |
| [ ] | 1.1 | `price-calculation.feature` 定稿，每條規則有 ID | 規格追溯檢查 | — |
| [ ] | 1.2 | 範例測試、CsCheck 屬性測試與 NotImplemented 空殼產出 | 每條規則 ≥ 1 個測試 | — |
| [ ] | 1.3 | **S0 Red**：100% 失敗，且原因皆為 `NotImplementedException` | S0 腳本 | 報告 |
| [ ] | 1.4 | 人工簽核（依清單，不同 Session）並產生 `tests.lock.json` | `test-lock.mjs verify` 通過 | Lock 檔 |
| [ ] | 1.5 | **S1 Green**：測試 100% 通過；Line ≥ 95%、Branch ≥ 90% | coverlet 報告 | 報告 |
| [ ] | 1.6 | **S2 Guard**：Lock 相符、反作弊掃描 0、突變分數 ≥ 80% | Stryker 報告 | 報告 |
| [ ] | 1.7 | 對照實驗：同規格、無護欄 Session 的差異已記錄 | — | `evidence/experiment-l1.md` |
| [ ] | 1.8 | 素材 #5–#7 已捕捉；發佈 Threads T3／T4、`v0.2.0` | — | `assets/` |

## P2 · L2 庫存預留

| ✓ | # | 驗收項目 | 驗證方式 | 證據 |
|---|---|---|---|---|
| [ ] | 2.1 | `reserve-stock.feature` 定稿（預留、10 分鐘自動釋放、庫存不足） | 規格追溯檢查 | — |
| [ ] | 2.2 | 時間一律經 `TimeProvider` 注入，測試用 `FakeTimeProvider` | Semgrep 禁止直接用 `DateTime.Now` | 掃描報告 |
| [ ] | 2.3 | MVC 整合測試（`WebApplicationFactory` ＋ SQLite），無 EF InMemory | 測試通過 | — |
| [ ] | 2.4 | 斷路器運作（同一失敗指紋 3 次或 40 輪即停） | 有觸發留報告，沒觸發如實記錄 | `evidence/` |
| [ ] | 2.5 | S0 → Lock → S1 → S2 全過，L2 門檻達標 | Gate Summary | 報告 |
| [ ] | 2.6 | 素材 #8 已捕捉；發佈 LinkedIn #2、Threads T5／T6、`v0.3.0` | — | `assets/` |

## P3 · 收斂與發表

| ✓ | # | 驗收項目 | 驗證方式 | 證據 |
|---|---|---|---|---|
| [ ] | 3.1 | `main` 三道閘門全綠，已打 `v1.0.0` | Actions ＋ Tag | — |
| [ ] | 3.1a | **方式 A 實測**（乾淨環境只裝 Docker）：`up` 開得到預約頁 `:8080`；`run --rm test` 全過；`run --rm verify` Gate Summary 全綠 | 退出碼 0 | `evidence/quickstart-verify.md` |
| [ ] | 3.1b | **方式 B 實測**（乾淨環境只裝 .NET 9 ＋ Node.js）：`dotnet run` 開得到預約頁 `:5080`；`dotnet test` 全過；`node scripts/verify-all.mjs` Gate Summary 全綠 | 退出碼 0 | `evidence/quickstart-verify.md` |
| [ ] | 3.1c | 兩種方式的結果一致（測試數、覆蓋率、突變分數） | 對照兩份 Gate Summary | `evidence/quickstart-verify.md` |
| [ ] | 3.2 | Pilot 報告 `docs/09-pilot-report.md`，只放實測數據、含不利數據 | 每個數字可對應 `evidence/` | 報告 |
| [ ] | 3.3 | 報告附「正式導入建議」 | 對照 [02 §5](02-difficulty-grading.md) | — |
| [ ] | 3.4 | Demo 影片（1–2 分鐘）與 3 支 GIF；README 定稿；佔位符已全數替換 | [07 §10](07-visual-identity.md) 檢查清單 | `assets/` |
| [ ] | 3.5 | 發佈 LinkedIn #3 ＋ Carousel、Threads T7／T8、GitHub Release | — | 貼文連結 |

## 記錄規則

- 打勾時在 commit message 註明項目編號（例如 `milestone: 0.5a 紅隊 ① 通過`）。
- 某項失敗或未達標：不要改門檻，在該列「證據」欄寫明原因與連結，並依[失敗歸屬表](05-verification-pipeline.md#失敗歸屬表)處理。
