import { Router } from 'express';
import { requireAdmin, requireStudentSelfOrAdmin } from '../utils/auth.js';

const router = Router();

// Lista estudantes com pesquisa refletida (XSS refletido)
router.get('/', async (req, res) => {
  const db = req.app.locals.db;
  const q = req.query.q || '';
  try {
    // Inseguro: LIKE + concat pode permitir SQLi básico
    const sql = q ? `SELECT id, name, email FROM students WHERE name LIKE '${q}'` : 'SELECT id, name, email FROM students';
    console.log(sql);
    const [rows] = await db.query(sql);
    res.render('students', { students: rows, q });
  } catch (e) {
    res.status(500).send('Erro: ' + e.message);
  }
});

// IDOR: qualquer usuário pode acessar qualquer perfil por ID
router.get('/:id', async (req, res) => {
  const db = req.app.locals.db;
  const id = req.params.id;
  try {
    const [rows] = await db.query(`SELECT s.id, s.name, s.email, s.address, u.name as advisor FROM students s LEFT JOIN users u ON u.id = s.advisor_id WHERE s.id=${id}`);
    if (!rows.length) return res.status(404).send('Aluno não encontrado');
    // Comentários com XSS armazenado
    const [comments] = await db.query(`SELECT c.id, c.body, c.author_id, u.name as author FROM comments c JOIN users u ON u.id = c.author_id WHERE c.student_id=${id} ORDER BY c.created_at DESC`);
    res.render('student', { student: rows[0], comments });
  } catch (e) {
    res.status(500).send('Erro: ' + e.message);
  }
});

// XSS armazenado: inserir comentário sem sanitização
router.post('/:id/comments', async (req, res) => {
  const db = req.app.locals.db;
  const id = req.params.id;
  const uid = req.cookies.uid || null; // Inseguro: sem autenticação real
  const { body } = req.body;
  try {
    await db.query(`INSERT INTO comments (student_id, author_id, body) VALUES (${id}, ${uid || 'NULL'}, '${body}')`);
    res.redirect(`/students/${id}`);
  } catch (e) {
    res.status(500).send('Erro: ' + e.message);
  }
});

// Mass Assignment: atualiza qualquer campo do aluno a partir do corpo
router.post('/:id/update', requireStudentSelfOrAdmin, async (req, res) => {
  const db = req.app.locals.db;
  const id = req.params.id;
  const payload = req.body; // Inseguro: sem whitelist, pode alterar campos sensíveis
  const sets = Object.keys(payload).map(k => `${k}='${payload[k]}'`).join(',');
  try {
    await db.query(`UPDATE students SET ${sets} WHERE id=${id}`);
    res.redirect(`/students/${id}`);
  } catch (e) {
    res.status(500).send('Erro: ' + e.message);
  }
});

export default router;
// Admin: excluir estudante (inseguro: SQL concatenado, sem transação)
router.post('/:id/delete', requireAdmin, async (req, res) => {
  const db = req.app.locals.db;
  const id = req.params.id;
  try {
    await db.query(`DELETE FROM comments WHERE student_id=${id}`);
    await db.query(`DELETE FROM enrollments WHERE student_id=${id}`);
    await db.query(`DELETE FROM grades WHERE student_id=${id}`);
    await db.query(`DELETE FROM students WHERE id=${id}`);
    res.redirect('/students');
  } catch (e) {
    res.status(500).send('Erro: ' + e.message);
  }
});

// Excluir comentário: permitido para admin, dono do perfil (student_id) ou autor do comentário
router.post('/:id/comments/:commentId/delete', async (req, res) => {
  const db = req.app.locals.db;
  const studentId = String(req.params.id);
  const commentId = req.params.commentId;
  const isAdmin = !!(req.user && req.user.role === 'admin');
  const uid = (req.user && req.user.id) || req.cookies.uid || null;
  try {
    const [rows] = await db.query(`SELECT id, student_id, author_id FROM comments WHERE id=${commentId}`);
    if (!rows.length) return res.status(404).send('Comentário não encontrado');
    const c = rows[0];
    const isProfileOwner = uid && String(uid) === String(c.student_id);
    const isAuthor = uid && String(uid) === String(c.author_id);
    if (!(isAdmin || isProfileOwner || isAuthor)) {
      return res.status(403).send('Você não pode excluir este comentário.');
    }
    await db.query(`DELETE FROM comments WHERE id=${commentId}`);
    res.redirect(`/students/${studentId}`);
  } catch (e) {
    res.status(500).send('Erro: ' + e.message);
  }
});
