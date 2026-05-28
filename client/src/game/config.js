import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import MainScene from './scenes/MainScene.js';

// Dimensiones base. En landscape mantenemos el diseño original 1320x720. En
// portrait reducimos el canvas al área del tablero (420x660, mismo ancho que
// el tablero) y desplazamos todas las posiciones del layout para que el
// tablero llene el 100% de la pantalla móvil sin cambiar las posiciones
// relativas de precio/sonido/info/N° jugada respecto al tablero.
const LANDSCAPE = { w: 1320, h: 720 };
const PORTRAIT  = { w: 420,  h: 660 };

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
