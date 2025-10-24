import { Router } from 'express';
import { exec } from 'child_process';
import { requireAdmin } from '../utils/auth.js';

const router = Router();

// Lista cursos
router.get('/', async (req, res) => {
  const db = req.app.locals.db;
  const [rows] = await db.query('SELECT id, code, title, seats FROM courses ORDER BY id ASC');
  res.render('courses', { courses: rows });
});

// Race condition: matrícula sem transação (dupla matrícula além das vagas)
router.post('/:id/enroll', async (req, res) => {
  const db = req.app.locals.db;
  // Inseguro: usa cookie uid como student_id; se ausente, usa 1 como fallback para facilitar o lab
  const uid = parseInt(req.cookies.uid, 10) || 1;
  const courseId = req.params.id;
  try {
    const [rows] = await db.query(`SELECT seats FROM courses WHERE id=${courseId}`);
    if (!rows.length) return res.status(404).send('Curso não encontrado');
    const seats = rows[0].seats;
    if (seats <= 0) return res.status(400).send('Sem vagas');
    await db.query(`INSERT INTO enrollments (student_id, course_id) VALUES (${uid}, ${courseId})`);
    // Decrementa após inserir, sem transação/lock -> condição de corrida
    await db.query(`UPDATE courses SET seats = seats - 1 WHERE id=${courseId}`);
    res.redirect('/courses');
  } catch (e) {
    res.status(500).send('Erro: ' + e.message);
  }
});

export default router;
// Admin: excluir curso (inseguro: SQL concatenado, sem transação)
router.post('/:id/delete', requireAdmin, async (req, res) => {
  const db = req.app.locals.db;
  const id = req.params.id;
  try {
    await db.query(`DELETE FROM enrollments WHERE course_id=${id}`);
    await db.query(`DELETE FROM grades WHERE course_id=${id}`);
    await db.query(`DELETE FROM courses WHERE id=${id}`);
    res.redirect('/courses');
  } catch (e) {
    res.status(500).send('Erro: ' + e.message);
  }
});
