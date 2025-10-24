import { Router } from 'express';
import { requireAdmin, requireStudentSelfOrAdmin, requireAuth } from '../utils/auth.js';

const router = Router();

// Aplica autenticação obrigatória para todas as rotas de estudantes
router.use(requireAuth);

// Lista estudantes com pesquisa refletida (XSS refletido)
router.get('/', async (req, res) => {
  const db = req.app.locals.db;
  const q = req.query.q || '';
  try {
    // VULNERÁVEL: SQLi via LIKE com UNION SELECT possível
    // Payload exemplo: %' UNION SELECT 1,'admin','admin@test.com' -- 
    const sql = q ? `SELECT id, name, email FROM students WHERE name LIKE '%${q}%'` : 'SELECT id, name, email FROM students';
    console.log(`🚨 SQL VULNERÁVEL: ${sql}`);
    const [rows] = await db.query(sql);
    res.render('students', { students: rows, q });
  } catch (e) {
    console.log(`❌ Erro SQL: ${e.message}`);
    // Em caso de erro, retorna lista vazia para não quebrar
    res.render('students', { students: [], q, error: 'Erro na consulta: ' + e.message });
  }
});

// IDOR: qualquer usuário pode acessar qualquer perfil por ID
router.get('/:id', async (req, res) => {
  const db = req.app.locals.db;
  const id = req.params.id;
  try {
    // VULNERÁVEL: SQLi via parâmetro ID com UNION SELECT
    // Payload exemplo: 1 UNION SELECT 1,'hacker','hacker@evil.com','secret_address','admin'--
    const sql1 = `SELECT s.id, s.name, s.email, s.address, COALESCE(u.name, 'Sem orientador') as advisor FROM students s LEFT JOIN users u ON u.id = s.advisor_id WHERE s.id=${id}`;
    console.log(`🚨 SQL VULNERÁVEL (student): ${sql1}`);
    const [rows] = await db.query(sql1);
    
    if (!rows.length) {
      return res.render('student', { 
        student: null, 
        comments: [], 
        error: 'Aluno não encontrado ou consulta inválida' 
      });
    }
    
    // Comentários com XSS armazenado - também vulnerável
    const sql2 = `SELECT c.id, c.body, c.author_id, COALESCE(u.name, 'Anônimo') as author FROM comments c LEFT JOIN users u ON u.id = c.author_id WHERE c.student_id=${id} ORDER BY c.created_at DESC`;
    console.log(`🚨 SQL VULNERÁVEL (comments): ${sql2}`);
    
    let comments = [];
    try {
      const [commentRows] = await db.query(sql2);
      comments = commentRows;
    } catch (commentErr) {
      console.log(`❌ Erro nos comentários: ${commentErr.message}`);
    }
    
    res.render('student', { student: rows[0], comments });
  } catch (e) {
    console.log(`❌ Erro SQL: ${e.message}`);
    res.render('student', { 
      student: null, 
      comments: [], 
      error: 'Erro na consulta: ' + e.message 
    });
  }
});

// XSS armazenado: inserir comentário sem sanitização
router.post('/:id/comments', async (req, res) => {
  const db = req.app.locals.db;
  const id = req.params.id;
  const uid = req.cookies.uid || 1; // Fallback para não quebrar
  const { body } = req.body;
  try {
    // VULNERÁVEL: SQLi no INSERT com VALUES concatenados
    // Payload exemplo no body: '), (1, 1, 'injected comment'); --
    const sql = `INSERT INTO comments (student_id, author_id, body) VALUES (${id}, ${uid}, '${body}')`;
    console.log(`🚨 SQL VULNERÁVEL (insert comment): ${sql}`);
    await db.query(sql);
    res.redirect(`/students/${id}`);
  } catch (e) {
    console.log(`❌ Erro SQL: ${e.message}`);
    // Redireciona mesmo com erro para não quebrar o fluxo
    res.redirect(`/students/${id}?error=` + encodeURIComponent(e.message));
  }
});

// Mass Assignment: atualiza qualquer campo do aluno a partir do corpo
router.post('/:id/update', requireStudentSelfOrAdmin, async (req, res) => {
  const db = req.app.locals.db;
  const id = req.params.id;
  const payload = req.body; // Inseguro: sem whitelist, pode alterar campos sensíveis
  
  try {
    // VULNERÁVEL: SQLi via campos do formulário + Mass Assignment
    // Payload exemplo: name=admin', role='admin' WHERE id=1; --
    const sets = Object.keys(payload)
      .filter(k => payload[k]) // Remove campos vazios
      .map(k => `${k}='${payload[k]}'`)
      .join(', ');
    
    if (!sets) {
      return res.redirect(`/students/${id}?error=Nenhum campo para atualizar`);
    }
    
    const sql = `UPDATE students SET ${sets} WHERE id=${id}`;
    console.log(`🚨 SQL VULNERÁVEL (update): ${sql}`);
    await db.query(sql);
    res.redirect(`/students/${id}?success=Perfil atualizado`);
  } catch (e) {
    console.log(`❌ Erro SQL: ${e.message}`);
    res.redirect(`/students/${id}?error=` + encodeURIComponent(e.message));
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
