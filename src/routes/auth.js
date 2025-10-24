import { Router } from 'express';
import { mintToken } from '../utils/auth.js';

const router = Router();

router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// Registro de novo usuário (inseguro: sem validação, SQL concatenado)
router.get('/register', (req, res) => {
  res.render('register', { error: null, message: null });
});

router.post('/register', async (req, res) => {
  const db = req.app.locals.db;
  const { name, email, password } = req.body;
  const address = req.body.address || 'Endereço não informado';
  try {
    // Cria um ESTUDANTE com senha (inseguro: senha em texto)
    const sqlStudent = `INSERT INTO students (user_id, name, email, password, address, advisor_id) VALUES (NULL, '${name}', '${email}', '${password}', '${address}', NULL)`;
    await db.query(sqlStudent);
    res.status(201).render('register', { error: null, message: 'Estudante criado com sucesso. Você já pode fazer login.' });
  } catch (e) {
    res.status(400).render('register', { error: 'Erro ao cadastrar estudante: ' + e.message, message: null });
  }
});

// Vulnerável: SQLi em login
router.post('/login', async (req, res) => {
  const db = req.app.locals.db;
  const { email, password } = req.body;
  try {
    // Primeiro: tenta autenticar como estudante
    const sqlStudent = `SELECT id, name, role FROM students WHERE email='${email}' AND password='${password}' LIMIT 1`;
    const [srows] = await db.query(sqlStudent);
    if (srows && srows.length) {
      const stu = srows[0];
      res.cookie('uid', String(stu.id), { httpOnly: false }); // uid agora aponta para student.id
      const token = mintToken({ id: stu.id, name: stu.name, role: stu.role || 'student', subject: 'student' });
      res.cookie('token', token, { httpOnly: false });
      return res.redirect('/');
    }
    // Fallback: autentica em users (legado)
    const sqlUser = `SELECT id, name, role FROM users WHERE email='${email}' AND password='${password}' LIMIT 1`;
    const [urows] = await db.query(sqlUser);
    if (urows && urows.length) {
      const user = urows[0];
      res.cookie('uid', String(user.id), { httpOnly: false });
      const token = mintToken({ id: user.id, name: user.name, role: user.role, subject: 'user' });
      res.cookie('token', token, { httpOnly: false });
      return res.redirect('/');
    }
    res.status(401).render('login', { error: 'Credenciais inválidas' });
  } catch (e) {
    res.status(500).render('login', { error: 'Erro no login: ' + e.message });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('uid');
  res.clearCookie('token');
  res.redirect('/login');
});

export default router;
