import axios from 'axios';
import { Router } from 'express';

const router = Router();

// SSRF: busca qualquer URL fornecida pelo usuário
router.get('/fetch', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: 'url requerida' });
  try {
    const response = await axios.get(url, { responseType: 'text' });
    res.type('text').send(response.data);
  } catch (e) {
    res.status(500).send('Falha ao buscar: ' + e.message);
  }
});

export default router;