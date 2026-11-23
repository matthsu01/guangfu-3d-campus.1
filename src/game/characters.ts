// 主角角色:外觀資料 + 3D 模型建構
// 所有角色共用同一套骨架部位命名 (legL / legR / armL / armR / head),
// 所以 engine 的走路、跳躍、揮手動畫可以直接套用在每位主角身上。

import * as THREE from "three";

export type CharacterId =
  | "xiaoguang"
  | "spiderman"
  | "minion"
  | "luigi"
  | "yoshi"
  | "peach"
  | "toad";

export interface CharacterDef {
  id: CharacterId;
  name: string;
  title: string;
  desc: string;
  /** 選角頭像代表字 */
  avatar: string;
  /** 選角頭像漸層 */
  gradient: [string, string];
}

export const CHARACTERS: CharacterDef[] = [
  {
    id: "xiaoguang",
    name: "小光",
    title: "光復小英雄",
    desc: "光復國小的招牌主角,紅帽子上繡著一個「光」字!",
    avatar: "光",
    gradient: ["#ee2f3b", "#2f6fe0"],
  },
  {
    id: "spiderman",
    name: "蜘蛛人",
    title: "友善鄰里英雄",
    desc: "紅藍戰衣帥氣登場,在校園裡飛簷走壁找金幣!",
    avatar: "蜘",
    gradient: ["#d21f2c", "#274690"],
  },
  {
    id: "minion",
    name: "小小兵",
    title: "香蕉愛好者",
    desc: "Bello!戴著護目鏡的小小兵,最愛香蕉跟冒險。",
    avatar: "兵",
    gradient: ["#ffd21f", "#3b6ea5"],
  },
  {
    id: "luigi",
    name: "路易吉",
    title: "綠色勇者",
    desc: "高個子的綠色勇者,跳得比誰都認真!",
    avatar: "吉",
    gradient: ["#2fae4e", "#2f6fe0"],
  },
  {
    id: "yoshi",
    name: "耀西",
    title: "恐龍好夥伴",
    desc: "綠色小恐龍耀西,踩著橘色靴子在校園散步。",
    avatar: "西",
    gradient: ["#37b24d", "#f38020"],
  },
  {
    id: "peach",
    name: "碧姬公主",
    title: "蘑菇王國公主",
    desc: "戴著皇冠的碧姬公主,優雅地來光復國小參觀!",
    avatar: "姬",
    gradient: ["#ff8fb8", "#ffc928"],
  },
  {
    id: "toad",
    name: "奇諾比奧",
    title: "蘑菇小隊長",
    desc: "頭戴大蘑菇帽的奇諾比奧,元氣滿點衝第一!",
    avatar: "菇",
    gradient: ["#f2475e", "#ffb3c1"],
  },
];

export interface HeroParts {
  legL: THREE.Object3D;
  legR: THREE.Object3D;
  armL: THREE.Object3D;
  armR: THREE.Object3D;
  head: THREE.Object3D;
}

export interface BuiltCharacter {
  inner: THREE.Group;
  parts: HeroParts;
}

// ---------- 小工具 ----------

const M = (color: string | number, extra: THREE.MeshLambertMaterialParameters = {}) =>
  new THREE.MeshLambertMaterial({ color, ...extra });

function sph(r: number, mat: THREE.Material, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 16), mat);
  m.scale.set(sx, sy, sz);
  return m;
}

function box(w: number, h: number, d: number, mat: THREE.Material) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
}

function cyl(rt: number, rb: number, h: number, mat: THREE.Material, seg = 14) {
  return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
}

interface LegOpts {
  hipY?: number;
  len?: number;
  r?: number;
  shoeScale?: [number, number, number];
  shoeY?: number;
}

function mkLeg(x: number, legMat: THREE.Material, shoeMat: THREE.Material, o: LegOpts = {}) {
  const hipY = o.hipY ?? 0.4;
  const len = o.len ?? 0.34;
  const r = o.r ?? 0.13;
  const g = new THREE.Group();
  g.position.set(x, hipY, 0);
  const l = cyl(r, r * 1.05, len, legMat, 12);
  l.position.y = -len / 2 + 0.05;
  const shoe = sph(0.19, shoeMat, ...(o.shoeScale ?? [1, 0.7, 1.35]));
  shoe.position.set(0, o.shoeY ?? -len - 0.03, 0.06);
  g.add(l, shoe);
  return g;
}

