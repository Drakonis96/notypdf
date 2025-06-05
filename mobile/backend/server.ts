import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// simple in-memory store for saved notes
let counter = 1;

app.get('/ping', (_req, res) => {
  res.json({ ok: true });
});

app.post('/notion/save-text-with-identifier', (req, res) => {
  const { config, text } = req.body;
  if (!config || !text) {
    return res.status(400).json({ success: false, error: 'Missing config or text' });
  }
  const identifier = `MOB${String(counter).padStart(3, '0')}`;
  counter += 1;
  res.json({ success: true, identifier });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Mobile backend running on port ${PORT}`);
});
