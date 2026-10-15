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

## 安裝

```bash
# 在專案根目錄執行（Git Bash / macOS / Linux）
cp -r templates/.claude templates/.githooks templates/.github templates/scripts \
      templates/semgrep templates/specs templates/quality-gates.yml templates/.gitattributes .
chmod +x .githooks/pre-commit
git config core.hooksPath .githooks
# 手動：將 templates/CLAUDE.project.md 的內容合併到 CLAUDE.md 最前面
# 手動：將 .github/CODEOWNERS 中的 @YOUR_GITHUB_ID 換成你的帳號
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
- **單人專案的 CODEOWNERS**：GitHub 不允許作者核准自己的 PR，請為 Agent 建立獨立帳號推送分支。
