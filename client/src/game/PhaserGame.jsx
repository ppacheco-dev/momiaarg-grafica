import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { createGameConfig } from './config.js';

export default function PhaserGame() {
  const parentRef = useRef(null);
  const gameRef = useRef(null);

  useEffect(() => {
    if (gameRef.current) return;
    gameRef.current = new Phaser.Game(createGameConfig(parentRef.current));

    // Solo refrescamos el canvas al redimensionar — NO recreamos el juego nunca.
    // El modo de escala fue elegido en config.js al arrancar según el aspect ratio
    // del dispositivo: ENVELOP para móvil portrait, FIT para escritorio landscape.
    let rafId = 0;
    const onResize = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        gameRef.current?.scale?.refresh();
      });
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      if (rafId) cancelAnimationFrame(rafId);
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return <div ref={parentRef} style={{ width: '100%', height: '100%' }} />;
}
