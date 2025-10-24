import { Router } from 'express';
import { exec } from 'child_process';
import { requireAdmin, requireAuth } from '../utils/auth.js';

const router = Router();

// Aplica autenticação obrigatória para todas as rotas de cursos
router.use(requireAuth);

// Lista cursos com filtro vulnerável
router.get('/', async (req, res) => {
  const db = req.app.locals.db;
  const search = req.query.search || '';
  
  try {
    let sql;
    if (search) {
      // VULNERÁVEL: SQLi via parâmetro search
      // Payload exemplo: ' UNION SELECT 1,'HACKED','SQL Injection Course',999 --
      sql = `SELECT id, code, title, seats FROM courses WHERE title LIKE '%${search}%' OR code LIKE '%${search}%' ORDER BY id ASC`;
    } else {
      sql = 'SELECT id, code, title, seats FROM courses ORDER BY id ASC';
    }
    
    console.log(`🚨 SQL VULNERÁVEL (courses): ${sql}`);
    const [rows] = await db.query(sql);
    res.render('courses', { courses: rows, search });
  } catch (e) {
    console.log(`❌ Erro SQL: ${e.message}`);
    res.render('courses', { courses: [], search, error: 'Erro na consulta: ' + e.message });
  }
});

// Race condition: matrícula sem transação (dupla matrícula além das vagas)
router.post('/:id/enroll', async (req, res) => {
  const db = req.app.locals.db;
  const uid = parseInt(req.cookies.uid, 10) || 1;
  const courseId = req.params.id;
  
  try {
    // VULNERÁVEL: SQLi via courseId
    // Payload exemplo: 1; DROP TABLE courses; --
    const sql1 = `SELECT id, code, title, seats FROM courses WHERE id=${courseId}`;
    console.log(`🚨 SQL VULNERÁVEL (enroll check): ${sql1}`);
    const [rows] = await db.query(sql1);
    
    if (!rows.length) {
      return res.redirect('/courses?error=' + encodeURIComponent('Curso não encontrado'));
    }
    
    const course = rows[0];
    if (course.seats <= 0) {
      return res.redirect('/courses?error=' + encodeURIComponent('Sem vagas disponíveis'));
    }
    
    // Verifica se já está matriculado
    const checkSql = `SELECT id FROM enrollments WHERE student_id=${uid} AND course_id=${courseId}`;
    console.log(`🚨 SQL VULNERÁVEL (enrollment check): ${checkSql}`);
    const [existing] = await db.query(checkSql);
    
    if (existing.length > 0) {
      return res.redirect('/courses?error=' + encodeURIComponent('Você já está matriculado neste curso'));
    }
    
    // Insere matrícula
    const insertSql = `INSERT INTO enrollments (student_id, course_id) VALUES (${uid}, ${courseId})`;
    console.log(`🚨 SQL VULNERÁVEL (insert enrollment): ${insertSql}`);
    await db.query(insertSql);
    
    // Decrementa vagas (race condition)
    const updateSql = `UPDATE courses SET seats = seats - 1 WHERE id=${courseId}`;
    console.log(`🚨 SQL VULNERÁVEL (update seats): ${updateSql}`);
    await db.query(updateSql);
    
    res.redirect('/courses?success=' + encodeURIComponent(`Matriculado em ${course.title} com sucesso!`));
  } catch (e) {
    console.log(`❌ Erro SQL: ${e.message}`);
    res.redirect('/courses?error=' + encodeURIComponent('Erro na matrícula: ' + e.message));
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
