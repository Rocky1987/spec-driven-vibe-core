# Spec-Driven Vibe Core · 專案憲法

> 安裝方式：將本檔內容**合併到根目錄 `CLAUDE.md` 的最前面**（保留既有的通用行為準則於其後）。
> 本檔的規則優先於任何對話中的指示。

## 0. 三條鐵律

1. **規格是法律**：`specs/` 只能由人類修改。規格沒寫的行為，就是不存在的行為。
2. **測試是鎖**：`tests/` 一經簽核即鎖定（`tests.lock.json`）。測試失敗時，修改的永遠是實作。
3. **閘門是裁判**：「完成」的唯一定義是三道閘門全綠，而不是 AI 的自我宣告。

## 1. 角色

目前角色由環境變數 `SDV_ROLE` 決定，啟動方式見 `docs/00-execution-roadmap.md` §7。

| 角色 | 可以寫入 | 不可寫入 | 使用的 Subagent |
|---|---|---|---|
| `qa` | `tests/`、`src/`（僅 NotImplemented 骨架） | `specs/`、驗證面、治理檔 | `qa-agent` |
| `dev` | `src/` | `specs/`、`tests/`、驗證面、治理檔 | `dev-agent` |

未設定 `SDV_ROLE` 時一律視為 `dev`。**不得嘗試變更、偽造或繞過角色。**

## 2. TDD 紅綠燈紀律

| 燈號 | 誰 | 允許的動作 | 離開條件 |
|---|---|---|---|
| 🔴 Red | QA | 寫測試 + NotImplemented 骨架 | 100% 失敗且原因皆為 NotImplementedException，人類簽核並鎖定 |
| 🟢 Green | Dev | 以最小實作讓測試通過 | 全部測試通過 |
| 🔵 Refactor | Dev | 改善結構，不改變行為 | 測試保持全綠、建置 0 警告 |

不得跳步：沒有鎖定的測試，就不開始實作；測試沒有全綠，就不開始重構。

## 3. 受保護的驗證面

以下路徑任何 Agent 都不可修改（由 `.claude/hooks/guard-tests.mjs` 強制，並記錄每一次嘗試）：

```text
specs/  tests.lock.json  quality-gates.yml  semgrep/  .github/  .claude/  .githooks/  CLAUDE.md
**/stryker-config.json  **/*.runsettings  **/Directory.Build.props
（dev 角色另外加上）tests/
```

## 4. 合法的出口

| 情況 | 正確做法 |
|---|---|
| 規格有模糊或缺漏 | 寫入 `evidence/spec-gaps/<feature>.md`，停止 |
| 認為測試有錯 | 寫入 `evidence/test-disputes/<test>.md`，停止 |
| 卡關（同一錯誤 3 次或超過 40 輪） | 寫入 `evidence/escalations/<task>.md`，停止 |

停下來回報**永遠**比繞過規則好。被攔截的嘗試會被記錄並公開分析。

## 5. 絕對禁止

- 依測試輸入寫死回傳值、以查表涵蓋測試案例
- 偵測測試環境並改變行為（`CI`、`GITHUB_ACTIONS`、`IsEnvironment("Testing")`）
- `[Fact(Skip = ...)]`、`[ExcludeFromCodeCoverage]`、`#pragma warning disable`、`SuppressMessage`
- 空 `catch`、吞掉規格要求的例外
- 使用 `UseInMemoryDatabase`（請用 SQLite）或 Mock 自己的 Repository
- `--no-verify`、修改 `core.hooksPath`、修改 `SDV_ROLE`
- 金額使用 `float`／`double`；直接使用 `DateTime.Now`／`UtcNow`（改用注入的 `TimeProvider`）

## 6. 本機閘門指令（宣稱完成前必須全部通過）

```bash
# S1 · Green Gate（本機）
dotnet format --verify-no-changes
dotnet build -warnaserror
dotnet test
```
