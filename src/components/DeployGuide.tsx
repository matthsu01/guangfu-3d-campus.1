import { useState } from "react";

interface Step {
  n: string;
  title: string;
  color: string;
  body?: string[];
  code?: string;
}

const STEPS: Step[] = [
  {
    n: "1",
    title: "一鍵發佈(推薦)",
    color: "#2ea44f",
    body: [
      "先安裝 GitHub CLI 並登入一次(gh auth login),再於專案資料夾執行:",
      "腳本會自動:驗證建置 → 建立 repo → 把 Pages 設為 GitHub Actions → push。",
    ],
    code: `gh auth login
bash scripts/publish.sh`,
  },
  {
    n: "2",
    title: "或手動推到 GitHub",
    color: "#2f6fe0",
    body: ["不想用 gh 的話,自行建立 repo 後執行:"],
    code: `git init
git add .
git commit -m "feat: 光復國小 3D 校園冒險"
git branch -M main
git remote add origin https://github.com/<你的帳號>/guangfu-3d-campus.git
git push -u origin main`,
  },
  {
    n: "3",
    title: "把 Pages 來源改成 GitHub Actions",
    color: "#f38020",
    body: [
      "GitHub repo → Settings → Pages → Build and deployment → Source,選「GitHub Actions」。",
      "⚠️ 不能選「Deploy from a branch」,否則會拿到未編譯的原始碼而出現白畫面。",
    ],
  },
  {
    n: "4",
    title: "等 Actions 綠燈 🎉",
    color: "#ee2f3b",
    body: ["Actions 分頁的「Deploy to GitHub Pages」跑完(約 1 分鐘)後,網址為:"],
    code: `https://<你的帳號>.github.io/guangfu-3d-campus/`,
  },
];

const WORKFLOW = `# .github/workflows/deploy.yml(摘要)
name: Deploy to GitHub Pages
on:
  push: { branches: [main] }
  pull_request: { branches: [main] }
  workflow_dispatch:
jobs:
  build:
    runs-on: ubuntu-latest
    permissions: { contents: read }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version-file: .nvmrc, cache: npm }
      - run: npm ci
      - run: npx tsc --noEmit -p tsconfig.json
      - run: npm run build
      - run: cp dist/index.html dist/404.html
      - uses: actions/configure-pages@v5
        if: github.event_name != 'pull_request'
      - uses: actions/upload-pages-artifact@v3
        if: github.event_name != 'pull_request'
        with: { path: dist }
  deploy:
    needs: build
    if: github.event_name != 'pull_request'
    runs-on: ubuntu-latest
    permissions: { pages: write, id-token: write }
    environment: { name: github-pages }
    steps:
      - uses: actions/deploy-pages@v4`;

function Code({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <div className="relative mt-2">
      <pre className="code overflow-x-auto rounded-xl bg-[#1f2937] p-3 pr-16 text-[12px] leading-relaxed text-[#a7f3d0]">{text}</pre>
      <button
        className="btn-mario absolute right-2 top-2 !rounded-lg !border-2 !px-2 !py-0.5 text-xs"
        style={{ background: ok ? "#2ea44f" : "#2f6fe0" }}
        onClick={() => {
          navigator.clipboard?.writeText(text);
          setOk(true);
          setTimeout(() => setOk(false), 1200);
        }}
      >
        {ok ? "✔ 已複製" : "複製"}
      </button>
    </div>
  );
}

export default function DeployGuide({ onClose }: { onClose: () => void }) {
  const [showWf, setShowWf] = useState(false);
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/45 p-3" onClick={onClose}>
      <div className="card anim-slideup flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="brick-title flex items-center justify-between px-4 py-3">
          <div className="hud-text text-lg sm:text-xl">🚀 部署教學 · GitHub → GitHub Pages</div>
          <button className="btn-mario !px-3 !py-0 text-lg" style={{ background: "#ee2f3b" }} onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="overflow-y-auto p-4" style={{ userSelect: "text", WebkitUserSelect: "text" }}>
          <div className="mb-3 flex items-center gap-2 rounded-xl bg-[#e8f7ff] p-3 text-sm font-bold">
            <span className="text-xl">🍄</span>
            <span>
              流程:<b>本機 → GitHub → Actions 建置 → GitHub Pages</b>。步驟 1 與 2 擇一即可。專案已附 <code className="code">.github/workflows/deploy.yml</code>、
              <code className="code">scripts/publish.sh</code>、<code className="code">DEPLOY.md</code>。
            </span>
          </div>
          <ol className="space-y-3">
            {STEPS.map((s) => (
              <li key={s.n} className="flex gap-3">
                <div
                  className="hud-text flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-[3px] border-white text-sm shadow-[0_4px_0_rgba(0,0,0,0.25)]"
                  style={{ background: s.color }}
                >
                  {s.n}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-black">{s.title}</div>
                  {s.body?.map((b, i) => (
                    <p key={i} className="mt-0.5 text-[13px] leading-relaxed text-[#6b4a1f]">
                      {b}
                    </p>
                  ))}
                  {s.code && <Code text={s.code} />}
                </div>
              </li>
            ))}
          </ol>
          <button
            className="btn-mario mt-4 w-full"
            style={{ background: "#2f6fe0" }}
            onClick={() => setShowWf((v) => !v)}
          >
            {showWf ? "▲ 收合 workflow" : "▼ 查看 GitHub Actions workflow"}
          </button>
          {showWf && <Code text={WORKFLOW} />}
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#fff3c4] p-3 text-[13px] font-bold">
            <span className="text-xl">⭐</span>
            <span>想綁自己的網域?Settings → Pages → Custom domain,依指示新增 CNAME 並勾選 Enforce HTTPS。</span>
          </div>
        </div>
      </div>
    </div>
  );
}
