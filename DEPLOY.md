# 🚀 部署流程:GitHub → GitHub Pages

> 專案:光復國小 3D 校園冒險(React + Vite + Three.js)
> 網址格式:`https://<你的帳號>.github.io/guangfu-3d-campus/`

```
本機開發 ──push──▶ GitHub (main) ──Actions──▶ 型別檢查 → 建置 → 發佈 dist/ ──▶ GitHub Pages
                      ▲
          Pull Request 只會檢查 + 建置,不會發佈
```

## 檔案一覽

| 檔案 | 用途 |
| --- | --- |
| `.github/workflows/deploy.yml` | CI/CD:PR 檢查、main 自動部署 |
| `scripts/publish.sh` | 一鍵:驗證 → 建 repo → 啟用 Pages → push |
| `public/.nojekyll` | 告訴 GitHub Pages 不要用 Jekyll 處理檔案 |
| `.nvmrc` | 固定 Node 版本(20),本機與 CI 一致 |

## 方式 A:一鍵發佈(推薦)

先安裝 [GitHub CLI](https://cli.github.com/) 並登入一次:

```bash
gh auth login
```

然後在專案資料夾執行:

```bash
bash scripts/publish.sh                # repo 名稱預設為 guangfu-3d-campus
bash scripts/publish.sh my-repo-name   # 或自訂名稱
```

腳本會依序:`npm ci` → 型別檢查 → `npm run build` → `git init` / commit →
建立 public repo → 把 Pages Source 設為 **GitHub Actions** → `git push`。

## 方式 B:手動

```bash
# 0. 本機測試
npm install
npm run dev          # http://localhost:5173
npm run build        # 產生 dist/
npm run preview

# 1. 推到 GitHub
git init
git add .
git commit -m "feat: 光復國小 3D 校園冒險"
git branch -M main
git remote add origin https://github.com/<你的帳號>/guangfu-3d-campus.git
git push -u origin main
```

2. 到 GitHub repo → **Settings → Pages → Build and deployment → Source**
   選 **`GitHub Actions`**(⚠️ 不是 Deploy from a branch)
3. 到 **Actions** 分頁,等 `Deploy to GitHub Pages` 變綠色 ✅(約 1 分鐘)
4. 開啟 `https://<你的帳號>.github.io/guangfu-3d-campus/`

之後每次 `git push` 到 `main` 都會自動重新部署。

## Workflow 做了什麼?

| 步驟 | 說明 |
| --- | --- |
| `npm ci` | 依 `package-lock.json` 乾淨安裝,結果可重現 |
| `tsc --noEmit` | 型別檢查,有錯就停止,不會把壞掉的版本上線 |
| `npm run build` | Vite 建置;`vite-plugin-singlefile` 把 JS/CSS 內嵌成單一 `dist/index.html` |
| 複製 `404.html` | 找不到頁面時仍回到遊戲 |
| `deploy-pages` | 僅限 `main` / 手動執行才發佈 |

> 因為所有資源都內嵌在單一 HTML,放在 `/<repo>/` 子路徑也能運作,
> **不需要**在 `vite.config.ts` 設定 `base`。

## 常見問題

**網址開啟是白畫面?**
Pages Source 還停在 *Deploy from a branch*,瀏覽器拿到的是未編譯的原始碼 `index.html`
(內含 `/src/main.tsx`,會 404)。改成 **GitHub Actions** 即可。

**Actions 顯示 `Get Pages site failed` / `Pages not enabled`?**
Settings → Pages → Source 尚未選 GitHub Actions,選好後到 Actions 點 **Re-run all jobs**。

**部署 job 停在 "Waiting for approval"?**
Settings → Environments → `github-pages` → 檢查 *Deployment branches* 是否允許 `main`。

**改了內容但網站還是舊的?**
等 Actions 綠燈後,按 `Ctrl/Cmd + Shift + R` 強制重新整理。

**私有 repo 能用 Pages 嗎?**
需要 GitHub Pro / Team / Enterprise;免費帳號請使用 public repo。

**`git push` 被拒絕 (rejected, fetch first)?**
遠端有你本地沒有的提交(例如在 GitHub 網頁建 repo 時順手加了 README / LICENSE)。
先同步再推:

```bash
git fetch origin
git pull --rebase origin main
git push -u origin main
```

有衝突就解完後 `git add .` → `git rebase --continue` → 再 push。
只有當你確定遠端的東西可以丟掉時,才用 `git push --force-with-lease` 覆蓋。
(`scripts/publish.sh` 已內建這個同步步驟,直接用它就不會遇到。)

**沒有聲音?**
瀏覽器需要使用者互動後才會播放音效,請先按 START。

## 自訂網域(選用)

Settings → Pages → **Custom domain** 輸入網域,依指示在 DNS 新增 `CNAME`
(指向 `<你的帳號>.github.io`),並勾選 **Enforce HTTPS**。