interface ArmOpts {
  shoulderY?: number;
  len?: number;
  r?: number;
  handR?: number;
  sleeve?: THREE.Material;
}

function mkArm(x: number, armMat: THREE.Material, handMat: THREE.Material, o: ArmOpts = {}) {
  const len = o.len ?? 0.34;
  const r = o.r ?? 0.1;
  const g = new THREE.Group();
  g.position.set(x, o.shoulderY ?? 1.0, 0);
  if (o.sleeve) {
    const puff = sph(0.15, o.sleeve);
    puff.position.y = -0.02;
    g.add(puff);
  }
  const a = cyl(r, r * 1.1, len, armMat, 12);
  a.position.y = -len / 2 - 0.02;
  const hand = sph(o.handR ?? 0.13, handMat);
  hand.position.y = -len - 0.08;
  g.add(a, hand);
  return g;
}

function addEyes(
  head: THREE.Group,
  x: number,
  y: number,
  z: number,
  color = "#1a1a1a",
  r = 0.6,
) {
  const white = M("#ffffff");
  const mat = M(color);
  for (const sx of [-1, 1]) {
    const e = sph(0.065 * r + 0.035, mat, 1, 1.6, 0.6);
    e.position.set(sx * x, y, z);
    const shine = sph(0.02, white);
    shine.position.set(sx * x + 0.012, y + 0.05, z + 0.035);
    head.add(e, shine);
  }
}

function badgeTexture(draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  draw(g);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function letterBadge(letter: string, fg: string, r = 0.15) {
  const tex = badgeTexture((g) => {
    g.fillStyle = "#ffffff";
    g.beginPath();
    g.arc(64, 64, 60, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = fg;
    g.font = "900 74px 'Noto Sans TC','Microsoft JhengHei',sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(letter, 64, 68);
  });
  return new THREE.Mesh(
    new THREE.CircleGeometry(r, 24),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true }),
  );
}

// ---------- 小光 (原版主角) ----------

function buildXiaoguang(): BuiltCharacter {
  const inner = new THREE.Group();
  const skin = M("#ffd0a3");
  const red = M("#ee2f3b");
  const blue = M("#2f6fe0");
  const brown = M("#6a3a1c");
  const white = M("#ffffff");

  const belly = sph(0.4, blue, 1, 0.95, 0.95);
  belly.position.y = 0.62;
  const chest = sph(0.32, red, 1.05, 0.85, 0.9);
  chest.position.y = 0.95;
  const bib = sph(0.28, blue, 0.95, 0.75, 0.7);
  bib.position.set(0, 0.88, 0.14);
  inner.add(belly, chest, bib);
  for (const sx of [-0.14, 0.14]) {
    const btn = sph(0.05, M("#ffd21f"));
    btn.position.set(sx, 0.9, 0.4);
    inner.add(btn);
  }

  const legL = mkLeg(-0.16, blue, brown, { r: 0.14 });
  const legR = mkLeg(0.16, blue, brown, { r: 0.14 });
  const armL = mkArm(-0.42, red, white);
  const armR = mkArm(0.42, red, white);
  inner.add(legL, legR, armL, armR);

  const head = new THREE.Group();
  head.position.y = 1.5;
  const face = sph(0.4, skin, 1.05, 0.95, 1);
  const hair = sph(0.36, brown, 1.05, 0.8, 0.9);
  hair.position.set(0, -0.05, -0.12);
  const nose = sph(0.12, M("#ffb48a"));
  nose.position.set(0, -0.05, 0.4);
  head.add(face, hair, nose);
  addEyes(head, 0.14, 0.08, 0.35);
  for (const sx of [-1, 1]) {
    const ear = sph(0.1, skin, 0.6, 1, 1);
    ear.position.set(sx * 0.42, -0.02, 0);
    const mus = sph(0.1, brown, 1.3, 0.7, 0.8);
    mus.position.set(sx * 0.1, -0.2, 0.36);
    const cheek = sph(0.07, M("#ff9a9a"), 1.2, 0.7, 0.4);
    cheek.position.set(sx * 0.27, -0.08, 0.3);
    head.add(ear, mus, cheek);
  }
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.44, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2),
    red,
  );
  cap.scale.set(1.05, 1.0, 1.05);
  cap.position.set(0, 0.1, -0.02);
  cap.rotation.x = -0.15;
  const brim = cyl(0.34, 0.38, 0.06, red, 20);
  brim.position.set(0, 0.16, 0.18);
  brim.scale.set(1.2, 1, 1.1);
  brim.rotation.x = 0.1;
  const emblem = letterBadge("光", "#ee2f3b");
  emblem.position.set(0, 0.36, 0.34);
  emblem.rotation.x = -0.45;
  head.add(cap, brim, emblem);
  inner.add(head);

  return { inner, parts: { legL, legR, armL, armR, head } };
}

