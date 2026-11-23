import * as THREE from "three";
import { len, px2x, py2z } from "./data";
import { FAMILY_MART, FAMILY_MART_GREEN } from "./shops";

type Position = { x: number; y: number; z: number };
type Obstacle = { top: number; test: (x: number, z: number, radius: number) => boolean };

function lightbox(width: number, height: number, paint: (g: CanvasRenderingContext2D) => void, hasChinese = false) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const g = canvas.getContext("2d")!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  paint(g);
  if (hasChinese) {
    void document.fonts.load('900 90px "Noto Sans TC"', "全家").then((fonts) => {
      if (!fonts.length) return;
      paint(g);
      texture.needsUpdate = true;
    }).catch(() => {});
  }
  return new THREE.MeshBasicMaterial({ map: texture });
}

export function buildFamilyMart() {
  const { building, color: blue, sign } = FAMILY_MART;
  const w = len(building.x1 - building.x0);
  const d = len(building.y1 - building.y0);
  const cx = px2x((building.x0 + building.x1) / 2);
  const frontZ = py2z(building.y1);
  const group = new THREE.Group();
  group.name = "FamilyMart";
  group.position.set(cx, 0, frontZ);

  // Local +Z faces the north gate; the entrance is at z = 0.
  const obstacles: Obstacle[] = [];
  const bound = (x0: number, z0: number, x1: number, z1: number, top: number) => {
    obstacles.push({ top, test: (x, z, r) =>
      x > cx + x0 - r && x < cx + x1 + r && z > frontZ + z0 - r && z < frontZ + z1 + r });
  };
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const lambert = (color: string) => new THREE.MeshLambertMaterial({ color });
  const wood = lambert("#533b30");
  const deep = lambert("#2a3337");
  const steel = lambert("#adaead");
  const white = lambert("#eeeeec");
  const plaster = lambert("#d9c5a6");
  const floor = lambert("#e2dacb");
  const green = new THREE.MeshBasicMaterial({ color: FAMILY_MART_GREEN });
  const stripe = new THREE.MeshBasicMaterial({ color: blue });
  const light = new THREE.MeshBasicMaterial({ color: "#fff1cc" });
  const glass = new THREE.MeshBasicMaterial({ color: "#bbddea", transparent: true, opacity: 0.19, depthWrite: false });
  const reflection = new THREE.MeshBasicMaterial({ color: "#fffdf2", transparent: true, opacity: 0.22, depthWrite: false });

  const box = (parent: THREE.Object3D, mat: THREE.Material | THREE.Material[],
    width: number, height: number, depth: number, x: number, y: number, z: number, shadow = false) => {
    const mesh = new THREE.Mesh(unitBox, mat);
    mesh.scale.set(width, height, depth);
    mesh.position.set(x, y, z);
    mesh.castShadow = shadow;
    mesh.receiveShadow = shadow;
    parent.add(mesh);
    return mesh;
  };

  const wallH = 2.46;
  const wallT = 0.18;
  box(group, floor, w, 0.06, d, 0, 0.03, -d / 2).receiveShadow = true;
  for (const side of [-1, 1]) {
    const x = side * (w - wallT) / 2;
    box(group, wood, wallT, wallH, d, x, wallH / 2, -d / 2, true);
    bound(x - wallT / 2, -d, x + wallT / 2, 0.08, 3.42);
  }
  box(group, plaster, w, wallH, wallT, 0, wallH / 2, -d + wallT / 2, true);
  bound(-w / 2, -d, w / 2, -d + wallT, 3.42);

  const upper = new THREE.Group();
  group.add(upper);
  box(upper, deep, w + 0.25, 0.14, d + 0.36, 0, 3.73, -d / 2, true);
  box(upper, deep, w, 0.52, 0.20, 0, 3.40, -0.10);
  box(upper, wood, w, 1.20, wallT, 0, 3.06, -d + wallT / 2);
  for (const side of [-1, 1]) box(upper, wood, wallT, 1.20, d, side * (w - wallT) / 2, 3.06, -d / 2);
  for (let i = 0; i < 6; i++) {
    const x = (i - 2.5) * (w / 5.6);
    box(upper, wood, 0.15, 0.52, 0.21, x, 3.40, -0.08);
  }

  const fascia = lightbox(1280, 210, (g) => {
    g.fillStyle = "#f8faf8";
    g.fillRect(0, 0, 1280, 210);
    g.fillStyle = FAMILY_MART_GREEN;
    g.fillRect(0, 0, 1280, 54);
    g.fillStyle = blue;
    g.fillRect(0, 189, 1280, 21);
    const chinese = '900 90px "Noto Sans TC", "Microsoft JhengHei", "Noto Sans CJK TC", sans-serif';
    const english = 'bold 102px Arial, sans-serif';
    g.textBaseline = "middle";
    g.textAlign = "left";
    g.font = chinese;
    const leading = g.measureText("全家").width + 26;
    g.font = english;
    const x = (1280 - leading - g.measureText(sign).width) / 2 + 16;
    const wordmark = (tint: string, offset: number) => {
      g.fillStyle = tint;
      g.font = chinese;
      g.fillText("全家", x + offset, 119 + offset);
      g.font = english;
      g.fillText(sign, x + leading + offset, 122 + offset);
    };
    wordmark("#bacdd4", 6);
    wordmark(blue, 0);
  }, true);
  box(group, [white, white, white, white, fascia, white], w + 0.12, 0.98, 0.23, 0, 2.81, 0.10);
  for (const side of [-1, 1]) {
    const x = side * (w / 2 + 0.04);
    box(group, white, 0.09, 0.98, 1.0, x, 2.81, -0.33);
    box(group, green, 0.10, 0.25, 1.0, x, 3.175, -0.33);
    box(group, stripe, 0.10, 0.098, 1.0, x, 2.369, -0.33);
  }
  box(group, steel, w + 0.20, 0.085, 0.55, 0, 2.315, 0.14);
  box(group, light, w - 0.46, 0.025, 0.10, 0, 2.265, 0.27);

  const bladeFace = lightbox(352, 384, (g) => {
    g.fillStyle = "#f8faf9";
    g.fillRect(0, 0, 352, 384);
    g.fillStyle = FAMILY_MART_GREEN;
    g.fillRect(0, 0, 352, 130);
    g.fillStyle = blue;
    g.fillRect(0, 247, 352, 137);
    g.font = 'bold 53px Arial, sans-serif';
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(sign, 176, 191, 330);
    for (const x of [26, 137, 248]) {
      g.fillStyle = "#fff";
      g.beginPath();
      g.roundRect(x, 280, 78, 76, 5);
      g.fill();
    }
    g.fillStyle = blue;
    g.font = 'bold 30px Arial, sans-serif';
    g.fillText("ATM", 176, 321);
    g.fillRect(52, 299, 5, 38);
    g.fillRect(73, 301, 8, 36);
    g.fillRect(45, 295, 19, 14);
    for (const [x, c] of [[274, blue], [301, "#df5a48"]] as const) {
      g.fillStyle = c;
      g.beginPath();
      g.arc(x, 302, 6, 0, Math.PI * 2);
      g.fill();
      g.fillRect(x - 6, 312, 12, 24);
    }
  });
  const bladeX = -w / 2 + 0.62;
  for (const y of [2.92, 3.69]) box(group, deep, 0.11, 0.10, 0.78, bladeX, y, 0.30);
  box(group, [steel, steel, steel, steel, bladeFace, bladeFace], 1.20, 1.38, 0.26, bladeX, 3.36, 0.80, true);

  const doorHalf = 1.02;
  const windowH = 2.09;
  for (const side of [-1, 1]) {
    const bay = w / 2 - doorHalf - 0.22;
    const x = side * (doorHalf + bay / 2);
    box(group, glass, bay, windowH, 0.035, x, 1.14, 0);
    box(group, steel, bay, 0.065, 0.09, x, 0.095, 0.02);
    box(group, steel, bay, 0.065, 0.09, x, 2.18, 0.02);
    box(group, steel, 0.055, windowH, 0.08, x, 1.14, 0.02);
    box(group, reflection, 0.12, 1.51, 0.01, x + 0.25, 1.29, 0.035).rotation.z = -0.16;
    box(group, wood, 0.24, 2.32, 0.28, side * (w / 2 - 0.12), 1.16, 0.01, true);
    box(group, steel, 0.07, 2.28, 0.14, side * doorHalf, 1.14, 0.035);
    if (side < 0) bound(-w / 2, -0.12, -doorHalf, 0.14, 3.42);
    else bound(doorHalf, -0.12, w / 2, 0.14, 3.42);
  }
  box(group, steel, 2 * doorHalf, 0.13, 0.16, 0, 2.231, 0.055);
  box(group, deep, 0.34, 0.052, 0.06, 0, 2.18, 0.13);
  box(group, deep, 2.03, 0.019, 0.60, 0, 0.035, 0.39);

  const leafW = doorHalf - 0.02;
  const slideZ = 0.074;
  const leaves = [-1, 1].map((side) => {
    const leaf = new THREE.Group();
    leaf.position.set(side * doorHalf / 2, 0, slideZ);
    group.add(leaf);
    box(leaf, glass, leafW, 2.08, 0.03, 0, 1.125, 0);
    for (const edge of [-1, 1]) {
      box(leaf, steel, 0.045, 2.14, 0.048, edge * leafW / 2, 1.13, 0);
      box(leaf, steel, leafW, 0.06, 0.055, 0, 1.13 + edge * 1.05, 0);
    }
    box(leaf, white, 0.042, 0.32, 0.045, -side * 0.34, 1.10, 0.035);
    obstacles.push({ top: 2.25, test: (x, z, r) =>
      Math.abs(x - cx - leaf.position.x) < leafW / 2 + r && Math.abs(z - frontZ - slideZ) < 0.03 + r });
    return { side, leaf };
  });

  box(group, deep, 1.38, 0.82, 0.64, -2.04, 0.45, -1.20);
  box(group, white, 1.47, 0.07, 0.70, -2.04, 0.90, -1.20);
  box(group, deep, 0.36, 0.28, 0.18, -2.28, 1.075, -1.15);
  box(group, green, 0.23, 0.12, 0.01, -2.28, 1.10, -1.055);
  bound(-2.78, -1.55, -1.30, -0.86, 0.94);

  const packs = ["#fdc156", "#d86254", "#6fa8c4", "#f9eee0", "#75a979"]
    .map((color) => new THREE.MeshBasicMaterial({ color }));
  for (const side of [-1, 1]) {
    const x = side * 1.64;
    const back = -d + 0.36;
    box(group, side > 0 ? deep : wood, 2.16, 1.94, 0.42, x, 1.025, back);
    if (side > 0) box(group, light, 2.02, 0.09, 0.025, x, 1.9, back + 0.217);
    for (const [row, y] of [0.32, 0.83, 1.34].entries()) {
      box(group, steel, 2.10, 0.06, 0.43, x, y, back + 0.15);
      for (let i = 0; i < 7; i++) {
        const mat = packs[(i + row * 2 + (side > 0 ? 2 : 0)) % packs.length];
        box(group, mat, 0.18, 0.19 + (i % 3) * 0.037, 0.16, x - 0.88 + i * 0.29, y + 0.14, back + 0.29);
      }
    }
    bound(x - 1.08, -d + 0.12, x + 1.08, back + 0.38, 2.0);
  }
  box(upper, plaster, w - 0.35, 0.12, d - 0.24, 0, 2.42, -d / 2);
  for (const z of [-0.78, -2.14]) box(upper, light, w - 0.83, 0.025, 0.12, 0, 2.35, z);

  let open = 0;
  return {
    group, obstacles,
    inFront(player: Position) {
      const z = player.z - frontZ;
      return z >= 0 && z < 3.2 && Math.abs(player.x - cx) < w / 2 && player.y < 1;
    },
    contains(player: Position, inside: boolean) {
      const z = player.z - frontZ;
      return Math.abs(player.x - cx) < w / 2 - 0.10 && z > -d + 0.10 && z < (inside ? 0.24 : -0.14)
        && (inside || player.y < 2.32);
    },
    update(dt: number, player: Position, inside: boolean) {
      const approach = Math.abs(player.x - cx) < doorHalf + 0.55 && Math.abs(player.z - frontZ) < 1.82 && player.y < 2.28;
      open = THREE.MathUtils.damp(open, Number(approach), 12, dt);
      for (const { leaf, side } of leaves) leaf.position.x = side * (doorHalf / 2 + doorHalf * open);
      upper.visible = !inside;
    },
  };
}