import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, IS_PORTRAIT } from '../config.js';

export default class MainScene extends Phaser.Scene {
  constructor() {
    super('Main');
  }

  create() {
    this.manifest  = this.registry.get('manifest');
    this.symbolMap = this.registry.get('symbolMap');
    // Reescribimos las posiciones del layout para la orientación actual del canvas.
    this._applyResponsiveLayout();
    this.balance   = this.manifest.gameplay.initialBalance;
    this.tiles     = [];
    this.revealedCount = 0;
    this.currentPlay = null;
    this.busy = false;
    this.soundOn = true;

    this.buildBackground();
    this.buildBoard();
    this.buildHUD();
    this.buildGrid();
    this.buildPlayButton();
    this.buildOverlay();

    // Handler GLOBAL de clicks: hace hit-test contra cada ficha manualmente.
    // Esto bypassea cualquier otro objeto interactivo que pueda estar bloqueando el input.
    this.input.on('pointerdown', (pointer) => {
      if (!this.currentPlay || this.busy) return;
      const px = pointer.worldX;
      const py = pointer.worldY;
      for (const tile of this.tiles) {
        if (tile.revealed) continue;
        const half = tile.size / 2;
        if (px >= tile.x - half && px <= tile.x + half &&
            py >= tile.y - half && py <= tile.y + half) {
          this.onTileClicked(tile);
          return;
        }
      }
    });

    // DEBUG: teclas para forzar el resultado de la próxima jugada.
    // W = win garantizado, L = lose garantizado, N = sin premio, R = aleatorio normal.
    this._forcedOutcome = null;
    this.input.keyboard.on('keydown-W', () => { this._forcedOutcome = 'win';  console.log('[DEBUG] Próxima jugada forzada a WIN'); });
    this.input.keyboard.on('keydown-L', () => { this._forcedOutcome = 'lose'; console.log('[DEBUG] Próxima jugada forzada a LOSE'); });
    this.input.keyboard.on('keydown-N', () => { this._forcedOutcome = 'none'; console.log('[DEBUG] Próxima jugada forzada a NONE'); });
    this.input.keyboard.on('keydown-R', () => { this._forcedOutcome = null;   console.log('[DEBUG] Resultado aleatorio (normal)'); });
  }

  // ---------- RESPONSIVE LAYOUT ----------
  // El manifest define posiciones para 1320x720 (landscape). En portrait el
  // canvas mide 420x660 (mismo aspecto que el tablero), por lo que desplazamos
  // TODAS las posiciones del layout por el mismo delta para que el tablero
  // (y todo su HUD: precio, sonido, info, N° jugada) llene la pantalla
  // manteniendo intacta la disposición relativa.
  _applyResponsiveLayout() {
    if (!IS_PORTRAIT) return;
    const lay = this.manifest.layout;
    const b = lay.board;
    // Nueva posición del centro del tablero = centro del canvas portrait.
    const dx = (GAME_WIDTH  / 2) - b.x;
    const dy = (GAME_HEIGHT / 2) - b.y;
    const shift = (p) => { if (p && typeof p.x === 'number') { p.x += dx; p.y += dy; } };
    shift(lay.background);
    shift(lay.board);
    shift(lay.balance);
    shift(lay.playNumber);
    shift(lay.soundIcon);
    shift(lay.infoIcon);
    shift(lay.playButton);
  }

  // ---------- BUILDERS ----------
  buildBackground() {
    const l = this.manifest.layout.background;
    if (this.textures.exists('background')) {
      this.add.image(l.x, l.y, 'background').setScale(l.scale).setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    } else {
      this._drawStarryBackground();
    }
    this._placeholderLabel(20, 20, 'Fondo', 18, 0, 0);
  }

