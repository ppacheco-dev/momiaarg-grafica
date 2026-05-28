// Serverless function para Vercel. Reemplaza al server Express en producción.
// En local seguimos usando server/index.js con el proxy de Vite.
// Vercel la expone automáticamente como POST /api/play.
import { generatePlay } from '../server/gameLogic.js';

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
  winChance: 0.5,
  loseChance: 0.25,
  baseBet: 1500
};

// En serverless no podemos mantener estado en memoria entre invocaciones,
// así que el playNumber se calcula a partir de la marca de tiempo.
function nextPlayNumber() {
  return 1000000 + (Date.now() % 9000000);
}

export default function handler(req, res) {
  if (req.method === 'GET' && req.url?.includes('health')) {
    return res.status(200).json({ ok: true });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const catalog = req.body?.catalog ?? DEFAULT_CATALOG;
    const result = generatePlay(catalog);
    return res.status(200).json({ playNumber: nextPlayNumber(), ...result });
  } catch (err) {
    console.error('[api/play] error:', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}