// ---------- 路易吉 ----------

function buildLuigi(): BuiltCharacter {
  const inner = new THREE.Group();
  const skin = M("#ffd0a3");
  const green = M("#2fae4e");
  const blue = M("#2f6fe0");
  const brown = M("#6a3a1c");
  const darkBrown = M("#3a2313");
  const white = M("#ffffff");

  const belly = sph(0.38, blue, 1, 0.95, 0.95);
  belly.position.y = 0.68;
  const chest = sph(0.3, green, 1.05, 0.85, 0.9);
  chest.position.y = 1.02;
  const bib = sph(0.26, blue, 0.95, 0.75, 0.7);
  bib.position.set(0, 0.95, 0.13);
  inner.add(belly, chest, bib);
  for (const sx of [-0.13, 0.13]) {
    const btn = sph(0.05, M("#ffd21f"));
    btn.position.set(sx, 0.97, 0.38);
    inner.add(btn);
  }

  // 路易吉比較高:腿長一點
  const legL = mkLeg(-0.15, blue, brown, { hipY: 0.48, len: 0.42, r: 0.12 });
  const legR = mkLeg(0.15, blue, brown, { hipY: 0.48, len: 0.42, r: 0.12 });
  const armL = mkArm(-0.4, green, white, { shoulderY: 1.08 });
  const armR = mkArm(0.4, green, white, { shoulderY: 1.08 });
  inner.add(legL, legR, armL, armR);

  const head = new THREE.Group();
  head.position.y = 1.6;
  const face = sph(0.38, skin, 1, 1.0, 0.98);
  const hair = sph(0.34, darkBrown, 1.02, 0.8, 0.9);
  hair.position.set(0, -0.04, -0.12);
  const nose = sph(0.13, M("#ffb48a"));
  nose.position.set(0, -0.04, 0.38);
  head.add(face, hair, nose);
  addEyes(head, 0.13, 0.09, 0.33);
  // 招牌八字鬍
  const mus = sph(0.11, darkBrown, 1.9, 0.6, 0.75);
  mus.position.set(0, -0.19, 0.35);
  head.add(mus);
  for (const sx of [-1, 1]) {
    const ear = sph(0.09, skin, 0.6, 1, 1);
    ear.position.set(sx * 0.39, -0.02, 0);
    const burn = sph(0.08, darkBrown, 0.6, 1.3, 0.8);
    burn.position.set(sx * 0.37, 0.08, 0.02);
    const cheek = sph(0.06, M("#ff9a9a"), 1.2, 0.7, 0.4);
    cheek.position.set(sx * 0.25, -0.08, 0.29);
    head.add(ear, burn, cheek);
  }
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2),
    green,
  );
  cap.scale.set(1.05, 1.0, 1.05);
  cap.position.set(0, 0.1, -0.02);
  cap.rotation.x = -0.15;
  const brim = cyl(0.33, 0.37, 0.06, green, 20);
  brim.position.set(0, 0.16, 0.18);
  brim.scale.set(1.2, 1, 1.1);
  brim.rotation.x = 0.1;
  const emblem = letterBadge("L", "#2fae4e");
  emblem.position.set(0, 0.35, 0.33);
  emblem.rotation.x = -0.45;
  head.add(cap, brim, emblem);
  inner.add(head);

  return { inner, parts: { legL, legR, armL, armR, head } };
}

// ---------- 蜘蛛人 ----------

