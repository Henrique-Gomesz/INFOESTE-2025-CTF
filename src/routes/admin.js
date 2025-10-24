import { Router } from 'express';
import { exec } from 'child_process';

const router = Router();

// BOLA: acessa notas por ID sem verificar se pertencem ao usuário
router.get('/grades/:id', async (req, res) => {
  const db = req.app.locals.db;
  const gradeId = req.params.id;
  try {
    const [rows] = await db.query(`SELECT g.id, g.grade, s.name as student, c.title as course FROM grades g JOIN students s ON s.id=g.student_id JOIN courses c ON c.id=g.course_id WHERE g.id=${gradeId}`);
    if (!rows.length) return res.status(404).send('Nota não encontrada');
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// RCE: executa comando arbitrário (perigoso!)
router.get('/exec', (req, res) => {
  const cmd = req.query.cmd || 'whoami';
  exec(cmd, (err, stdout, stderr) => {
    if (err) return res.status(500).send('Erro: ' + err.message);
    res.type('text').send(stdout + stderr);
  });
});

export default router;
