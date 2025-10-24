import { Router } from 'express';
import axios from 'axios';
import { mintToken } from '../utils/auth.js';

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
// Rota para cunhar JWTs inseguros com claims arbitrárias
router.get('/jwt/mint', (req, res) => {
  const { uid, role = 'student', name = 'User' } = req.query;
  const id = uid ? parseInt(uid, 10) : undefined;
  const token = mintToken({ id, role, name });
  res.type('text').send(token);
});