function buildSpiderman(): BuiltCharacter {
  const inner = new THREE.Group();
  const red = M("#d21f2c");
  const blue = M("#274690");
  const white = M("#ffffff");
  const black = M("#14161c");

  const belly = sph(0.38, blue, 1, 0.9, 0.92);
  belly.position.y = 0.64;
  const chest = sph(0.33, red, 1.08, 0.9, 0.92);
  chest.position.y = 0.97;
  inner.add(belly, chest);

  // 胸口蜘蛛標誌 (canvas 繪製)
  const spiderTex = badgeTexture((g) => {
    g.strokeStyle = "#14161c";
    g.fillStyle = "#14161c";
    g.lineWidth = 6;
    g.lineCap = "round";
    for (const s of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const a = -0.5 + i * 0.42;
        g.beginPath();
        g.moveTo(64 + s * 6, 62);
        g.quadraticCurveTo(
          64 + s * (26 + i * 4),
          62 + Math.sin(a) * 26 - 8,
          64 + s * (38 + i * 5),
          62 + Math.sin(a) * 40,
        );
        g.stroke();
      }
    }
    g.beginPath();
    g.ellipse(64, 74, 10, 17, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(64, 50, 8, 0, Math.PI * 2);
    g.fill();
  });
  const spider = new THREE.Mesh(
    new THREE.CircleGeometry(0.17, 24),
    new THREE.MeshBasicMaterial({ map: spiderTex, transparent: true }),
  );
  spider.position.set(0, 0.98, 0.315);
  inner.add(spider);

  const legL = mkLeg(-0.16, blue, red, { r: 0.13, shoeScale: [1, 0.75, 1.4] });
  const legR = mkLeg(0.16, blue, red, { r: 0.13, shoeScale: [1, 0.75, 1.4] });
  const armL = mkArm(-0.42, red, red);
  const armR = mkArm(0.42, red, red);
  inner.add(legL, legR, armL, armR);

  // 紅色面罩頭 + 大白眼睛
  const head = new THREE.Group();
  head.position.y = 1.5;
  const mask = sph(0.4, red, 1.02, 0.98, 1);
  head.add(mask);
  for (const sx of [-1, 1]) {
    const outline = sph(0.115, black, 1, 1.55, 0.4);
    outline.position.set(sx * 0.15, 0.07, 0.345);
    outline.rotation.z = sx * -0.15;
    const eyeW = sph(0.095, white, 1, 1.5, 0.42);
    eyeW.position.set(sx * 0.15, 0.07, 0.365);
    eyeW.rotation.z = sx * -0.15;
    head.add(outline, eyeW);
  }
  inner.add(head);

  return { inner, parts: { legL, legR, armL, armR, head } };
}

// ---------- 小小兵 ----------

function buildMinion(): BuiltCharacter {
  const inner = new THREE.Group();
  const yellow = M("#ffd21f");
  const denim = M("#3b6ea5");
  const black = M("#1c1c22");
  const grey = M("#9aa3ad");
  const white = M("#ffffff");

  // 黃色膠囊身體
  const bodyMid = cyl(0.335, 0.335, 0.42, yellow, 20);
  bodyMid.position.y = 0.78;
  const bodyTop = sph(0.335, yellow);
  bodyTop.position.y = 0.99;
  const bodyBot = sph(0.335, yellow, 1, 0.75, 1);
  bodyBot.position.y = 0.58;
  inner.add(bodyMid, bodyTop, bodyBot);

  // 牛仔吊帶褲
  const pants = cyl(0.345, 0.35, 0.3, denim, 20);
  pants.position.y = 0.6;
  const bibF = box(0.3, 0.26, 0.07, denim);
  bibF.position.set(0, 0.82, 0.29);
  inner.add(pants, bibF);
  for (const sx of [-1, 1]) {
    const strap = box(0.09, 0.3, 0.05, denim);
    strap.position.set(sx * 0.17, 0.95, 0.26);
    strap.rotation.z = sx * -0.35;
    const btn = sph(0.035, black);
    btn.position.set(sx * 0.11, 0.92, 0.33);
    inner.add(strap, btn);
  }

  // 短短的腿 + 黑鞋
  const legL = mkLeg(-0.13, denim, black, {
    hipY: 0.28,
    len: 0.16,
    r: 0.09,
    shoeScale: [0.62, 0.42, 0.95],
    shoeY: -0.2,
  });
  const legR = mkLeg(0.13, denim, black, {
    hipY: 0.28,
    len: 0.16,
    r: 0.09,
    shoeScale: [0.62, 0.42, 0.95],
    shoeY: -0.2,
  });
  const armL = mkArm(-0.36, yellow, black, { shoulderY: 0.82, len: 0.26, r: 0.07, handR: 0.1 });
  const armR = mkArm(0.36, yellow, black, { shoulderY: 0.82, len: 0.26, r: 0.07, handR: 0.1 });
  inner.add(legL, legR, armL, armR);

  // 頭部(護目鏡大眼睛) — head 群組帶著眼睛一起微微擺動
  const head = new THREE.Group();
  head.position.y = 1.02;
  const goggle = new THREE.Mesh(new THREE.TorusGeometry(0.165, 0.045, 10, 28), grey);
  goggle.position.set(0, 0.14, 0.29);
  const eyeW = sph(0.145, white);
  eyeW.position.set(0, 0.14, 0.28);
  const iris = sph(0.075, M("#7a4a21"));
  iris.position.set(0, 0.14, 0.4);
  const pupil = sph(0.04, black);
  pupil.position.set(0, 0.14, 0.45);
  const shine = sph(0.018, white);
  shine.position.set(0.03, 0.19, 0.47);
  head.add(goggle, eyeW, iris, pupil, shine);
  for (const sx of [-1, 1]) {
    const strap = box(0.1, 0.08, 0.3, black);
    strap.position.set(sx * 0.32, 0.14, 0.08);
    head.add(strap);
  }
  // 微笑嘴巴
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.016, 8, 20, Math.PI), black);
  mouth.position.set(0, -0.06, 0.315);
  mouth.rotation.z = Math.PI;
  mouth.rotation.x = -0.15;
  head.add(mouth);
  // 頭頂幾根頭髮
  for (const [hx, tilt] of [[-0.06, 0.35], [0, 0], [0.06, -0.35]] as const) {
    const hair = cyl(0.012, 0.012, 0.17, black, 6);
    hair.position.set(hx, 0.38, 0);
    hair.rotation.z = tilt;
    head.add(hair);
  }
  inner.add(head);

  return { inner, parts: { legL, legR, armL, armR, head } };
}

