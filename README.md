# 123 Momia — Juego de Raspadita

Proyecto monorepo con **React + Vite + Phaser 3** (cliente) y **Node + Express** (servidor).
Inspirado en la mecánica clásica de raspaditas: una grilla de **3 columnas × 4 filas (12 casillas)**.
El jugador toca cada casilla, ésta se "voltea" y revela una figura.

## Reglas
- **Ganas** si encuentras **3 figuras iguales** (no muerte). El monto ganado depende del símbolo (ver `client/public/assets/manifest.json`).
- **Pierdes** si encuentras **2 figuras de "La Muerte" (chacal)**.
- El **Comodín** sustituye a cualquier figura ganadora.

## Estructura

```
momia-game/
├── client/                    # React + Vite + Phaser
│   ├── public/assets/         # 👈 AGREGÁ TUS IMÁGENES ACÁ
│   │   ├── manifest.json      # 👈 Configurá rutas, símbolos y premios
│   │   ├── backgrounds/
│   │   ├── board/
│   │   ├── tiles/
│   │   ├── symbols/
│   │   ├── ui/
│   │   └── messages/
│   └── src/
│       └── game/
│           ├── PhaserGame.jsx
│           ├── config.js
│           └── scenes/
│               ├── BootScene.js
│               └── MainScene.js
└── server/                    # API de jugadas
    ├── index.js
    └── gameLogic.js
```

## Instalación

```powershell
cd c:\Users\ppacheco\momia-game
npm install
npm run dev
```

Esto levanta:
- Servidor API en `http://localhost:3001`
- Cliente Vite en `http://localhost:5173`

## Cómo agregar assets

1. Copiá tus imágenes en las carpetas dentro de `client/public/assets/`.
2. Editá `client/public/assets/manifest.json` para que las rutas, símbolos y premios coincidan con tus archivos.
3. Recargá el navegador.

Todo el comportamiento visual (fondo, tablero, símbolos, mensajes, botón JUGAR, íconos) se controla desde el manifest — no hace falta tocar código.

## Deploy en Vercel

Este repo est� listo para Vercel:

- `api/play.js` es la funci�n serverless equivalente al endpoint Express (mismo path `/api/play`).
- `vercel.json` configura el build (`npm --workspace client run build`) y el output (`client/dist`).
- En local segu�s usando `npm run dev` (Vite + Express en :3001 con proxy).

### Pasos
1. Crear repo en github.com (p�blico o privado).
2. `git remote add origin https://github.com/<usuario>/<repo>.git`  ?  `git push -u origin main`.
3. En https://vercel.com importar el repo. Vercel detecta `vercel.json` y deploya autom�tico.
4. URL p�blica lista. Cada push a `main` redeploya.

