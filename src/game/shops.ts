// 校外超商:7-11、全家、萊爾富 + 商品與增益效果
//
// 在商店區域用金幣購買點心,可獲得限時增益:
//   可樂:疾速 / 茶葉蛋:彈跳 / 鮮奶:金幣磁鐵 / 吐司:元氣 / 麵包:大滿足

export type BuffId = "speed" | "jump" | "magnet";

export interface BuffInfo {
  id: BuffId;
  label: string;
  emoji: string;
  /** 剩餘秒數 */
  remain: number;
}

export interface Product {
  id: string;
  name: string;
  /** 原價 (金幣) */
  price: number;
  desc: string;
  /** 效果說明 (含秒數,顯示用) */
  effectText: string;
  /** 效果持續秒數 */
  duration: number;
}

export const PRODUCTS: Product[] = [
  {
    id: "cola",
    name: "可樂",
    price: 5,
    desc: "冰涼暢快!喝下去全身充滿電力。",
    effectText: "疾速奔跑 15 秒",
    duration: 15,
  },
  {
    id: "egg",
    name: "茶葉蛋",
    price: 3,
    desc: "香噴噴的茶葉蛋,蛋白 Q 彈好滋味。",
    effectText: "彈跳加強 20 秒",
    duration: 20,
  },
  {
    id: "milk",
    name: "鮮奶",
    price: 4,
    desc: "新鮮鮮奶,喝了頭好壯壯!",
    effectText: "金幣磁鐵 30 秒",
    duration: 30,
  },
  {
    id: "toast",
    name: "吐司",
    price: 2,
    desc: "鬆軟吐司,快速補充元氣。",
    effectText: "元氣滿滿 12 秒(小加速 + 小彈跳)",
    duration: 12,
  },
  {
    id: "bread",
    name: "麵包",
    price: 6,
    desc: "店長推薦!大滿足豪華麵包。",
    effectText: "大滿足 30 秒(加速 + 彈跳 + 磁鐵)",
    duration: 30,
  },
];

export interface StoreDef {
  id: string;
  /** 資訊卡 / 選單顯示名稱 */
  name: string;
  emoji: string;
  /** 品牌主色 */
  color: string;
  /** 屋頂招牌文字 */
  sign: string;
  signBg: string;
  signFg: string;
  /** 建築本體 (px) */
  building: { x0: number; y0: number; x1: number; y1: number };
  /** 正門朝向 */
  doorSide: "n" | "s" | "e" | "w";
  /** 招牌柱位置 (px) */
  totem: [number, number];
  /** 門口販賣機位置 (px) 與正面朝向 */
  vend: { at: [number, number]; rot: "n" | "s" | "e" | "w" };
  /** 本店特價商品 */
  sale: { productId: string; price: number };
}

export const FAMILY_MART_GREEN = "#079d43";
export const FAMILY_MART: StoreDef = {
  id: "family",
  name: "全家 中和光復店",
  emoji: "🏪",
  color: "#0875b7",
  sign: "FamilyMart",
  signBg: "#ffffff",
  signFg: "#0875b7",
  building: { x0: 1768, y0: -170, x1: 2016, y1: -30 },
  doorSide: "s",
  totem: [1800, 180],
  vend: { at: [2005, 300], rot: "e" },
  sale: { productId: "milk", price: 2 },
};

export const STORES: StoreDef[] = [
  {
    id: "seven",
    name: "7-11 光復店",
    emoji: "🏪",
    color: "#008053",
    sign: "7-ELEVEN",
    signBg: "#008053",
    signFg: "#ffffff",
    building: { x0: -185, y0: 1170, x1: -15, y1: 1280 },
    doorSide: "n",
    totem: [-215, 1140],
    vend: { at: [10, 1225], rot: "e" },
    sale: { productId: "cola", price: 3 },
  },
  FAMILY_MART,
  {
    id: "hilife",
    name: "萊爾富 光復店",
    emoji: "🏪",
    color: "#e73828",
    sign: "Hi-Life",
    signBg: "#e73828",
    signFg: "#ffe14d",
    building: { x0: 2260, y0: 950, x1: 2390, y1: 1090 },
    doorSide: "w",
    totem: [2412, 1080],
    vend: { at: [2300, 1130], rot: "n" },
    sale: { productId: "bread", price: 4 },
  },
];

/** 某商品在某店的實際售價 (含特價) */
export function priceFor(storeId: string, productId: string): number {
  const p = PRODUCTS.find((q) => q.id === productId);
  if (!p) return 0;
  const s = STORES.find((q) => q.id === storeId);
  if (s && s.sale.productId === productId) return s.sale.price;
  return p.price;
}