// ---------- 耀西 ----------

function buildYoshi(): BuiltCharacter {
  const inner = new THREE.Group();
  const green = M("#37b24d");
  const cream = M("#fff6e0");
  const orange = M("#f38020");
  const white = M("#ffffff");
  const black = M("#14161c");

  // 身體 + 白肚子 + 紅鞍
  const body = sph(0.36, green, 1, 1.05, 0.95);
  body.position.y = 0.72;
  const bellyW = sph(0.27, cream, 0.9, 1.05, 0.62);
  bellyW.position.set(0, 0.68, 0.17);
  const saddle = sph(0.23, M("#e03131"), 1.05, 0.5, 1.05);
  saddle.position.set(0, 0.95, -0.17);
  inner.add(body, bellyW, saddle);
  // 尾巴
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.32, 12), green);
  tail.position.set(0, 0.52, -0.42);
  tail.rotation.x = 2.25;
  inner.add(tail);

  const legL = mkLeg(-0.16, green, orange, { hipY: 0.42, len: 0.3, r: 0.12, shoeScale: [1.05, 0.68, 1.6] });
  const legR = mkLeg(0.16, green, orange, { hipY: 0.42, len: 0.3, r: 0.12, shoeScale: [1.05, 0.68, 1.6] });
  const armL = mkArm(-0.35, green, green, { shoulderY: 0.9, len: 0.27, r: 0.09, handR: 0.11 });
  const armR = mkArm(0.35, green, green, { shoulderY: 0.9, len: 0.27, r: 0.09, handR: 0.11 });
  inner.add(legL, legR, armL, armR);

  // 大頭 + 長鼻子
  const head = new THREE.Group();
  head.position.y = 1.34;
  const skull = sph(0.34, green, 1, 0.95, 1.05);
  skull.position.y = 0.05;
  const snout = sph(0.21, cream, 1.15, 0.72, 1.5);
  snout.position.set(0, -0.08, 0.32);
  const noseTop = sph(0.2, green, 1.1, 0.78, 1.1);
  noseTop.position.set(0, 0.05, 0.3);
  head.add(skull, snout, noseTop);
  for (const sx of [-1, 1]) {
    const nostril = sph(0.032, black);
    nostril.position.set(sx * 0.07, 0.14, 0.47);
    // 凸凸的大眼睛
    const eyeW = sph(0.105, white, 0.85, 1.35, 0.85);
    eyeW.position.set(sx * 0.13, 0.34, 0.1);
    const pupil = sph(0.052, black, 0.7, 1.3, 0.5);
    pupil.position.set(sx * 0.13, 0.36, 0.19);
    const shine = sph(0.018, white);
    shine.position.set(sx * 0.13 + 0.015, 0.42, 0.22);
    const cheek = sph(0.07, orange, 1.1, 0.7, 0.5);
    cheek.position.set(sx * 0.29, -0.06, 0.18);
    head.add(nostril, eyeW, pupil, shine, cheek);
  }
  // 頭後橘色小刺
  for (let i = 0; i < 3; i++) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.13, 8), orange);
    spike.position.set(0, 0.3 - i * 0.04, -0.18 - i * 0.09);
    spike.rotation.x = -0.7 - i * 0.25;
    head.add(spike);
  }
  inner.add(head);

  return { inner, parts: { legL, legR, armL, armR, head } };
}

