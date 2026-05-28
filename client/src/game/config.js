import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import MainScene from './scenes/MainScene.js';

export const GAME_WIDTH = 1320;
export const GAME_HEIGHT = 720;

export function createGameConfig(parent) {
  // Elegimos el modo de escala UNA SOLA VEZ al arrancar, según el aspect ratio del
  // dispositivo. No usamos listeners de resize para no romper el comportamiento móvil.
  //
  // - Móvil portrait / pantalla más alta que ancha respecto al canvas (ratio < 1.83):
  //   ENVELOP -> el canvas cubre toda la pantalla, recorta laterales (vacíos) y el
  //   tablero centrado se ve perfecto. (Comportamiento original móvil intacto).
  // - Desktop / pantallas anchas (ratio >= 1.83): ENVELOP recortaría arriba y abajo
  //   (cortando "Tablero" y "N° Jugada"), así que usamos FIT para que el tablero
  //   completo siempre sea visible. Las bandas laterales son del mismo púrpura del
  //   fondo (definido en CSS + backgroundColor) así que se ven como continuación del cielo.
  const w = (typeof window !== 'undefined' && window.innerWidth)  || GAME_WIDTH;
  const h = (typeof window !== 'undefined' && window.innerHeight) || GAME_HEIGHT;
  const screenRatio = w / h;
  const gameRatio = GAME_WIDTH / GAME_HEIGHT;
  const mode = screenRatio < gameRatio ? Phaser.Scale.ENVELOP : Phaser.Scale.FIT;

  return {
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#1a0a3a',
    scale: {
      mode,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [BootScene, MainScene]
  };
}
