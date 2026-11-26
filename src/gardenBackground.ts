import Phaser from 'phaser'
import { COLORS } from './colors'

export function getGardenPathY(x: number): number {
  return 491 + 9 * Math.sin(x / 375 * Math.PI * 2 + 0.7)
    + 3 * Math.sin(x / 375 * Math.PI * 4)
}

export function drawGardenBackground(scene: Phaser.Scene) {
  const background = scene.add.graphics().setDepth(-1)
  background.fillStyle(COLORS.garden.sky)
  background.fillRect(0, 0, 375, 600)

  // この境界の上に、別パーツの茂みと植物を重ねる。
  background.fillStyle(COLORS.garden.greenery)
  background.fillRect(0, 72, 375, 528)

  const soilEdge = Array.from({ length: 65 }, (_, index) => {
    const x = index / 64 * 375
    return new Phaser.Math.Vector2(x, 148 + 8 * Math.sin(x / 375 * Math.PI * 2 + 0.4))
  })
  background.fillStyle(COLORS.garden.soil)
  background.fillPoints([...soilEdge, new Phaser.Math.Vector2(375, 600), new Phaser.Math.Vector2(0, 600)], true)

  const pathEdge = Array.from({ length: 65 }, (_, index) => {
    const x = index / 64 * 375
    return new Phaser.Math.Vector2(x, getGardenPathY(x))
  })
  background.fillStyle(COLORS.garden.path)
  background.fillPoints([...pathEdge, new Phaser.Math.Vector2(375, 600), new Phaser.Math.Vector2(0, 600)], true)
}