// ---------- 碧姬公主 ----------

function buildPeach(): BuiltCharacter {
  const inner = new THREE.Group();
  const skin = M("#ffd9b8");
  const pink = M("#ff9ec4");
  const pinkDark = M("#ff6fa5");
  const gold = M("#ffc928");
  const hairM = M("#ffd94d");
  const white = M("#ffffff");

  // 蓬蓬裙
  const dress = cyl(0.24, 0.52, 0.85, pink, 22);
  dress.position.y = 0.62;
  const hem = cyl(0.5, 0.55, 0.12, pinkDark, 22);
  hem.position.y = 0.24;
  const waist = sph(0.26, pink, 1, 0.7, 0.9);
  waist.position.y = 1.04;
  inner.add(dress, hem, waist);
  // 胸口寶石
  const gem = sph(0.07, M("#5cc8f0"), 0.8, 1.15, 0.5);
  gem.position.set(0, 1.13, 0.25);
  const gemShine = sph(0.02, white);
  gemShine.position.set(0.02, 1.17, 0.29);
  inner.add(gem, gemShine);

  const legL = mkLeg(-0.13, white, pinkDark, { hipY: 0.38, len: 0.28, r: 0.08, shoeScale: [0.75, 0.45, 1.05], shoeY: -0.31 });
  const legR = mkLeg(0.13, white, pinkDark, { hipY: 0.38, len: 0.28, r: 0.08, shoeScale: [0.75, 0.45, 1.05], shoeY: -0.31 });
  const armL = mkArm(-0.3, skin, skin, { shoulderY: 1.18, len: 0.28, r: 0.07, handR: 0.09, sleeve: pink });
  const armR = mkArm(0.3, skin, skin, { shoulderY: 1.18, len: 0.28, r: 0.07, handR: 0.09, sleeve: pink });
  inner.add(legL, legR, armL, armR);

  const head = new THREE.Group();
  head.position.y = 1.52;
  const face = sph(0.33, skin, 1, 1.05, 0.95);
  const hairBack = sph(0.36, hairM, 1.05, 1.12, 1);
  hairBack.position.set(0, 0.04, -0.09);
  const bangs = sph(0.29, hairM, 1.12, 0.68, 0.9);
  bangs.position.set(0, 0.2, 0.1);
  head.add(hairBack, face, bangs);
  for (const sx of [-1, 1]) {
    const lock = sph(0.12, hairM, 0.7, 1.7, 0.7);
    lock.position.set(sx * 0.33, -0.15, 0.04);
    const eyeB = sph(0.05, M("#2a4d9b"), 0.8, 1.5, 0.5);
    eyeB.position.set(sx * 0.12, 0.05, 0.3);
    const shine = sph(0.016, white);
    shine.position.set(sx * 0.12 + 0.012, 0.09, 0.325);
    const cheek = sph(0.06, M("#ffb3c1"), 1.2, 0.7, 0.4);
    cheek.position.set(sx * 0.21, -0.07, 0.26);
    head.add(lock, eyeB, shine, cheek);
  }
  const lips = sph(0.045, M("#ff5d7a"), 1.4, 0.6, 0.5);
  lips.position.set(0, -0.14, 0.31);
  head.add(lips);
  // 皇冠
  const crown = cyl(0.13, 0.16, 0.13, gold, 12);
  crown.position.set(0, 0.44, 0);
  head.add(crown);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.1, 8), gold);
    tip.position.set(Math.cos(a) * 0.13, 0.54, Math.sin(a) * 0.13);
    head.add(tip);
  }
  const gemF = sph(0.035, M("#f2475e"));
  gemF.position.set(0, 0.44, 0.16);
  head.add(gemF);
  for (const sx of [-1, 1]) {
    const gemS = sph(0.03, M("#5cc8f0"));
    gemS.position.set(sx * 0.15, 0.44, 0.02);
    head.add(gemS);
  }
  inner.add(head);

  return { inner, parts: { legL, legR, armL, armR, head } };
}

