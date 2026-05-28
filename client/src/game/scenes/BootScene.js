import Phaser from 'phaser';

// Carga el manifest + todas las imágenes. Si alguna falla, se genera un placeholder.
// Las figuras de la grilla se cargan desde un ATLAS (texture + JSON).

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    this.load.json('manifest', 'assets/manifest.json');
  }

  create() {
    const manifest = this.cache.json.get('manifest');
    this.registry.set('manifest', manifest);

    const imageMap = { ...manifest.images };

    const missing = new Set();
    this.load.on('loaderror', (file) => {
      missing.add(file.key);
      console.warn(`[BootScene] No se pudo cargar "${file.key}" (${file.src}). Se usará placeholder.`);
    });

    // Imágenes individuales (fondo, tablero, botones, etc.)
    for (const [key, path] of Object.entries(imageMap)) {
      this.load.image(key, path);
    }

    // Atlas de símbolos (todas las figuras en una sola textura + JSON con frames).
    const atlasKey = manifest.atlas?.key ?? 'symbolsAtlas';
    if (manifest.atlas?.texture && manifest.atlas?.data) {
      this.load.atlas(atlasKey, manifest.atlas.texture, manifest.atlas.data);
    }

    this.load.once('complete', () => {
      // Las imágenes "sueltas" que fallaron se exponen como Set en el registry.
      // MainScene dibujará un Rectangle estilizado en lugar de usar la textura.
      // (NO generamos texturas dinámicas: era el origen del patrón verde/negro __MISSING).
      const missingImages = new Set();
      for (const key of missing) {
        if (key === atlasKey) continue;
        missingImages.add(key);
      }
      this.registry.set('missingImages', missingImages);

      // Construir mapa { symbolId -> { key, frame } }.
      const atlasReady = this.textures.exists(atlasKey) && !missing.has(atlasKey);
      const atlasTexture = atlasReady ? this.textures.get(atlasKey) : null;

      const allSymbols = [
        ...manifest.symbols,
        { ...manifest.wildcard, prize: 0 },
        { ...manifest.death,    prize: 0 }
      ];

      const symbolMap = {};
      for (const s of allSymbols) {
        if (atlasTexture && atlasTexture.has(s.frame)) {
          symbolMap[s.id] = { key: atlasKey, frame: s.frame };
        } else {
          const phKey = `sym_${s.id}`;
          this.generateSymbolPlaceholder(phKey, s.id, manifest);
          symbolMap[s.id] = { key: phKey, frame: null };
          if (atlasReady) {
            console.warn(`[BootScene] El frame "${s.frame}" no existe en el atlas. Placeholder en uso para "${s.id}".`);
          }
        }
      }
      this.registry.set('symbolMap', symbolMap);

      this.scene.start('Main');
    });

    this.load.start();
  }

  generateSymbolPlaceholder(key, id, manifest) {
    const w = 100, h = 100, cx = 50, cy = 50;
    const isDeath    = id === manifest.death?.id;
    const isWildcard = id === manifest.wildcard?.id;
    const symDef     = manifest.symbols?.find(s => s.id === id);
    const prize      = symDef?.prize ?? 0;

    let ring, inner, glow, textColor, displayText;
    if (isDeath) {
      ring = '#111111'; inner = '#2a2a2a'; glow = '#663333'; textColor = '#dd4444'; displayText = '✕';
    } else if (isWildcard) {
      ring = '#5a1800'; inner = '#cc4400'; glow = '#ff9944'; textColor = '#ffeeaa'; displayText = '★';
    } else if (prize >= 10000) {
      ring = '#2a0055'; inner = '#7700cc'; glow = '#cc88ff'; textColor = '#ffee44'; displayText = `×${prize / 1000}K`;
    } else if (prize >= 1000) {
      ring = '#550000'; inner = '#cc1100'; glow = '#ff6644'; textColor = '#ffccaa'; displayText = `×${prize / 1000}K`;
    } else if (prize >= 100) {
      ring = '#553300'; inner = '#cc7700'; glow = '#ffcc44'; textColor = '#fff5aa'; displayText = `×${prize}`;
    } else if (prize >= 10) {
      ring = '#334400'; inner = '#779900'; glow = '#bbee33'; textColor = '#eeffaa'; displayText = `×${prize}`;
    } else {
      ring = '#1a3a1a'; inner = '#2e8b2e'; glow = '#55cc55'; textColor = '#ccffcc'; displayText = `×${prize}`;
    }

    const ct = this.textures.createCanvas(key, w, h);
    const ctx = ct.getContext();

    // Anillo exterior
    ctx.fillStyle = ring;
    ctx.beginPath(); ctx.arc(cx, cy, 48, 0, Math.PI * 2); ctx.fill();
    // Círculo interior
    ctx.fillStyle = inner;
    ctx.beginPath(); ctx.arc(cx, cy, 38, 0, Math.PI * 2); ctx.fill();
    // Brillo superior
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(cx - 10, cy - 12, 16, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    // Borde brilloso
    ctx.strokeStyle = glow;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, 44, 0, Math.PI * 2); ctx.stroke();

    // Texto centrado
    const fontSize = displayText.length <= 2 ? 36 : displayText.length <= 3 ? 30 : 24;
    ctx.font = `bold ${fontSize}px Arial Black, Arial, sans-serif`;
    ctx.fillStyle = textColor;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeText(displayText, cx, cy);
    ctx.fillText(displayText, cx, cy);

    ct.refresh();
  }
}
