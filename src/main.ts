import Phaser from 'phaser'
import { ChallengeScene } from './ChallengeScene'
import { GameUI } from './GameUI'
import './style.scss'

const ui = new GameUI(document.querySelector<HTMLElement>('#app')!)

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 750,
  height: 750,
  backgroundColor: '#f7f3ea',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: new ChallengeScene(ui),
})
