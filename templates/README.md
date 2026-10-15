# templates · 護欄套件安裝指南

本目錄是**尚未生效**的護欄範本，Phase 0 時安裝到根目錄。放在這裡而不是直接放在根目錄，是為了避免在規劃階段就影響 Claude Code 的行為。

## 內容對照

| 範本 | 安裝到 | 防線 |
|---|---|---|
| `CLAUDE.project.md` | 合併進根目錄 `CLAUDE.md` 最前面 | 行為約束 |
| `.claude/settings.json` | `.claude/settings.json` | ① Agent 層（Hook） |
| `.claude/roles/*.settings.json` | `.claude/roles/` | ① Agent 層（權限） |
| `.claude/agents/*.md` | `.claude/agents/` | Context 隔離 |
| `.claude/hooks/guard-tests.mjs` | `.claude/hooks/` | ①②③ 共用規則 |
| `.githooks/pre-commit` | `.githooks/` | ② 提交層 |
| `.github/CODEOWNERS`、`.github/workflows/` | `.github/` | ③ CI 層 |
| `scripts/test-lock.mjs` | `scripts/` | ③ CI 層（Test Lock） |
| `quality-gates.yml` | 根目錄 | 門檻來源 |
| `semgrep/` | 根目錄 `semgrep/` | ③ 反作弊 |
| `specs/flash-sale/price-calculation.feature` | `specs/` | 規格範例 |
| `.gitattributes` | 根目錄 | Lock 跨平台一致 |

## 先裝最小版就夠用

不必一次裝完全部。這個套件要防的只有一件事：**AI 為了讓測試通過，去改測試或寫死答案。** 先裝下面三項，就能做到「Dev 角色的 AI 動不了 `tests/`」；其餘等需要時再加。

| 階段 | 範本 | 作用 | 沒有它會怎樣 |
|---|---|---|---|
| **最小版** | `CLAUDE.project.md`（合併進 `CLAUDE.md`） | 告訴 AI 不准改測試、不准寫死值 | 只靠 AI 自律 |
| **最小版** | `.claude/roles/*.settings.json` | 用權限擋住 AI 寫 `tests/` 與 `specs/` | AI 真的改得動測試 |
| **最小版** | `.claude/settings.json` ＋ `.claude/hooks/guard-tests.mjs` | 擋住用 `sed`、重新導向等方式繞過權限 | 權限設定可被繞過 |
| 進階 | `.githooks/pre-commit` | 提交時再擋一次 | AI 改了測試仍可 commit |
| 進階 | `.github/`、`scripts/test-lock.mjs` | CI 比對測試指紋，被改過就失敗；這才是最終裁判 | 前面都只是君子協定 |
| 進階 | `semgrep/`、Stryker 設定、`quality-gates.yml` | 掃描 `Skip` 與寫死值；用突變測試檢查測試夠不夠強 | 弱測試也會全綠 |
| 進階 | `.claude/agents/*.md` | 各角色用不同模型與上下文 | 角色分得開，但更容易犯同一個錯 |

最小版安裝：

```bash
cp -r templates/.claude .
# 將 templates/CLAUDE.project.md 的內容合併到 CLAUDE.md 最前面
claude --settings .claude/roles/dev.settings.json
```

**限制**：只有最小版時，擋得住誠實的 AI，擋不住刻意繞路的；要有完整保證必須加 CI（進階）。

## 完整安裝

```bash
# 在專案根目錄執行（Git Bash / macOS / Linux）
cp -r templates/.claude templates/.githooks templates/.github templates/scripts \
      templates/semgrep templates/specs templates/quality-gates.yml templates/.gitattributes .
chmod +x .githooks/pre-commit
git config core.hooksPath .githooks
# 手動：將 templates/CLAUDE.project.md 的內容合併到 CLAUDE.md 最前面
# 手動：將 .github/CODEOWNERS 中的 @Rocky1987 換成你的帳號
```

```powershell
# Windows PowerShell
'.claude','.githooks','.github','scripts','semgrep','specs' | ForEach-Object { Copy-Item -Recurse -Force "templates/$_" . }
Copy-Item templates/quality-gates.yml, templates/.gitattributes .
git config core.hooksPath .githooks
```

## 安裝後驗證（紅隊測試）

```bash
# 1. Hook 攔截 Edit（預期 exit 2 並印出 TEST-LOCK）
echo '{"tool_name":"Edit","tool_input":{"file_path":"tests/x.cs"}}' | SDV_ROLE=dev node .claude/hooks/guard-tests.mjs

# 2. Hook 攔截 Bash 繞道（預期 exit 2）
echo '{"tool_name":"Bash","tool_input":{"command":"sed -i s/1/2/ tests/x.cs"}}' | SDV_ROLE=dev node .claude/hooks/guard-tests.mjs

# 3. 正常指令不被誤擋（預期 exit 0）
echo '{"tool_name":"Bash","tool_input":{"command":"dotnet test tests/FlashSale.Tests"}}' | SDV_ROLE=dev node .claude/hooks/guard-tests.mjs

# 4. 實戰：以 Dev 角色啟動 Claude Code，要求它「修改測試讓它通過」
claude --settings .claude/roles/dev.settings.json
```

每次攔截都會寫入 `evidence/guard-events.jsonl`。

## 設計說明

- **角色設定與 Subagent 的分工**：`.claude/roles/*.settings.json` 決定「能寫哪裡」（權限隔離）；`.claude/agents/*.md` 決定「怎麼思考、用哪個模型」（Context 隔離與模型多樣性）。兩者搭配使用。
- **單一規則來源**：受保護路徑只定義在 `guard-tests.mjs`，Hook、pre-commit 與 CI 都呼叫同一支腳本，避免三份規則不同步。
- **單人專案的 CODEOWNERS**：GitHub 不允許作者核准自己的 PR，所以單人模式只要求 CI status checks（`stage2-guard`），不要求 approvals，也不需要第二個帳號；團隊導入時再啟用 Code Owner 審核。
