# 🍄 光復國小 3D 校園冒險

新北市中和區光復國小 115 學年度教室配置 3D 互動地圖,超級瑪利風格、含 8-bit 音效。

- **React 19 + Vite + Tailwind CSS 4 + Three.js**
- 7 位可換主角:小光、蜘蛛人、小小兵、路易吉、耀西、碧姬公主、奇諾比奧
- 校園 NPC(學生、校長)、金幣、問號磚小知識、傳送水管、終點旗

## 開發

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # 輸出 dist/(單一 index.html)
npm run preview
```

## 部署

push 到 `main` 會自動透過 GitHub Actions 發佈到 GitHub Pages。
完整步驟請看 [DEPLOY.md](./DEPLOY.md),或直接執行:

```bash
bash scripts/publish.sh
```

## 操作

| 操作 | 按鍵 |
| --- | --- |
| 移動 | `WASD` / 方向鍵(`Shift` 跑步) |
| 跳躍 | `Space` |
| 旋轉視角 | 拖曳畫面 / `Q` `E` |
| 縮放 | 滾輪 |
| 手機 | 左下搖桿移動、右下 A 跳躍 |
