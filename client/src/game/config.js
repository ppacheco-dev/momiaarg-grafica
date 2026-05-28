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
  // Siempre FIT: garantiza que el canvas completo (1320x720) sea visible sin recortes,
  // tanto en desktop como en móvil portrait. En portrait quedan bandas arriba/abajo
  // con el color de fondo; rotando el teléfono se aprovecha toda la pantalla.
  const mode = Phaser.Scale.FIT;

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
