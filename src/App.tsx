import { useCallback, useEffect, useRef, useState } from "react";
import { createGame, type Game } from "./game/engine";
import { GameAudio } from "./game/audio";
import { ZONES, type Zone } from "./game/data";
import DeployGuide from "./components/DeployGuide";
import TouchControls from "./components/TouchControls";
import { CHARACTERS, type CharacterId } from "./game/characters";
import { DEFAULT_TRACK_ID, TRACKS } from "./game/music";
import { FAMILY_MART, FAMILY_MART_GREEN, PRODUCTS, STORES, priceFor, type BuffInfo } from "./game/shops";
import { Bell, Check, CircleHelp, Coins, Croissant, CupSoda, Egg, MapPin, Milk, Music, Music2, Repeat, Rocket, Sandwich, Shirt, Store, Users, Volume2, VolumeX, X, type LucideIcon } from "lucide-react";

const lsGet = (k: string): string | null => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const lsSet = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* 忽略儲存失敗 */
  }
};

const audio = new GameAudio();
const productIcons: Record<string, LucideIcon> = { cola: CupSoda, egg: Egg, milk: Milk, toast: Sandwich, bread: Croissant };

type Panel = "none" | "places" | "deploy" | "help" | "characters" | "music" | "shop";

export default function App() {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [started, setStarted] = useState(false);
  const [coins, setCoins] = useState(0);
  const [total, setTotal] = useState(0);
  const [zone, setZone] = useState<Zone | null>(null);
  const [toast, setToast] = useState<{ id: number; title: string; msg: string; first: boolean } | null>(null);
  const [clear, setClear] = useState<{ coins: number; total: number } | null>(null);
  const [muted, setMuted] = useState(false);
  const [panel, setPanel] = useState<Panel>("none");
  const [seconds, setSeconds] = useState(0);
  const [zoneOpen, setZoneOpen] = useState(true);
  const [character, setCharacter] = useState<CharacterId>(() => {
    try {
      const saved = localStorage.getItem("gf-character");
      if (saved && CHARACTERS.some((c) => c.id === saved)) return saved as CharacterId;
    } catch {
      /* localStorage 不可用時用預設主角 */
    }
    return "xiaoguang";
  });
  const charDef = CHARACTERS.find((c) => c.id === character) ?? CHARACTERS[0];

  // ---------- 商店 ----------
  const [shopState, setShopState] = useState<{ buffs: BuffInfo[]; owned: Record<string, number> } | null>(null);
  const shopZone = zone?.shopId ? STORES.find((st) => st.id === zone.shopId) : undefined;
  const saleProd = shopZone ? PRODUCTS.find((pd) => pd.id === shopZone.sale.productId) : undefined;
  const isFamily = shopZone?.id === FAMILY_MART.id;

  // ---------- 背景音樂選擇 ----------
  const [trackId, setTrackId] = useState<string>(() => {
    const saved = lsGet("gf-track");
    return saved && TRACKS.some((t) => t.id === saved) ? saved : DEFAULT_TRACK_ID;
  });
  const [musicOff, setMusicOff] = useState(() => lsGet("gf-music-off") === "1");
  const [musicVol, setMusicVol] = useState(() => {
    const v = parseFloat(lsGet("gf-music-vol") ?? "");
    return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.7;
  });
  const [autoNext, setAutoNext] = useState(() => lsGet("gf-music-auto") === "1");
  const track = TRACKS.find((t) => t.id === trackId) ?? TRACKS[0];

  useEffect(() => {
    audio.setTrack(trackId);
    lsSet("gf-track", trackId);
  }, [trackId]);
  useEffect(() => {
    audio.setMusicVolume(musicVol);
    lsSet("gf-music-vol", String(musicVol));
  }, [musicVol]);
  useEffect(() => {
    audio.setAutoNext(autoNext);
    lsSet("gf-music-auto", autoNext ? "1" : "0");
  }, [autoNext]);
  useEffect(() => {
    lsSet("gf-music-off", musicOff ? "1" : "0");
  }, [musicOff]);
  // 連續播放自動換歌時,同步畫面上的選取狀態
  useEffect(() => {
    audio.onTrackChange = (id) => setTrackId(id);
    return () => {
      audio.onTrackChange = null;
    };
  }, []);

  const pickTrack = useCallback((id: string) => {
    audio.init();
    audio.click();
    setMusicOff(false);
    setTrackId(id);
    audio.setTrack(id);
    audio.startMusic();
  }, []);

  const stopTrack = useCallback(() => {
    audio.click();
    audio.stopMusic();
    setMusicOff(true);
  }, []);

  useEffect(() => {
    if (!hostRef.current) return;
    const game = createGame(
      hostRef.current,
      {
        onCoins: (n, t) => {
          setCoins(n);
          setTotal(t);
        },
        onZone: (z) => {
          setZone(z);
          setZoneOpen(true);
        },
        onBlock: (title, msg, first) => setToast({ id: Date.now(), title, msg, first }),
        onFlag: (c, t) => setClear({ coins: c, total: t }),
      },
      audio,
    );
    gameRef.current = game;
    return () => {
      game.dispose();
      gameRef.current = null;
    };
  }, []);

  // 主角更換:同步到 3D 引擎並記住選擇
  useEffect(() => {
    gameRef.current?.setCharacter(character);
    try {
      localStorage.setItem("gf-character", character);
    } catch {
      /* 忽略儲存失敗 */
    }
  }, [character]);

  // 走進商店自動開選單,離開自動關
  useEffect(() => {
    if (zone?.shopId) setPanel("shop");
    else setPanel((cur) => (cur === "shop" ? "none" : cur));
  }, [zone]);
  useEffect(() => {
    gameRef.current?.setShopMenuOpen(panel === "shop" && !!shopZone);
  }, [panel, shopZone]);
  // 定期同步增益倒數與庫存
  useEffect(() => {
    if (!started) return;
    const t = setInterval(() => setShopState(gameRef.current?.getShopState() ?? null), 500);
    return () => clearInterval(t);
  }, [started]);
  // F 開關商店選單
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === "KeyF" && zone?.shopId) setPanel((cur) => (cur === "shop" ? "none" : "shop"));
      if (e.key === "Escape") setPanel((cur) => (cur === "shop" ? "none" : cur));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zone]);

  const chooseCharacter = useCallback((id: CharacterId) => {
    audio.init();
    audio.oneUp();
    setCharacter(id);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!started || clear) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [started, clear]);

  const start = useCallback(() => {
    audio.init();
    audio.oneUp();
    if (!musicOff) audio.startMusic();
    gameRef.current?.setActive(true);
    setStarted(true);
  }, [musicOff]);

  const toggleMute = () => {
    audio.init();
    const m = !muted;
    audio.setMuted(m);
    setMuted(m);
  };

  const openPanel = (p: Panel) => {
    audio.click();
    setPanel((cur) => (cur === p ? "none" : p));
  };

  const buyProduct = (pid: string) => {
    const prod = PRODUCTS.find((pd) => pd.id === pid);
    if (!prod || !shopZone) return;
    const price = priceFor(shopZone.id, pid);
    const res = gameRef.current?.purchase(pid, price);
    if (res?.ok) {
      setToast({ id: Date.now(), title: "已購買" + prod.name, msg: prod.effectText + "。" + prod.desc, first: false });
      setShopState(gameRef.current?.getShopState() ?? null);
    } else {
      setToast({ id: Date.now(), title: "金幣不夠!", msg: prod.name + "要 " + price + " 枚金幣,再去校園收集吧~", first: false });
    }
  };

  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div ref={hostRef} className="absolute inset-0" />

      {/* HUD */}
      {started && (
        <>
          <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-wrap items-start gap-x-5 gap-y-1 max-sm:top-[62px] max-sm:max-w-[calc(100%-158px)] max-sm:gap-x-3 sm:gap-x-8">
            <div>
              <div className="hud-text text-[11px] sm:text-xs">{charDef.name}</div>
              <div className="hud-text text-lg leading-none sm:text-2xl">
                <span className="text-[#ffd21f]">●</span> ×{String(coins).padStart(3, "0")}
                <span className="text-xs opacity-80">/{total + 0}</span>
              </div>
            </div>
            <div className="max-[380px]:hidden">
              <div className="hud-text text-[11px] sm:text-xs">WORLD</div>
              <div className="hud-text text-lg leading-none sm:text-2xl">光復 1-1</div>
            </div>
            <div>
              <div className="hud-text text-[11px] sm:text-xs">TIME</div>
              <div className="hud-text text-lg leading-none sm:text-2xl">{mmss}</div>
            </div>
            {shopState && shopState.buffs.length > 0 && (
              <div className="hud-text flex w-full items-center gap-1.5 text-[11px] sm:text-xs">
                {shopState.buffs.map((b) => (
                  <span key={b.id} className="rounded-full bg-black/45 px-2 py-0.5">
                    {b.emoji} {b.label} {b.remain}s
                  </span>
                ))}
              </div>
            )}
            {!musicOff && (
              <div className="hud-text flex w-full items-center gap-1.5 text-[11px] sm:text-xs">
                <span className="eq" style={{ color: track.color }}>
                  <i /><i /><i />
                </span>
                {track.emoji} {track.name}
              </div>
            )}
          </div>

          <div className="absolute right-3 top-3 z-10 flex gap-2 max-sm:gap-1.5">
            <button className="btn-mario flex items-center gap-1" style={{ background: "#1fa6a0" }} onClick={() => openPanel("music")} title="選擇音樂">
              <Music size={16} strokeWidth={2.6} /> <span className="hidden sm:inline">音樂</span>
            </button>
            <button className="btn-mario flex items-center gap-1" style={{ background: "#ff5d8f" }} onClick={() => openPanel("characters")} title="更換主角">
              <Shirt size={16} strokeWidth={2.6} /> <span className="hidden sm:inline">換主角</span>
            </button>
            <button className="btn-mario flex items-center gap-1" style={{ background: "#2f6fe0" }} onClick={() => openPanel("places")} title="地點傳送">
              <MapPin size={16} aria-hidden="true" /> <span className="hidden sm:inline">傳送水管</span>
            </button>
            <button className="btn-mario flex items-center gap-1" style={{ background: "#f38020" }} onClick={() => openPanel("deploy")} title="部署教學">
              <Rocket size={16} aria-hidden="true" /> <span className="hidden sm:inline">部署</span>
            </button>
            <button className="btn-mario" style={{ background: "#a574e8" }} onClick={() => openPanel("help")} title="操作說明">
              <CircleHelp size={16} aria-hidden="true" />
            </button>
            <button className="btn-mario" style={{ background: muted ? "#888" : "#2ea44f" }} onClick={toggleMute} title="音效開關" aria-pressed={muted}>
              {muted ? <VolumeX size={16} aria-hidden="true" /> : <Volume2 size={16} aria-hidden="true" />}
            </button>
          </div>

          {/* 區域資訊卡 */}
          {zone && (
            <div className="absolute bottom-3 left-3 z-10 w-[min(340px,calc(100vw-24px))] sm:bottom-4 max-sm:bottom-48">
              <div className="card card-glass anim-slideup overflow-hidden" key={zone.id}>
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-left"
                  style={{ background: `${zone.color}d9` }}
                  onClick={() => setZoneOpen((v) => !v)}
                >
                  {zone.shopId ? <Store size={21} className="text-white" aria-hidden="true" /> : <span className="text-2xl">{zone.emoji}</span>}
                  <span className="hud-text flex-1 text-lg leading-tight">{zone.name}</span>
                  <span className="hud-text text-sm">{zoneOpen ? "▾" : "▸"}</span>
                </button>
                {zoneOpen && (
                  <div className="space-y-2 p-3 text-[13px]">
                    <div className="inline-block rounded-full bg-[#4a2c0a] px-2 py-0.5 text-[11px] font-bold text-white">{zone.floors}</div>
                    <p className="font-medium leading-relaxed">{zone.desc}</p>
                    <div className="flex flex-wrap gap-1">
                      {zone.rooms.map((r) => (
                        <span key={r} className="rounded-lg border-2 px-1.5 py-0.5 text-[11px] font-bold" style={{ borderColor: zone.color, background: "rgba(255,255,255,0.72)" }}>
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {zone.shopId && (
                  <div className="px-3 pb-3">
                    <button
                      className="btn-mario w-full"
                      style={{ background: zone.color }}
                      onClick={() => {
                        audio.init();
                        if (zone.shopId === "seven") audio.chimeSeven();
                        else audio.click();
                        setPanel("shop");
                      }}
                    >
                      開啟商店選單 <span className="kbd-only">（按 F）</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 問號磚訊息 */}
          {toast && (
            <div className="pointer-events-none absolute left-1/2 top-16 z-20 w-[min(420px,calc(100vw-24px))] -translate-x-1/2 sm:top-20">
              <div className="card card-glass anim-slideup flex items-center gap-3 p-3" key={toast.id}>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border-[3px] border-[#c97a00] bg-[#ffc42e] text-3xl font-black text-[#7a3b00] shadow-[0_4px_0_rgba(0,0,0,0.25)]">
                  ?
                </div>
                <div>
                  <div className="font-black">
                    {toast.title} {toast.first && <span className="text-[#c97a00]">+1 ●</span>}
                  </div>
                  <div className="text-[13px] font-medium leading-snug">{toast.msg}</div>
                </div>
              </div>
            </div>
          )}

          {/* 過關 */}
          {clear && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
              <div className="card anim-slideup max-w-sm p-6 text-center">
                <div className="anim-floaty text-6xl">🏁</div>
                <div className="hud-text mt-2 text-3xl" style={{ color: "#ee2f3b", textShadow: "2px 2px 0 #fff, 0 4px 0 rgba(0,0,0,.2)" }}>
                  COURSE CLEAR!
                </div>
                <p className="mt-2 font-bold">
                  你在 {mmss} 內收集了 <span className="text-[#c97a00]">{clear.coins}</span> / {clear.total} 枚金幣!
                </p>
                <p className="mt-1 text-sm">{clear.coins >= clear.total ? "🌟 全收集!你是光復小英雄!" : "還有金幣沒收集完喔,再去校園逛逛吧~"}</p>
                <div className="mt-4 flex justify-center gap-2">
                  <button
                    className="btn-mario"
                    style={{ background: "#2ea44f" }}
                    onClick={() => {
                      audio.click();
                      setClear(null);
                    }}
                  >
                    繼續探索
                  </button>
                  <button
                    className="btn-mario"
                    style={{ background: "#f38020" }}
                    onClick={() => {
                      setClear(null);
                      setPanel("deploy");
                    }}
                  >
                    🚀 部署教學
                  </button>
                </div>
              </div>
            </div>
          )}

          <TouchControls
            onStick={(x, y) => gameRef.current?.setStick(x, y)}
            onJump={() => gameRef.current?.jump()}
            onRotate={(d) => gameRef.current?.rotateCam(d)}
          />
        </>
      )}

      {/* 傳送水管 */}
      {panel === "places" && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 p-3" onClick={() => setPanel("none")}>
          <div className="card anim-slideup flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="brick-title flex items-center justify-between px-4 py-3">
              <div className="hud-text text-lg">🟩 選一條水管,瞬間移動!</div>
              <button className="btn-mario !px-3 !py-0 text-lg" style={{ background: "#ee2f3b" }} onClick={() => setPanel("none")}>
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 overflow-y-auto p-3 sm:grid-cols-3">
              {ZONES.map((z) => (
                <button
                  key={z.id}
                  className="btn-mario flex flex-col items-center gap-0.5 !px-2 !py-2 text-center"
                  style={{ background: z.color }}
                  onClick={() => {
                    gameRef.current?.teleport(z.id);
                    setPanel("none");
                  }}
                >
                  <span className="text-2xl">{z.emoji}</span>
                  <span className="text-[13px] leading-tight">{z.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 音樂選單 (z-50:開始畫面上也能開) */}
      {panel === "music" && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 p-3" onClick={() => setPanel("none")}>
          <div className="card anim-slideup flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="brick-title flex items-center justify-between px-4 py-3">
              <div className="hud-text flex items-center gap-2 text-lg">
                <Music2 size={20} strokeWidth={2.6} /> 古典管弦配樂
              </div>
              <button className="btn-mario !px-2.5 !py-0.5" style={{ background: "#ee2f3b" }} onClick={() => setPanel("none")} aria-label="關閉">
                <X size={16} strokeWidth={3} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 overflow-y-auto p-3 sm:grid-cols-2">
              {TRACKS.map((t) => {
                const active = !musicOff && t.id === trackId;
                return (
                  <button
                    key={t.id}
                    onClick={() => pickTrack(t.id)}
                    className={`relative flex items-start gap-3 rounded-2xl border-[3px] bg-white/85 p-2.5 text-left transition hover:-translate-y-0.5 ${
                      active ? "border-[#ffd21f]" : "border-white"
                    }`}
                    style={active ? { boxShadow: "0 0 0 3px #ffd21f, 0 5px 0 rgba(0,0,0,0.2)" } : { boxShadow: "0 5px 0 rgba(0,0,0,0.15)" }}
                  >
                    <span
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-[3px] border-white text-2xl"
                      style={{ background: t.color, boxShadow: "0 3px 0 rgba(0,0,0,0.25)" }}
                    >
                      {t.emoji}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-sm font-black leading-tight">
                        {t.name}
                        {active && (
                          <span className="eq" style={{ color: t.color }}>
                            <i /><i /><i /><i />
                          </span>
                        )}
                      </span>
                      <span className="block text-[11px] font-bold leading-tight text-[#c97a00]">
                        {t.style} · {t.bpm} BPM
                      </span>
                      <span className="mt-0.5 block text-[11px] font-medium leading-snug text-[#6b4a26]">{t.desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-3 border-t-[3px] border-white/70 bg-white/40 p-3">
              <label className="flex items-center gap-3 text-sm font-black">
                <span className="w-14 shrink-0">🎚️ 音量</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(musicVol * 100)}
                  onChange={(e) => setMusicVol(Number(e.target.value) / 100)}
                  className="range-mario min-w-0 flex-1"
                  aria-label="音樂音量"
                />
                <span className="w-9 shrink-0 text-right text-xs tabular-nums">{Math.round(musicVol * 100)}%</span>
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  className="btn-mario flex items-center gap-1.5"
                  style={{ background: autoNext ? "#2ea44f" : "#8a8f98" }}
                  onClick={() => {
                    audio.click();
                    setAutoNext((v) => !v);
                  }}
                  aria-pressed={autoNext}
                >
                  <Repeat size={15} strokeWidth={2.8} /> 連續播放:{autoNext ? "開" : "關"}
                </button>
                <button
                  className="btn-mario flex items-center gap-1.5"
                  style={{ background: musicOff ? "#ee2f3b" : "#6b7280" }}
                  onClick={stopTrack}
                  aria-pressed={musicOff}
                >
                  <VolumeX size={15} strokeWidth={2.8} /> {musicOff ? "音樂已關閉" : "關閉音樂"}
                </button>
              </div>
              <p className="text-[11px] font-medium leading-snug text-[#6b4a26]">
                🎮 8 首原創古典曲:鋼琴、長笛、短笛、雙簧管、豎笛、薩克斯風、小喇叭、馬林巴琴、木琴、鐵琴、顫音琴、管鐘、定音鼓與打擊樂,已轉成 WAV 格式播放。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 更換主角 */}
      {panel === "characters" && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 p-3" onClick={() => setPanel("none")}>
          <div className="card anim-slideup flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="brick-title flex items-center justify-between px-4 py-3">
              <div className="hud-text flex items-center gap-2 text-lg">
                <Users size={20} strokeWidth={2.6} /> 選一位主角去冒險!
              </div>
              <button className="btn-mario !px-2.5 !py-0.5" style={{ background: "#ee2f3b" }} onClick={() => setPanel("none")} aria-label="關閉">
                <X size={16} strokeWidth={3} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 overflow-y-auto p-3 sm:grid-cols-3">
              {CHARACTERS.map((c) => {
                const selected = c.id === character;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      chooseCharacter(c.id);
                      setPanel("none");
                    }}
                    className={`relative flex flex-col items-center gap-1 rounded-2xl border-[3px] bg-white/85 px-2 py-3 text-center transition hover:-translate-y-0.5 ${
                      selected ? "border-[#ffd21f]" : "border-white"
                    }`}
                    style={
                      selected
                        ? { boxShadow: "0 0 0 3px #ffd21f, 0 5px 0 rgba(0,0,0,0.2)" }
                        : { boxShadow: "0 5px 0 rgba(0,0,0,0.15)" }
                    }
                  >
                    <span
                      className="relative flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-white text-2xl font-black text-white"
                      style={{
                        background: `linear-gradient(135deg, ${c.gradient[0]}, ${c.gradient[1]})`,
                        textShadow: "0 2px 0 rgba(0,0,0,0.3)",
                        boxShadow: "0 3px 0 rgba(0,0,0,0.25)",
                      }}
                    >
                      {c.avatar}
                      {selected && (
                        <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[#2ea44f] text-white">
                          <Check size={12} strokeWidth={3.5} />
                        </span>
                      )}
                    </span>
                    <span className="text-sm font-black leading-tight">{c.name}</span>
                    <span className="text-[11px] font-bold leading-tight text-[#c97a00]">{c.title}</span>
                    <span className="text-[11px] font-medium leading-snug text-[#6b4a26]">{c.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 商店選單 */}
      {panel === "shop" && shopZone && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 p-3" onClick={() => setPanel("none")}>
          <div
            className="card anim-slideup flex max-h-[88dvh] w-full max-w-xl flex-col overflow-hidden"
            style={isFamily ? { outlineColor: shopZone.color } : undefined}
            role="dialog"
            aria-modal="true"
            aria-labelledby="shop-title"
            onClick={(e) => e.stopPropagation()}
          >
            {isFamily && <div aria-hidden="true" className="h-2.5 shrink-0" style={{ background: FAMILY_MART_GREEN }} />}
            <div className="flex shrink-0 items-center justify-between gap-2 px-4 py-3" style={{ background: isFamily ? "#fff" : shopZone.color }}>
              <h2 id="shop-title" className={isFamily ? "text-lg font-black leading-tight" : "hud-text text-lg"} style={isFamily ? { color: shopZone.color } : undefined}>
                {!isFamily && `${shopZone.emoji} `}{shopZone.name}
              </h2>
              <div className="flex shrink-0 items-center gap-2">
                {(shopZone.id === "seven" || isFamily) && (
                  <button
                    type="button"
                    className="btn-mario flex items-center gap-1.5 !px-2.5 text-xs"
                    style={{ background: isFamily ? shopZone.color : "#f48120" }}
                    onClick={() => {
                      audio.init();
                      if (isFamily) audio.chimeFamily();
                      else audio.chimeSeven();
                    }}
                    aria-label={isFamily ? "重播全家門鈴" : "重播 7-11 門鈴"}
                  >
                    <Bell size={14} aria-hidden="true" /> {isFamily ? "門鈴" : "叮咚"}
                  </button>
                )}
                <button type="button" className="btn-mario !px-2" style={{ background: isFamily ? "#374957" : "#ee2f3b" }} aria-label="關閉商店選單" onClick={() => setPanel("none")}>
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
            {isFamily && <div aria-hidden="true" className="h-1.5 shrink-0" style={{ background: shopZone.color }} />}
            {shopZone.id === "seven" && (
              <div className="flex flex-col">
                <div className="h-1.5 bg-[#f48120]" />
                <div className="h-2 bg-[#008053]" />
                <div className="h-1.5 bg-[#ee2526]" />
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-[3px] border-white/70 bg-white/60 px-4 py-2 text-sm font-black">
              <span className="inline-flex items-center gap-1"><Coins size={16} className="text-[#aa6400]" aria-hidden="true" /> 金幣 <span className="text-[#c97a00]">×{coins}</span></span>
              {saleProd && (
                <span className="rounded-full bg-[#ee2f3b] px-2.5 py-0.5 text-xs text-white">
                  本店特價：{saleProd.name} {shopZone.sale.price} 枚金幣
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 gap-2 overflow-y-auto p-3">
              {PRODUCTS.map((pd) => {
                const price = priceFor(shopZone.id, pd.id);
                const isSale = price < pd.price;
                const afford = coins >= price;
                const count = shopState?.owned[pd.id] ?? 0;
                const ProductIcon = productIcons[pd.id] ?? Store;
                return (
                  <div key={pd.id} className="flex items-center gap-3 rounded-2xl border-[3px] border-white bg-white/85 p-2.5" style={{ boxShadow: "0 5px 0 rgba(0,0,0,0.15)" }}>
                    <ProductIcon size={28} className="shrink-0 text-[#765136]" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-1.5 text-sm font-black leading-tight">
                        {pd.name}
                        {isSale && <span className="rounded-full bg-[#ee2f3b] px-2 py-0.5 text-[11px] text-white">特價!</span>}
                        {count > 0 && <span className="rounded-full bg-[#2ea44f] px-2 py-0.5 text-[11px] text-white">已買 {count}</span>}
                      </span>
                      <span className="block text-[12px] font-bold leading-snug text-[#c97a00]">{pd.effectText}</span>
                      <span className="block text-[11px] font-medium leading-snug text-[#6b4a26]">{pd.desc}</span>
                    </span>
                    <button
                      type="button"
                      className="btn-mario flex shrink-0 items-center gap-1"
                      style={{ background: afford ? "#2ea44f" : "#8a8f98" }}
                      aria-label={`購買${pd.name}（${price} 枚金幣）`}
                      onClick={() => buyProduct(pd.id)}
                    >
                      {isSale && <span className="line-through opacity-70">{pd.price}</span>}
                      <Coins size={14} aria-hidden="true" /> {price}
                    </button>
                  </div>
                );
              })}
            </div>
            <p className="border-t-[3px] border-white/70 bg-white/40 px-4 py-2 text-[11px] font-medium leading-snug text-[#6b4a26]">
              {isFamily ? "關閉選單後可以在店內走動，再從玻璃門離開。" : "效果時間可以疊加刷新。也可以從「傳送水管」直接到店。"}
            </p>
          </div>
        </div>
      )}

      {panel === "deploy" && <DeployGuide onClose={() => setPanel("none")} />}

      {panel === "help" && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 p-3" onClick={() => setPanel("none")}>
          <div className="card anim-slideup w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="brick-title px-4 py-3">
              <div className="hud-text text-lg">❓ 操作說明</div>
            </div>
            <ul className="space-y-1.5 p-4 text-sm font-bold">
              <li><span className="kbd-only">⌨️ WASD / 方向鍵:移動 · Shift:跑步</span><span className="touch-only">🕹️ 左下搖桿移動</span></li>
              <li><span className="kbd-only">␣ 空白鍵:跳躍</span><span className="touch-only">🅰️ 右下按鈕跳躍</span></li>
              <li>🖱️ 拖曳畫面 / Q E:旋轉視角 · 滾輪:縮放</li>
              <li>❓ 從下面跳起來頂問號磚,會顯示校園小知識</li>
              <li>● 收集金幣、⭐ 超級星星(遊戲區彩色積木最高處)</li>
              <li>👧👦 20 位小學生穿著光復夏季運動服(女粉/男藍)與制服在校園散步,校長(西裝+紫領帶)也會巡視校園,靠近他們會揮手打招呼,學生遇到校長還會說「校長好!」</li>
              <li>🏁 跑到終點旗過關(光電球場旁)</li>
              <li>🟩「傳送水管」可以直接跳到各棟大樓</li>
              <li>校外超商可用金幣購物。全家在北二門外，走進玻璃門會響門鈴並開啟選單，也可按 F 開關選單。</li>
              <li>點右上「換主角」可以換成蜘蛛人、小小兵、路易吉、耀西、碧姬公主或奇諾比奧一起冒險</li>
              <li>🎵 點右上「音樂」可以選 8 首古典管弦配樂、調音量、開啟連續播放或關閉音樂</li>
            </ul>
            <div className="px-4 pb-4">
              <button className="btn-mario w-full" style={{ background: "#2ea44f" }} onClick={() => setPanel("none")}>
                知道了!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 開始畫面 */}
      {!started && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-gradient-to-b from-[#4aa8ff]/70 via-[#8fd3ff]/40 to-[#7fdc5a]/70 p-4 text-center backdrop-blur-[2px]">
          <div className="anim-floaty">
            <div className="hud-text text-sm tracking-[0.3em] sm:text-base">新北市中和區 · 115 學年度教室配置</div>
            <h1
              className="mt-1 text-5xl font-black leading-tight sm:text-7xl"
              style={{
                color: "#ee2f3b",
                WebkitTextStroke: "3px #fff",
                textShadow: "0 6px 0 #9f1520, 0 10px 0 rgba(0,0,0,.25)",
                fontFamily: "var(--font-game)",
                paintOrder: "stroke fill",
              }}
            >
              光復國小
            </h1>
            <div
              className="text-3xl font-black sm:text-5xl"
              style={{
                color: "#ffd21f",
                WebkitTextStroke: "2px #7a3b00",
                textShadow: "0 5px 0 #b45f00",
                paintOrder: "stroke fill",
              }}
            >
              3D 校園大冒險
            </div>
          </div>
          <div className="mt-6 flex items-center gap-3 text-4xl sm:text-5xl">
            <span className="anim-floaty">🍄</span>
            <span className="anim-floaty" style={{ animationDelay: "0.2s" }}>⭐</span>
            <span className="anim-floaty" style={{ animationDelay: "0.4s" }}>🪙</span>
            <span className="anim-floaty" style={{ animationDelay: "0.6s" }}>🏁</span>
          </div>
          {/* 選角列 */}
          <div className="mt-6 w-full max-w-xl">
            <div className="hud-text mb-2 flex items-center justify-center gap-2 text-xs sm:text-sm">
              <Shirt size={15} strokeWidth={2.6} /> 選擇主角(遊戲中也能隨時換)
            </div>
            <div className="no-scrollbar flex gap-2 overflow-x-auto px-1 py-1 min-[420px]:justify-center">
              {CHARACTERS.map((c) => {
                const selected = c.id === character;
                return (
                  <button
                    key={c.id}
                    onClick={() => chooseCharacter(c.id)}
                    className={`flex w-[68px] shrink-0 flex-col items-center gap-1 rounded-2xl border-[3px] px-1 py-2 backdrop-blur-sm transition hover:-translate-y-0.5 ${
                      selected ? "border-[#ffd21f] bg-white/85" : "border-white/60 bg-white/55"
                    }`}
                    style={selected ? { boxShadow: "0 0 0 3px #ffd21f, 0 4px 0 rgba(0,0,0,0.2)" } : { boxShadow: "0 4px 0 rgba(0,0,0,0.15)" }}
                    title={`${c.name} · ${c.title}`}
                  >
                    <span
                      className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white text-xl font-black text-white"
                      style={{
                        background: `linear-gradient(135deg, ${c.gradient[0]}, ${c.gradient[1]})`,
                        textShadow: "0 2px 0 rgba(0,0,0,0.3)",
                        boxShadow: "0 2px 0 rgba(0,0,0,0.25)",
                      }}
                    >
                      {c.avatar}
                    </span>
                    <span className="text-[12px] font-black leading-none text-[#4a2c0a]">{c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <button
            className="btn-mario mt-4 flex items-center gap-2 text-sm"
            style={{ background: "#1fa6a0" }}
            onClick={() => openPanel("music")}
          >
            <Music size={16} strokeWidth={2.6} />
            {musicOff ? "音樂:關閉" : `${track.emoji} ${track.name}`}
            <span className="rounded-full bg-white/25 px-2 text-[11px]">換音樂</span>
          </button>
          <button className="btn-mario mt-4 !rounded-2xl !px-10 !py-3 text-2xl sm:text-3xl" style={{ background: "#ee2f3b" }} onClick={start}>
            <span className="anim-blink">▶</span> START
          </button>
          <p className="hud-text mt-5 max-w-md text-xs leading-relaxed sm:text-sm">
            <span className="kbd-only">WASD 移動 · 空白鍵跳躍 · 拖曳旋轉視角</span>
            <span className="touch-only">搖桿移動 · A 跳躍 · 拖曳旋轉視角</span>
            <br />
            🔊 內含 8-bit 音效與 8 首古典管弦背景音樂
            <br />
            👧👦 穿著光復運動服與制服的小學生、還有校長在校園裡散步中!
            <br />
            目前主角:{charDef.name} · {charDef.title}
          </p>
        </div>
      )}
    </div>
  );
}
