import Phaser from 'phaser'
import { getGardenPathY } from './gardenBackground'
import { COLORS } from './colors'

function drawLeaf(
  graphics: Phaser.GameObjects.Graphics,
  tipX: number,
  tipY: number,
  width: number,
  color: number,
) {
  const length = Math.hypot(tipX, tipY)
  const sideX = -tipY / length * width
  const sideY = tipX / length * width
  const root = new Phaser.Math.Vector2(0, 0)
  const tip = new Phaser.Math.Vector2(tipX, tipY)
  const left = new Phaser.Curves.QuadraticBezier(root,
    new Phaser.Math.Vector2(tipX / 2 + sideX, tipY / 2 + sideY), tip)
  const right = new Phaser.Curves.QuadraticBezier(tip,
    new Phaser.Math.Vector2(tipX / 2 - sideX, tipY / 2 - sideY), root)
  graphics.fillStyle(color)
  graphics.fillPoints([...left.getPoints(12), ...right.getPoints(12)], true)
  graphics.lineStyle(1, COLORS.plants.vein, 0.55)
  graphics.lineBetween(0, 0, tipX * 0.8, tipY * 0.8)
}

export function drawSignPosts(scene: Phaser.Scene) {
  // 板はHTMLで柱の上端を覆い、柱は接地位置に合わせて野菜より手前に描く。
  for (const x of [102, 273]) {
    const post = scene.add.graphics({ x, y: 123 }).setDepth(206)
    post.fillStyle(COLORS.signPost.edge)
    post.fillRect(-5, 0, 10, 83)
    post.fillStyle(COLORS.signPost.face)
    post.fillRect(-5, 0, 7, 81)
    post.lineStyle(1, COLORS.signPost.highlight, 0.65)
    post.lineBetween(-3, 5, -3, 76)
    post.lineStyle(1, COLORS.signPost.edge, 0.5)
    post.lineBetween(0, 25, 1, 52)
    post.lineBetween(-1, 61, -1, 77)

    const base = scene.add.graphics({ x, y: 206 }).setDepth(206)
    base.fillStyle(COLORS.garden.soilClump)
    base.fillEllipse(0, 0, 21, 5)
    base.fillStyle(COLORS.garden.soil)
    base.fillEllipse(0, 3, 26, 7)
    drawLeaf(base, -9, -10, 2, COLORS.plants.leaf)
    drawLeaf(base, 2, -14, 2, COLORS.plants.leafLight)
    drawLeaf(base, 9, -7, 2, COLORS.plants.leafDark)
  }
}

export function drawGardenPlants(scene: Phaser.Scene) {
  // 空と緑の水平な境界に、低い茂みの輪郭を重ねる。
  const hedge = scene.add.graphics().setDepth(0)
  hedge.fillStyle(COLORS.plants.hedge)
  for (const [x, y, width, height] of [
    [8, 79, 72, 42], [59, 82, 64, 35], [111, 81, 62, 30],
    [164, 85, 64, 33], [218, 82, 67, 28], [274, 81, 72, 38], [339, 80, 86, 43],
  ]) hedge.fillEllipse(x, y, width, height)
  hedge.fillRect(0, 82, 375, 26)

  const plants = [
    { x: 12, y: 117, scale: 1.05 }, { x: 56, y: 121, scale: 0.78 },
    { x: 113, y: 129, scale: 0.62 }, { x: 260, y: 130, scale: 0.58 },
    { x: 312, y: 123, scale: 0.82 }, { x: 364, y: 116, scale: 1.1 },
  ]
  for (const plant of plants) {
    const leaves = scene.add.graphics({ x: plant.x, y: plant.y })
      .setScale(plant.scale).setDepth(plant.y)
    drawLeaf(leaves, -25, -43, 12, COLORS.plants.leafDark)
    drawLeaf(leaves, 23, -40, 13, COLORS.plants.leaf)
    drawLeaf(leaves, -8, -65, 12, COLORS.plants.leafLight)
    drawLeaf(leaves, -31, -23, 11, COLORS.plants.leafPale)
    drawLeaf(leaves, 29, -24, 12, COLORS.plants.leafHighlight)
    leaves.fillStyle(COLORS.plants.vein)
    leaves.fillEllipse(0, -2, 13, 6)
  }
}

export function drawGardenStones(scene: Phaser.Scene, holes: readonly { x: number; y: number }[]) {
  const stones = [
    { x: 18, y: 190, width: 8 }, { x: 108, y: 205, width: 6 },
    { x: 242, y: 198, width: 9 }, { x: 355, y: 216, width: 6 },
    { x: 29, y: 289, width: 7 }, { x: 163, y: 287, width: 9 },
    { x: 286, y: 291, width: 6 }, { x: 361, y: 315, width: 8 },
    { x: 112, y: 366, width: 7 }, { x: 239, y: 374, width: 9 },
    { x: 25, y: 447, width: 8 }, { x: 160, y: 456, width: 6 },
    { x: 307, y: 454, width: 9 }, { x: 358, y: 470, width: 6 },
  ]
  for (const stone of stones) {
    // 開口部とその周囲には置かず、穴の形とタップ対象を見やすく保つ。
    if (holes.some(hole => Math.abs(hole.x - stone.x) < 70 + stone.width / 2
      && Math.abs(hole.y - stone.y) < 23)) continue

    const graphics = scene.add.graphics({ x: stone.x, y: stone.y }).setDepth(stone.y)
    const halfWidth = stone.width / 2
    graphics.fillStyle(COLORS.garden.shadow, 0.25)
    graphics.fillEllipse(0, 1, stone.width + 3, 3)
    graphics.fillStyle(COLORS.stone.base)
    graphics.fillPoints([
      new Phaser.Math.Vector2(-halfWidth, 0),
      new Phaser.Math.Vector2(-halfWidth * 0.6, -4),
      new Phaser.Math.Vector2(halfWidth * 0.35, -5),
      new Phaser.Math.Vector2(halfWidth, -1),
      new Phaser.Math.Vector2(halfWidth * 0.5, 1),
    ], true)
    graphics.lineStyle(1, COLORS.stone.highlight)
    graphics.lineBetween(-halfWidth * 0.5, -3, halfWidth * 0.3, -4)
  }
}

