import express from 'express';
import cors from 'cors';
import { generatePlay } from './gameLogic.js';

const app = express();
app.use(cors());
app.use(express.json());

// Configuración por defecto del catálogo de símbolos.
// El cliente puede sobrescribirla mandando su propio catálogo (leído del manifest).
const DEFAULT_CATALOG = {
  symbols: [
    { id: 'x1',     prize: 1,     weight: 30 },
    { id: 'x2',     prize: 2,     weight: 20 },
    { id: 'x10',    prize: 10,    weight: 15 },
    { id: 'x20',    prize: 20,    weight: 12 },
    { id: 'x200',   prize: 200,   weight: 8  },
    { id: 'x1000',  prize: 1000,  weight: 6  },
    { id: 'x2000',  prize: 2000,  weight: 4  },
    { id: 'x20000', prize: 20000, weight: 2  }
  ],
  wildcardId: 'comodin',
  wildcardWeight: 6,
  deathId: 'muerte',
  deathWeight: 10,
  // Probabilidad de que la jugada se "fuerce" a ser ganadora/perdedora (RTP simulado).
  winChance: 0.35,
  loseChance: 0.25,
  baseBet: 1500
};

let playCounter = 1234567;

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.post('/api/play', (req, res) => {
  const catalog = req.body?.catalog ?? DEFAULT_CATALOG;
  const result = generatePlay(catalog);
  playCounter += 1;
  res.json({ playNumber: playCounter, ...result });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[server] API lista en http://localhost:${PORT}`);
});
