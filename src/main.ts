import Phaser from 'phaser'
import { ChallengeScene } from './ChallengeScene'
import './style.scss'

const startButton = document.querySelector<HTMLButtonElement>('#start-challenge')!

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 375,
  height: 375,
  backgroundColor: '#f7f3ea',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: new ChallengeScene(startButton),
})