export function drawGardenExtras(scene: Phaser.Scene) {
  // 雲は背景の上、植物より奥。タイトルの中央は空ける。
  const clouds = scene.add.graphics().setDepth(-0.5)
  clouds.fillStyle(COLORS.garden.cloud, 0.7)
  for (const cloud of [{ x: 30, y: 25, scale: 0.85 }, { x: 328, y: 18, scale: 1 }]) {
    clouds.fillEllipse(cloud.x, cloud.y, 52 * cloud.scale, 12 * cloud.scale)
    clouds.fillEllipse(cloud.x - 10 * cloud.scale, cloud.y - 5, 23 * cloud.scale, 18 * cloud.scale)
    clouds.fillEllipse(cloud.x + 6 * cloud.scale, cloud.y - 7, 27 * cloud.scale, 21 * cloud.scale)
  }

  // ニンジンは肩だけを出し、手前の土で根元を隠す。
  const carrots = [
    { x: 19, y: 170, scale: 0.85 },
    { x: 45, y: 184, scale: 0.7 },
    { x: 78, y: 171, scale: 0.6 },
    { x: 352, y: 169, scale: 0.85 },
    { x: 326, y: 190, scale: 0.65 },
    { x: 20, y: 478, scale: 0.9 },
    { x: 49, y: 467, scale: 0.7 },
    { x: 350, y: 481, scale: 1 },
  ]
  for (const carrot of carrots) {
    const graphics = scene.add.graphics({ x: carrot.x, y: carrot.y })
      .setScale(carrot.scale).setDepth(carrot.y)
    graphics.fillStyle(COLORS.garden.soilDark)
    graphics.fillEllipse(0, 0, 22, 6)
    graphics.fillStyle(COLORS.plants.carrot)
    graphics.fillEllipse(0, -3, 15, 12)
    graphics.lineStyle(1, COLORS.plants.carrotLine)
    graphics.lineBetween(-5, -3, -1, -2)
    graphics.fillStyle(COLORS.garden.soil)
    graphics.fillEllipse(0, 5, 27, 10)
    graphics.fillStyle(COLORS.garden.soilClump)
    graphics.fillEllipse(-6, 1, 6, 3)
    graphics.fillEllipse(6, 2, 8, 4)
    drawLeaf(graphics, -13, -27, 7, COLORS.plants.leafDark)
    drawLeaf(graphics, 2, -34, 6, COLORS.plants.leafLight)
    drawLeaf(graphics, 14, -23, 7, COLORS.plants.leaf)
  }

  // 畑と道の境界に低い丸太を置く。手前のモグラよりも前面に描く。
  for (const [left, right] of [[3, 103], [115, 246], [259, 372]]) {
    const x = (left + right) / 2
    const y = getGardenPathY(x) + 3
    const length = right - left
    const angle = Math.atan2(getGardenPathY(right) - getGardenPathY(left), length)
    const timber = scene.add.graphics({ x, y }).setRotation(angle).setDepth(y)
    timber.fillStyle(COLORS.garden.shadow, 0.18)
    timber.fillEllipse(0, 5, length + 5, 9)
    timber.fillStyle(COLORS.timber.base)
    timber.fillRoundedRect(-length / 2, -6, length, 12, 5)
    timber.lineStyle(1.5, COLORS.timber.highlight)
    timber.lineBetween(-length / 2 + 7, -3, length / 2 - 6, -3)
    timber.lineStyle(1, COLORS.timber.grain, 0.6)
    timber.lineBetween(-length / 2 + 12, 2, -length / 2 + 31, 1)
    timber.lineBetween(length / 2 - 35, 1, length / 2 - 13, 2)
    timber.fillStyle(COLORS.timber.end)
    timber.fillEllipse(length / 2 - 4, 0, 6, 9)
  }

  // ボタンの両脇に、ごく薄い足跡を残す。
  for (const footprint of [
    { x: 35, y: 532, angle: -0.35 }, { x: 53, y: 550, angle: -0.2 },
    { x: 322, y: 568, angle: 0.4 }, { x: 340, y: 548, angle: 0.25 },
  ]) {
    const graphics = scene.add.graphics({ x: footprint.x, y: footprint.y })
      .setRotation(footprint.angle).setDepth(footprint.y)
    graphics.fillStyle(COLORS.garden.footprint, 0.35)
    graphics.fillEllipse(0, 0, 7, 5)
    graphics.fillCircle(-3, -5, 1.4)
    graphics.fillCircle(0, -6, 1.5)
    graphics.fillCircle(3, -5, 1.4)
  }
}