  buildBoard() {
    const l = this.manifest.layout.board;
    this._img(l.x, l.y, 'board', l.width, l.height);
    // logo encima del tablero (render primero)
    const logoY = l.y - l.height / 2 + 60;
    this._img(l.x, logoY, 'logo', 200, 70);
    this._placeholderLabel(l.x, logoY, 'Logo', 14, 0.5, 0.5);
    // etiqueta "Tablero" encima del logo (render después = queda por delante)
    this._placeholderLabel(l.x, l.y - l.height / 2 + 14, 'Tablero', 16, 0.5, 0.5);
  }

  buildHUD() {
    const lay = this.manifest.layout;

    // precio de la apuesta (pill superior)
    this._img(lay.balance.x, lay.balance.y, 'balanceBg', 80, 32);
    this._placeholderLabel(lay.balance.x, lay.balance.y, 'Precio', 11, 0.5, 0.5);

    // número de jugada (parte inferior)
    this._img(lay.playNumber.x, lay.playNumber.y, 'playNumberBg', 140, 40);
    this._placeholderLabel(lay.playNumber.x, lay.playNumber.y, 'N° Jugada', 13, 0.5, 0.5);

    // sonido (toggle)
    this.soundIcon = this._img(lay.soundIcon.x, lay.soundIcon.y, 'soundOn', 40, 40).setInteractive({ useHandCursor: true });
    this._placeholderLabel(lay.soundIcon.x, lay.soundIcon.y, 'Sonido', 10, 0.5, 0.5);
    this.soundIcon.on('pointerdown', () => {
      this.soundOn = !this.soundOn;
      this._setVariant(this.soundIcon, this.soundOn ? 'soundOn' : 'soundOff');
    });

    // info
    this._img(lay.infoIcon.x, lay.infoIcon.y, 'info', 40, 40).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.showInfo());
    this._placeholderLabel(lay.infoIcon.x, lay.infoIcon.y, 'Info', 10, 0.5, 0.5);
  }

  buildGrid() {
    const lay = this.manifest.layout;
    const board = lay.board;
    const grid = lay.grid;
    const totalW = grid.cols * grid.tileSize + (grid.cols - 1) * grid.spacingX;
    const totalH = grid.rows * grid.tileSize + (grid.rows - 1) * grid.spacingY;
    const startX = board.x - totalW / 2 + grid.tileSize / 2;
    const startY = board.y - totalH / 2 + grid.tileSize / 2 + (grid.offsetY || 0);

    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        const x = startX + c * (grid.tileSize + grid.spacingX);
        const y = startY + r * (grid.tileSize + grid.spacingY);
        const tile = this.createTile(x, y, grid.tileSize, r * grid.cols + c);
        this.tiles.push(tile);
      }
    }
  }

  createTile(x, y, size, index) {
    const back = this._img(x, y, 'tileBack', size, size);
    // No setInteractive aquí: usamos un handler global en create() para bypassear bloqueos.
    // Etiqueta "Ficha N" sobre el reverso para identificar visualmente cada casilla
    const label = this.add.text(x, y, `Ficha ${index + 1}`, {
      fontFamily: 'Arial Black', fontSize: 14, color: '#ffffff',
      stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5);
    // El símbolo siempre usa una key generada (sym_*) que SÍ existe como textura.
    const symbol = this.add.image(x, y, 'tileBack').setDisplaySize(size, size).setVisible(false);
    // Fallback de seguridad: si la textura del símbolo no existe (key __MISSING),
    // usamos este rectángulo + texto para evitar el patrón verde/negro.
    const fallbackBg = this.add.rectangle(x, y, size, size, 0x444466)
      .setStrokeStyle(2, 0xaaaaee).setVisible(false);
    const fallbackText = this.add.text(x, y, '', {
      fontFamily: 'Arial Black', fontSize: 16, color: '#ffffff',
      stroke: '#000000', strokeThickness: 3, align: 'center'
    }).setOrigin(0.5).setVisible(false);

    const tile = { x, y, size, index, back, label, symbol, fallbackBg, fallbackText, revealed: false, symbolId: null };
    return tile;
  }

  buildPlayButton() {
    const lay = this.manifest.layout.playButton;
    this.playButton = this._img(lay.x, lay.y, 'playButton', 260, 70).setInteractive({ useHandCursor: true });
    this.playButtonLabelPh = this._placeholderLabel(lay.x, lay.y, 'Botón Jugar', 14, 0.5, 0.5);
    this.playButton.on('pointerdown', () => this.startPlay());

    // pequeña animación pulsante
    this.tweens.add({
      targets: [this.playButton, this.playButtonLabelPh],
      scale: { from: 1, to: 1.05 },
      duration: 700,
      yoyo: true,
      repeat: -1
    });
  }

  buildOverlay() {
    // Overlay entre el inicio del tablero y la mitad de la primera fila de fichas.
    // Más alto, extendiéndose hacia arriba.
    const ovBoard = this.manifest.layout.board;
    const overlayY = ovBoard.y - ovBoard.height / 2 + 85;
    this.overlay = this.add.container(ovBoard.x, overlayY).setVisible(false);
    this.overlayBg = this._img(0, 0, 'winFrame', 340, 140);
    this.overlayLabel = this.add.text(0, -50, '', {
      fontFamily: 'Arial Black', fontSize: 16, color: '#ffffff',
      stroke: '#000000', strokeThickness: 2
    }).setOrigin(0.5);

    this.continueButton = this._img(0, 42, 'continueButton', 180, 38);
    // Importante: NO setInteractive aquí. Se activa solo cuando el overlay se muestra,
    // para que no capture clicks de las fichas mientras está oculto.
    this.continueLabelPh = this.add.text(0, 42, 'Btn Continuar', {
      fontFamily: 'Arial Black', fontSize: 12, color: '#ffffff',
      stroke: '#000000', strokeThickness: 2
    }).setOrigin(0.5);

    // Imagen placeholder del monto ganado (sólo visible cuando se gana).
    // Cuando exista el asset real (key 'prizeAmount'), _img lo reemplaza automáticamente.
    this.prizeBox = this._img(0, -8, 'prizeAmount', 200, 44).setVisible(false);
    this.prizeText = this.add.text(0, -8, 'img monto ganado', {
      fontFamily: 'Arial Black', fontSize: 14, color: '#1c1330',
      stroke: '#ffffff', strokeThickness: 1
    }).setOrigin(0.5).setVisible(false);
    this.continueButton.on('pointerdown', () => this.playAgain());

    this.overlay.add([this.overlayBg, this.overlayLabel, this.prizeBox, this.prizeText, this.continueButton, this.continueLabelPh]);
  }

  // ---------- FLOW ----------
  async startPlay() {
    if (this.busy) return;
    this.busy = true;

    // descontar apuesta
    this.balance -= this.manifest.gameplay.baseBet;
    this.updateBalance();

    // ocultar botón: lo movemos fuera de pantalla para que no capture clicks de las fichas.
    this.tweens.killTweensOf([this.playButton, this.playButtonLabelPh]);
    this.playButton.disableInteractive();
    const pbLay = this.manifest.layout.playButton;
    this.tweens.add({
      targets: [this.playButton, this.playButtonLabelPh],
      alpha: 0, duration: 200,
      onComplete: () => {
        this.playButton.setVisible(false).setPosition(-2000, -2000);
        this.playButtonLabelPh.setVisible(false).setPosition(-2000, -2000);
      }
    });

    // pedir jugada al server
    try {
      const catalog = this.buildCatalogFromManifest();
      // Si hay un outcome forzado por DEBUG, manipular las probabilidades.
      if (this._forcedOutcome === 'win')       { catalog.winChance = 1; catalog.loseChance = 0; }
      else if (this._forcedOutcome === 'lose') { catalog.winChance = 0; catalog.loseChance = 1; }
      else if (this._forcedOutcome === 'none') { catalog.winChance = 0; catalog.loseChance = 0; }
      const res = await fetch('/api/play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ catalog })
      });
      this.currentPlay = await res.json();
      console.log('[MainScene] Jugada recibida:', this.currentPlay.outcome, 'prize:', this.currentPlay.prize);
    } catch (err) {
      console.error('[MainScene] Error al pedir jugada, usando fallback local.', err);
      this.currentPlay = this.localFallbackPlay();
      console.log('[MainScene] Jugada local:', this.currentPlay.outcome, 'prize:', this.currentPlay.prize);
    }
    this._forcedOutcome = null; // reset siempre, independiente de si server o fallback

    this.playNumberText = this.playNumberText || null;
    if (this.playNumberText && this.currentPlay) {
      this.playNumberText.setText(String(this.currentPlay.playNumber || '0000000'));
    }
    this.revealedCount = 0;
    this.busy = false;
  }

  buildCatalogFromManifest() {
    const gp = this.manifest.gameplay;
    return {
      symbols: this.manifest.symbols.map(s => ({
        id: s.id, prize: s.prize, weight: gp.weights[s.id] ?? 10
      })),
      wildcardId: this.manifest.wildcard.id,
      wildcardWeight: gp.weights[this.manifest.wildcard.id] ?? 5,
      deathId: this.manifest.death.id,
      deathWeight: gp.weights[this.manifest.death.id] ?? 8,
      winChance: gp.winChance,
      loseChance: gp.loseChance,
      baseBet: gp.baseBet
    };
  }

  localFallbackPlay() {
    // Generador local: mismas reglas que el server. Respeta winChance/loseChance del catálogo.
    const catalog = this.buildCatalogFromManifest();
    // Aplicar forzado de debug si está activo
    let winChance = catalog.winChance;
    let loseChance = catalog.loseChance;
    if (this._forcedOutcome === 'win')       { winChance = 1; loseChance = 0; }
    else if (this._forcedOutcome === 'lose') { winChance = 0; loseChance = 1; }
    else if (this._forcedOutcome === 'none') { winChance = 0; loseChance = 0; }

    const r = Math.random();
    let forced;
    if (r < winChance) forced = 'win';
    else if (r < winChance + loseChance) forced = 'lose';
    else forced = 'none';

    const pickWeighted = (arr) => {
      const total = arr.reduce((s, it) => s + it.weight, 0);
      let n = Math.random() * total;
      for (const it of arr) { n -= it.weight; if (n <= 0) return it; }
      return arr[arr.length - 1];
    };
    const shuffle = (arr) => {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };
    const pool = [
      ...catalog.symbols.map(s => ({ id: s.id, weight: s.weight })),
      { id: catalog.wildcardId, weight: catalog.wildcardWeight },
      { id: catalog.deathId,    weight: catalog.deathWeight }
    ];

    let tiles;
    let prize = 0;
    let winningSymbol = null;

    if (forced === 'win') {
      const winner = pickWeighted(catalog.symbols);
      tiles = [winner.id, winner.id, winner.id];
      while (tiles.length < 12) {
        const cand = pickWeighted(pool).id;
        const counts = {};
        const next = tiles.concat([cand]);
        for (const t of next) counts[t] = (counts[t] || 0) + 1;
        if ((counts[catalog.deathId] || 0) >= 2) continue;
        tiles.push(cand);
      }
      tiles = shuffle(tiles);
      prize = winner.prize * (catalog.baseBet || 1);
      winningSymbol = winner.id;
      return { tiles, outcome: 'win', prize, winningSymbol, playNumber: Math.floor(Math.random() * 9999999) };
    }

    if (forced === 'lose') {
      tiles = [catalog.deathId, catalog.deathId];
      while (tiles.length < 12) {
        const cand = pickWeighted(pool).id;
        if (cand === catalog.deathId) continue;
        tiles.push(cand);
      }
      return { tiles: shuffle(tiles), outcome: 'lose', prize: 0, winningSymbol: null, playNumber: Math.floor(Math.random() * 9999999) };
    }

    // none: rellena evitando ternas y 2+ muertes
    for (let attempt = 0; attempt < 50; attempt++) {
      const t = [];
      for (let i = 0; i < 12; i++) t.push(pickWeighted(pool).id);
      const counts = {};
      for (const x of t) counts[x] = (counts[x] || 0) + 1;
      if ((counts[catalog.deathId] || 0) >= 2) continue;
      const wilds = counts[catalog.wildcardId] || 0;
      let hasWin = false;
      for (const sym of catalog.symbols) {
        if ((counts[sym.id] || 0) + wilds >= 3) { hasWin = true; break; }
      }
      if (hasWin) continue;
      return { tiles: t, outcome: 'none', prize: 0, winningSymbol: null, playNumber: Math.floor(Math.random() * 9999999) };
    }
    // Último recurso
    return { tiles: shuffle(catalog.symbols.slice(0, 12).map(s => s.id)), outcome: 'none', prize: 0, winningSymbol: null, playNumber: Math.floor(Math.random() * 9999999) };
  }

  onTileClicked(tile) {
    if (!this.currentPlay || tile.revealed || this.busy) return;
    let symbolId = this.currentPlay.tiles[tile.index];
    // Salvavidas: si el server devolvió menos de 12 tiles o un valor vacío,
    // generamos uno aleatorio del catálogo en vez de mostrar "?".
    if (!symbolId) {
      const ids = Object.keys(this.symbolMap);
      symbolId = ids[Math.floor(Math.random() * ids.length)];
    }
    const ref = this.symbolMap[symbolId] || { key: 'tileBack', frame: null };
    tile.symbolId = symbolId;
    tile.revealed = true;
    tile.back.disableInteractive();

    // ¿La textura del símbolo existe realmente? Si no, usamos el fallback estilizado
    // para evitar el patrón verde/negro de Phaser (__MISSING).
    const textureOk = this.textures.exists(ref.key) && ref.key !== '__MISSING';

    // animación de "voltear": escalar la X del back a 0, cambiar textura, escalar de vuelta
    tile.label.setVisible(false);
    this.tweens.add({
      targets: tile.back,
      scaleX: 0,
      duration: 150,
      onComplete: () => {
        tile.back.setVisible(false);
        let displayObj;
        if (textureOk) {
          if (ref.frame) tile.symbol.setTexture(ref.key, ref.frame);
          else tile.symbol.setTexture(ref.key);
          tile.symbol.setDisplaySize(tile.size, tile.size);
          tile.symbol.setVisible(true);
          displayObj = tile.symbol;
        } else {
          // Símbolo sin textura disponible: dibujamos el id como texto en un cuadro.
          tile.fallbackText.setText(String(symbolId || '?'));
          tile.fallbackBg.setVisible(true);
          tile.fallbackText.setVisible(true);
          displayObj = tile.fallbackBg;
          // sincronizamos el texto al mismo scaleX que el bg para la animación
          tile.fallbackText.scaleX = 0;
        }
        const targetScaleX = displayObj.scaleX;
        displayObj.scaleX = 0;
        this.tweens.add({
          targets: textureOk ? displayObj : [tile.fallbackBg, tile.fallbackText],
          scaleX: targetScaleX,
          duration: 150,
          onComplete: () => {
            this.revealedCount++;
            if (this.revealedCount === this.tiles.length) {
              this.time.delayedCall(400, () => this.showResult());
            }
          }
        });
      }
    });
  }

  showResult() {
    const { outcome, prize } = this.currentPlay;
    if (outcome === 'win') {
      this.balance += prize;
      this.updateBalance();
      this._setVariant(this.overlayBg, 'winFrame');
      this.overlayLabel.setText('¡GANASTE!');
      this.prizeBox.setVisible(true);
      this.prizeText.setVisible(true);
    } else {
      this._setVariant(this.overlayBg, 'loseFrame');
      this.overlayLabel.setText('Mensaje Sin Premio');
      this.prizeBox.setVisible(false);
      this.prizeText.setVisible(false);
    }
    this.overlay.setScale(0).setVisible(true);
    this.continueButton.setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: this.overlay, scale: 1, duration: 300, ease: 'Back.Out' });
  }

  resetBoard(showPlayBtn = true) {
    this.overlay.setVisible(false);
    this.continueButton.disableInteractive();
    this.currentPlay = null;
    this.revealedCount = 0;
    for (const t of this.tiles) {
      t.revealed = false;
      t.symbolId = null;
      t.symbol.setVisible(false);
      if (t.fallbackBg)   { t.fallbackBg.setVisible(false).setScale(1); }
      if (t.fallbackText) { t.fallbackText.setVisible(false).setScale(1); }
      t.back.setVisible(true).setScale(1).setAlpha(1).setDisplaySize(t.size, t.size);
      t.back.setInteractive({ useHandCursor: true });
      t.label.setVisible(true);
    }
    if (showPlayBtn) {
      const pbLay = this.manifest.layout.playButton;
      this.playButton.setPosition(pbLay.x, pbLay.y).setVisible(true).setAlpha(1).setInteractive({ useHandCursor: true });
      this.playButtonLabelPh.setPosition(pbLay.x, pbLay.y).setVisible(true).setAlpha(1);
      this.tweens.add({
        targets: [this.playButton, this.playButtonLabelPh],
        scale: { from: 1, to: 1.05 },
        duration: 700, yoyo: true, repeat: -1
      });
    }
  }

  // "SEGUIR JUGANDO" → resetea el tablero y arranca una nueva jugada (mismo efecto que JUGAR).
  playAgain() {
    this.resetBoard(false);
    this.startPlay();
  }

  // ---------- UTILS ----------
  updateBalance() {
    // el texto del balance va en la imagen del asset
  }

  formatMoney(n) {
    const { currency } = this.manifest.gameplay;
    return `${currency}${n.toLocaleString('es-AR')}`;
  }

  // Helper: agrega un label de texto sobre un placeholder. Devuelve la referencia al texto.
  _placeholderLabel(x, y, text, size, originX, originY) {
    return this.add.text(x, y, text, {
      fontFamily: 'Arial', fontStyle: 'bold', fontSize: size,
      color: '#ffffff', stroke: '#000000', strokeThickness: 2,
      shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 2, fill: true }
    }).setOrigin(originX, originY);
  }

  // ---------- PLACEHOLDER HELPERS (cuando faltan imágenes) ----------

  // Paleta de placeholders: { fill, border } por key.
  _placeholderPalette(key) {
    const map = {
      board:          { fill: 0x6c4020, border: 0xffaa55 },
      logo:           { fill: 0xaa7700, border: 0xffe88a },
      tileBack:       { fill: 0x2a5588, border: 0xaaddff },
      playButton:     { fill: 0xaa2020, border: 0xffaa99 },
      continueButton: { fill: 0xaa2020, border: 0xffaa99 },
      balanceBg:      { fill: 0x224488, border: 0xffd700 },
      playNumberBg:   { fill: 0x224488, border: 0xffd700 },
      soundOn:        { fill: 0x227799, border: 0x88ddff },
      soundOff:       { fill: 0x555555, border: 0xaaaaaa },
      info:           { fill: 0x227755, border: 0x88ffbb },
      winFrame:       { fill: 0x886600, border: 0xffee99 },
      loseFrame:      { fill: 0x555555, border: 0xbbbbbb },
      prizeAmount:    { fill: 0xffd166, border: 0xff7a59 },
    };
    return map[key] || { fill: 0x444466, border: 0xaaaaee };
  }

  // Crea una imagen real si la textura existe; si no, devuelve un Rectangle estilizado.
  // Usa textures.exists() directamente — más fiable que trackear loaderror.
  _img(x, y, key, w, h) {
    if (this.textures.exists(key)) {
      const img = this.add.image(x, y, key);
      if (w && h) img.setDisplaySize(w, h);
      return img;
    }
    const pal = this._placeholderPalette(key);
    const rect = this.add.rectangle(x, y, w || 100, h || 100, pal.fill);
    rect.setStrokeStyle(3, pal.border);
    rect._placeholderKey = key;
    return rect;
  }

  // Cambia "textura": si la key existe en texturas → setTexture; si no → cambia color del Rectangle.
  _setVariant(obj, key) {
    if (!this.textures.exists(key)) {
      const pal = this._placeholderPalette(key);
      if (typeof obj.setFillStyle === 'function') obj.setFillStyle(pal.fill);
      if (typeof obj.setStrokeStyle === 'function') obj.setStrokeStyle(3, pal.border);
      obj._placeholderKey = key;
    } else if (typeof obj.setTexture === 'function') {
      obj.setTexture(key);
    }
  }

  // Dibuja un fondo de cielo estrellado púrpura directamente con Phaser GameObjects.
  // No depende de generar texturas dinámicas (evita el bug del patrón verde/negro).
  _drawStarryBackground() {
    // Capa base: rectángulo púrpura oscuro de pantalla completa.
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x1a0a3a);

    // Glow púrpura central usando Graphics con relleno radial simulado (varios círculos).
    const g = this.add.graphics();
    for (let i = 0; i < 6; i++) {
      const alpha = 0.06 - i * 0.008;
      const radius = 200 + i * 70;
      g.fillStyle(0x9966cc, alpha);
      g.fillCircle(GAME_WIDTH / 2, GAME_HEIGHT / 2, radius);
    }

    // Estrellas pseudo-aleatorias deterministas.
    let seed = 12345;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const stars = this.add.graphics();
    for (let i = 0; i < 180; i++) {
      const sx = rand() * GAME_WIDTH;
      const sy = rand() * GAME_HEIGHT;
      const sr = rand() * 1.6 + 0.3;
      const a = 0.3 + rand() * 0.7;
      stars.fillStyle(0xffffff, a);
      stars.fillCircle(sx, sy, sr);
    }

    // Viñeta: cuatro rectángulos oscuros suaves en los bordes.
    const vignette = this.add.graphics();
    vignette.fillStyle(0x000000, 0.35);
    vignette.fillRect(0, 0, GAME_WIDTH, 80);
    vignette.fillRect(0, GAME_HEIGHT - 80, GAME_WIDTH, 80);
    vignette.fillRect(0, 0, 100, GAME_HEIGHT);
    vignette.fillRect(GAME_WIDTH - 100, 0, 100, GAME_HEIGHT);
  }

  showInfo() {
    if (this.infoOpen) return;
    this.infoOpen = true;

    const cx = GAME_WIDTH / 2, cy = GAME_HEIGHT / 2;

    // Modal responsivo: en móvil (ENVELOP) usamos un card angosto que entra dentro de
    // la franja visible (~420px del tablero). En escritorio (FIT) se ve todo el canvas,
    // así que podemos hacer el card más ancho. Misma altura: cabe en ambos.
    const isPortrait = typeof window !== 'undefined' && window.innerHeight > window.innerWidth;
    const cardW = isPortrait ? 380 : 520;
    const cardH = isPortrait ? 420 : 360;
    const titleSize = isPortrait ? 18 : 20;
    const itemFont  = isPortrait ? 14 : 16;
    const itemH     = isPortrait ? 50 : 42;
    const btnW      = isPortrait ? 180 : 160;
    const itemPadX  = 22;
    const itemLeftPad = isPortrait ? 22 : 28;

    // Capa: dim semi-transparente sobre toda la escena
    const dim = this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.65)
      .setInteractive();
    dim.setDepth(1000);

    // Card principal (con sombra simulada por un rectángulo desplazado detrás)
    const shadow = this.add.rectangle(cx + 6, cy + 8, cardW, cardH, 0x000000, 0.45)
      .setDepth(1001);
    const card = this.add.rectangle(cx, cy, cardW, cardH, 0x1c1330)
      .setStrokeStyle(2, 0xffd166)
      .setDepth(1002);

    // Barra superior dorada (header)
    const headerH = 48;
    const header = this.add.rectangle(cx, cy - cardH / 2 + headerH / 2, cardW, headerH, 0xffd166)
      .setDepth(1003);
    const title = this.add.text(cx, cy - cardH / 2 + headerH / 2, '¿Cómo se juega?', {
      fontFamily: 'Arial Black', fontSize: titleSize, color: '#1c1330'
    }).setOrigin(0.5).setDepth(1004);

    // Línea acento debajo del header
    const accent = this.add.rectangle(cx, cy - cardH / 2 + headerH + 1, cardW, 2, 0xff7a59)
      .setDepth(1003);

    // Contenido: viñetas con íconos circulares de color
    const items = [
      { color: 0x66ccff, text: 'Tocá las 12 casillas para revelarlas.' },
      { color: 0x66e6a3, text: '3 símbolos iguales = ganaste el premio.' },
      { color: 0xff7a59, text: '2 figuras de "La Muerte" = perdiste.' },
      { color: 0xffd166, text: 'El Comodín reemplaza a cualquier símbolo.' }
    ];
    const itemsTop = cy - cardH / 2 + headerH + 28;
    const itemX = cx - cardW / 2 + itemLeftPad;
    const items_objs = [];
    items.forEach((it, i) => {
      const y = itemsTop + i * itemH;
      const dot = this.add.circle(itemX, y, 7, it.color).setStrokeStyle(2, 0xffffff).setDepth(1003);
      const tx = this.add.text(itemX + itemPadX, y, it.text, {
        fontFamily: 'Arial', fontSize: itemFont, color: '#f0eaff',
        wordWrap: { width: cardW - itemLeftPad * 2 - itemPadX }
      }).setOrigin(0, 0.5).setDepth(1003);
      items_objs.push(dot, tx);
    });

    // Botón cerrar (pill inferior)
    const btnY = cy + cardH / 2 - 36;
    const btn = this.add.rectangle(cx, btnY, btnW, 40, 0xff7a59)
      .setStrokeStyle(2, 0xffd166).setDepth(1003)
      .setInteractive({ useHandCursor: true });
    const btnTxt = this.add.text(cx, btnY, 'ENTENDIDO', {
      fontFamily: 'Arial Black', fontSize: 14, color: '#ffffff',
      stroke: '#000000', strokeThickness: 2
    }).setOrigin(0.5).setDepth(1004);

    // Animación de entrada: scale-in con bounce
    const group = [dim, shadow, card, header, title, accent, ...items_objs, btn, btnTxt];
    card.setScale(0.7); shadow.setScale(0.7); header.setScale(0.7); title.setScale(0.7);
    accent.setScale(0.7); btn.setScale(0.7); btnTxt.setScale(0.7);
    items_objs.forEach(o => o.setScale(0.7));
    dim.alpha = 0;
    this.tweens.add({ targets: dim, alpha: 1, duration: 200 });
    this.tweens.add({
      targets: [card, shadow, header, title, accent, btn, btnTxt, ...items_objs],
      scale: 1, duration: 300, ease: 'Back.Out'
    });

    const close = () => {
      this.tweens.add({
        targets: group, alpha: 0, duration: 180,
        onComplete: () => { group.forEach(o => o.destroy()); this.infoOpen = false; }
      });
    };
    btn.on('pointerdown', close);
    dim.on('pointerdown', close);
  }
}
