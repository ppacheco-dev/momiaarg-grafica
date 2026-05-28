import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import MainScene from './scenes/MainScene.js';

// Dimensiones base. En portrait usamos canvas vertical (720x1280) para que el
// tablero llene la pantalla del móvil sin recortes. En landscape el original
// (1320x720). La orientación se elige UNA SOLA VEZ al arrancar.
const LANDSCAPE = { w: 1320, h: 720 };
const PORTRAIT  = { w: 720,  h: 1280 };

const _isPortrait = typeof window !== 'undefined'
  && window.innerHeight > window.innerWidth;

const _dims = _isPortrait ? PORTRAIT : LANDSCAPE;
export const GAME_WIDTH  = _dims.w;
export const GAME_HEIGHT = _dims.h;
export const IS_PORTRAIT = _isPortrait;

export function createGameConfig(parent) {
  return {
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#1a0a3a',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [BootScene, MainScene]
  };
}
