# Assets

Colocá tus imágenes en estas subcarpetas. Las rutas se configuran en `manifest.json`.
Si una imagen no existe, el juego genera un **placeholder** automáticamente con el nombre del asset,
así podés ir reemplazándolas de a una.

```
assets/
├── manifest.json           ← editar aquí rutas, símbolos, premios y probabilidades
├── backgrounds/
│   └── background.png      (1320×720 recomendado, fondo completo)
├── board/
│   └── board.png           (~420×660, tablero/pergamino central)
├── tiles/
│   └── tile-back.png       (~105×105, dorso de cada casilla — el "Anubis dorado")
├── symbols/                ← ATLAS de las 10 figuras
│   ├── symbols.png         (texture del atlas)
│   └── symbols.json        (definición de frames — formato Phaser/JSON Hash)
├── ui/
│   ├── logo.png            (logo "123 Momia")
│   ├── play-button.png     (botón "JUGAR")
│   ├── continue-button.png (botón "SEGUIR JUGANDO" — dispara una nueva jugada)
│   ├── balance-bg.png      (pildora azul superior con monto)
│   ├── play-number-bg.png  (pildora azul inferior "Número Jugada")
│   ├── sound-on.png
│   ├── sound-off.png
│   └── info.png
└── messages/
    ├── win-frame.png       (marco amarillo "GANASTE")
    └── lose-frame.png      (marco gris "JUEGO SIN PREMIO")
```

## Atlas de figuras (10 símbolos)

Las 10 figuras se entregan como **un solo atlas** (una textura + un JSON con los frames).
El manifest declara:

```json
"atlas": {
  "key":     "symbolsAtlas",
  "texture": "assets/symbols/symbols.png",
  "data":    "assets/symbols/symbols.json"
}
```

Y cada símbolo apunta a un **frame** dentro de ese atlas:

| id        | frame     | premio (× apuesta) |
|-----------|-----------|--------------------|
| x1        | x1        | 1                  |
| x2        | x2        | 2                  |
| x10       | x10       | 10                 |
| x20       | x20       | 20                 |
| x200      | x200      | 200                |
| x1000     | x1000     | 1000               |
| x2000     | x2000     | 2000               |
| x20000    | x20000    | 20000              |
| comodin   | comodin   | (wildcard)         |
| muerte    | muerte    | (2 = perdés)       |

### Formato del JSON del atlas

Phaser acepta **JSON Hash** (exportado por TexturePacker, Free Texture Packer, etc.):

```json
{
  "frames": {
    "x1":      { "frame": { "x": 0,   "y": 0,   "w": 100, "h": 100 } },
    "x2":      { "frame": { "x": 100, "y": 0,   "w": 100, "h": 100 } },
    "x10":     { "frame": { "x": 200, "y": 0,   "w": 100, "h": 100 } },
    "x20":     { "frame": { "x": 300, "y": 0,   "w": 100, "h": 100 } },
    "x200":    { "frame": { "x": 400, "y": 0,   "w": 100, "h": 100 } },
    "x1000":   { "frame": { "x": 0,   "y": 100, "w": 100, "h": 100 } },
    "x2000":   { "frame": { "x": 100, "y": 100, "w": 100, "h": 100 } },
    "x20000":  { "frame": { "x": 200, "y": 100, "w": 100, "h": 100 } },
    "comodin": { "frame": { "x": 300, "y": 100, "w": 100, "h": 100 } },
    "muerte":  { "frame": { "x": 400, "y": 100, "w": 100, "h": 100 } }
  },
  "meta": { "image": "symbols.png", "size": { "w": 500, "h": 200 } }
}
```

Los nombres de los frames **deben coincidir exactamente** con los `"frame"` del manifest.
Si un frame falta, ese símbolo cae a placeholder pero el resto del atlas sigue funcionando.

## Cambiar layout / posiciones

El bloque `layout` del manifest define x/y de cada elemento sobre un canvas de **1320×720**.
Los textos visibles ("¡GANASTE!", "JUGAR", "SEGUIR JUGANDO", etc.) se editan en el bloque `texts`.
