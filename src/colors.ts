// 配色の調整はここで行う。SVG素材の色は各SVG内で管理する。
// 同じ色値でも、別々に調整したい用途は別の定数にしている。
export const COLORS = {
  garden: {
    sky: 0xb9dce8,
    greenery: 0x9fb487,
    soil: 0xc49a68,
    path: 0xdec59a,
    cloud: 0xfffbef,
    hole: 0x594336,
    shadow: 0x80684d,
    soilDark: 0x997447,
    soilClump: 0xad8455,
    footprint: 0xa88a60,
  },
  plants: {
    vein: 0x536e43,
    hedge: 0x86a16e,
    leafDark: 0x66864e,
    leaf: 0x719354,
    leafLight: 0x829f5b,
    leafPale: 0x91aa66,
    leafHighlight: 0x9ab36b,
    carrot: 0xd78743,
    carrotLine: 0xad6434,
  },
  stone: {
    base: 0x958b76,
    highlight: 0xbeb09a,
  },
  signPost: {
    edge: 0x88613e,
    face: 0xb58a55,
    highlight: 0xd4ad75,
  },
  timber: {
    base: 0x977347,
    highlight: 0xb69360,
    grain: 0x735638,
    end: 0xc09c68,
  },
  mole: {
    body: 0xa97852,
    muzzle: 0xe9c49b,
    face: 0x30251e,
  },
  canvasBackground: 0xf7f3ea,
  // main.tsでCSSカスタムプロパティとして設定し、SCSSから参照する。
  ui: {
    'page-background': 0xe5e7eb,
    'content-background': 0xffffff,
    'text-color': 0x30251e,
    'button-background': 0x594336,
    'button-text': 0xffffff,
    'focus-color': 0xa97852,
  },
} as const

export function toCssColor(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`
}
