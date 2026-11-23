#!/usr/bin/env bash
# 一鍵發佈到 GitHub Pages
#
# 用法:
#   bash scripts/publish.sh                    # 使用預設 repo 名稱 guangfu-3d-campus
#   bash scripts/publish.sh my-repo-name       # 自訂 repo 名稱
#
# 需求:git、Node 20+;若要自動建立 repo 與啟用 Pages,請先安裝並登入 GitHub CLI:
#   https://cli.github.com/  →  gh auth login
set -euo pipefail

REPO_NAME="${1:-guangfu-3d-campus}"
BRANCH="main"

say() { printf "\n\033[1;34m▶ %s\033[0m\n" "$1"; }
warn() { printf "\033[1;33m! %s\033[0m\n" "$1"; }

say "1/5 安裝套件並在本機驗證建置"
npm ci
npx tsc --noEmit -p tsconfig.json
npm run build

say "2/5 初始化 git"
if [ ! -d .git ]; then
  git init -q
fi
git checkout -B "$BRANCH" -q
git add -A
if ! git diff --cached --quiet; then
  git commit -q -m "chore: deploy via GitHub Pages workflow"
else
  echo "沒有需要提交的變更"
fi

say "3/5 建立 / 連結 GitHub repo"
if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  if git remote get-url origin >/dev/null 2>&1; then
    echo "已設定 origin:$(git remote get-url origin)"
  else
    gh repo create "$REPO_NAME" --public --source=. --remote=origin
  fi
  OWNER="$(gh repo view --json owner -q .owner.login)"
  REPO="$(gh repo view --json name -q .name)"
else
  warn "找不到已登入的 GitHub CLI (gh),改用手動模式。"
  if ! git remote get-url origin >/dev/null 2>&1; then
    echo "請先到 https://github.com/new 建立空的 repo「$REPO_NAME」,然後執行:"
    echo "  git remote add origin https://github.com/<你的帳號>/$REPO_NAME.git"
    echo "  bash scripts/publish.sh"
    exit 1
  fi
  OWNER=""
  REPO=""
fi

say "4/5 啟用 GitHub Pages (Source = GitHub Actions)"
if [ -n "$OWNER" ]; then
  # 已存在就改成 workflow 模式;不存在就建立
  gh api -X POST "repos/$OWNER/$REPO/pages" -f build_type=workflow >/dev/null 2>&1 \
    || gh api -X PUT "repos/$OWNER/$REPO/pages" -f build_type=workflow >/dev/null 2>&1 \
    || warn "自動啟用 Pages 失敗,請到 Settings → Pages → Source 手動選「GitHub Actions」。"
else
  warn "請到 Settings → Pages → Source 手動選「GitHub Actions」。"
fi

say "5/5 同步遠端並推送到 GitHub"
git fetch origin "$BRANCH" 2>/dev/null || true
if git rev-parse --verify "origin/$BRANCH" >/dev/null 2>&1; then
  if ! git merge-base --is-ancestor "origin/$BRANCH" HEAD; then
    say "遠端有你本地沒有的提交,先 rebase 同步"
    git pull --rebase origin "$BRANCH"
  fi
fi
git push -u origin "$BRANCH"

echo
if [ -n "$OWNER" ]; then
  printf "\033[1;32m✔ 完成!約 1 分鐘後可開啟:\033[0m https://%s.github.io/%s/\n" "$OWNER" "$REPO"
  echo "  查看進度:https://github.com/$OWNER/$REPO/actions"
else
  printf "\033[1;32m✔ 已推送!\033[0m 到 Actions 分頁查看部署進度。\n"
fi