// ---------- 奇諾比奧 ----------

function buildToad(): BuiltCharacter {
  const inner = new THREE.Group();
  const skin = M("#ffe3c2");
  const white = M("#ffffff");
  const blue = M("#2f6fe0");
  const cream = M("#fff3d6");
  const red = M("#f2475e");
  const brown = M("#8a5a2b");

  // 白色蓬褲 + 藍背心
  const pants = sph(0.3, white, 1.1, 0.78, 0.95);
  pants.position.y = 0.46;
  const torso = sph(0.25, blue, 1, 0.95, 0.9);
  torso.position.y = 0.74;
  const bib = sph(0.2, cream, 0.85, 0.9, 0.6);
  bib.position.set(0, 0.73, 0.12);
  const belt = cyl(0.27, 0.28, 0.07, M("#ffc928"), 16);
  belt.position.y = 0.58;
  inner.add(pants, torso, bib, belt);

  const legL = mkLeg(-0.14, white, brown, { hipY: 0.34, len: 0.2, r: 0.1, shoeScale: [0.85, 0.5, 1.2], shoeY: -0.24 });
  const legR = mkLeg(0.14, white, brown, { hipY: 0.34, len: 0.2, r: 0.1, shoeScale: [0.85, 0.5, 1.2], shoeY: -0.24 });
  const armL = mkArm(-0.28, skin, skin, { shoulderY: 0.84, len: 0.25, r: 0.07, handR: 0.09 });
  const armR = mkArm(0.28, skin, skin, { shoulderY: 0.84, len: 0.25, r: 0.07, handR: 0.09 });
  inner.add(legL, legR, armL, armR);

  // 大蘑菇帽頭
  const head = new THREE.Group();
  head.position.y = 1.0;
  const face = sph(0.26, skin, 1.05, 0.92, 0.95);
  face.position.y = 0.0;
  const cap = sph(0.46, white, 1.12, 0.74, 1.12);
  cap.position.y = 0.2;
  head.add(face, cap);
  // 紅色斑點
  const spots: Array<[number, number, number, number]> = [
    [0, 0.52, 0.3, 0],
    [-0.32, 0.42, 0.2, 0.5],
    [0.32, 0.42, 0.2, -0.5],
    [0.14, 0.56, -0.12, 0],
    [-0.18, 0.44, -0.3, 0],
    [0.05, 0.34, 0.44, 0],
  ];
  for (const [sx, sy, sz, rz] of spots) {
    const spot = sph(0.105, red, 1, 0.45, 1);
    spot.position.set(sx, sy, sz);
    spot.rotation.z = rz;
    spot.rotation.x = sz > 0.3 ? 0.7 : 0.2;
    head.add(spot);
  }
  addEyes(head, 0.1, 0.0, 0.235, "#1a1a1a", 0.55);
  const mouth = sph(0.045, M("#8a4b2a"), 1.3, 0.55, 0.4);
  mouth.position.set(0, -0.09, 0.24);
  head.add(mouth);
  for (const sx of [-1, 1]) {
    const cheek = sph(0.055, M("#ffb3c1"), 1.2, 0.7, 0.4);
    cheek.position.set(sx * 0.18, -0.05, 0.2);
    head.add(cheek);
  }
  inner.add(head);

  return { inner, parts: { legL, legR, armL, armR, head } };
}

// ---------- 入口 ----------

const BUILDERS: Record<CharacterId, () => BuiltCharacter> = {
  xiaoguang: buildXiaoguang,
  spiderman: buildSpiderman,
  minion: buildMinion,
  luigi: buildLuigi,
  yoshi: buildYoshi,
  peach: buildPeach,
  toad: buildToad,
};

export function buildCharacterModel(id: CharacterId): BuiltCharacter {
  return (BUILDERS[id] ?? BUILDERS.xiaoguang)();
}
