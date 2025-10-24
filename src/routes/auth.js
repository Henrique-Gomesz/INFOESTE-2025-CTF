import { Router } from 'express';
import { mintToken } from '../utils/auth.js';

const router = Router();

router.get('/login', (req, res) => {
  const error = req.query.error || null;
  res.render('login', { error: error, message: null });
});

// Guia de SQL Injection (documentação para CTF)
router.get('/sqli-guide', (req, res) => {
  res.render('sqli-guide');
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
    console.log(`🔐 Tentativa de login SQLi: ${sqlStudent}`);
    const [srows] = await db.query(sqlStudent);
    console.log(srows);
  
    if (srows && srows.length) {
      console.log("XANA --------------> ",srows);
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
    res.status(401).render('login', { error: 'Credenciais inválidas', message: null });
  } catch (e) {
    res.status(500).render('login', { error: 'Erro no login: ' + e.message, message: null });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('uid');
  res.clearCookie('token');
  res.redirect('/login');
});

// Sistema de Reset de Senha VULNERÁVEL
let otpStore = {}; // Armazenamento temporário em memória (vulnerável)

// Página de esqueci minha senha
router.get('/forgot-password', (req, res) => {
  res.render('forgot-password', { error: null, message: null, showOtpForm: false, email: null, generatedOtp: null });
});

// Gerar OTP para reset de senha
router.post('/forgot-password', async (req, res) => {
  const db = req.app.locals.db;
  const { email } = req.body;
  
  try {
    // VULNERÁVEL: SQLi na verificação de email
    // Payload exemplo: ' UNION SELECT 1,'hacker' FROM students WHERE '1'='1' --
    const sqlCheck = `SELECT id, name, email FROM students WHERE email='${email}' LIMIT 1`;
    console.log(`🚨 SQL VULNERÁVEL (forgot-password): ${sqlCheck}`);
    const [rows] = await db.query(sqlCheck);
    
    if (!rows || !rows.length) {
      return res.render('forgot-password', { 
        error: 'Email não encontrado no sistema', 
        message: null, 
        showOtpForm: false, 
        email: null,
        generatedOtp: null
      });
    }

    // Gera OTP de 6 dígitos
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // VULNERABILIDADE: OTP é armazenado no cookie do usuário
    console.log(`🔐 OTP GERADO PARA ${email}: ${otp}`);
    console.log(`⚠️  VULNERABILIDADE: OTP sendo armazenado no cookie do usuário!`);
    
    // Armazena OTP temporariamente na memória (para validação server-side)
    otpStore[email] = {
      otp: otp,
      timestamp: Date.now(),
      attempts: 0
    };
    
    // VULNERABILIDADE CRÍTICA: Armazena OTP no cookie (httpOnly: false)
    const otpData = {
      email: email,
      otp: otp,
      timestamp: Date.now(),
      expires: Date.now() + (5 * 60 * 1000) // 5 minutos
    };
    
    res.cookie('reset_otp', JSON.stringify(otpData), { 
      httpOnly: false, // Vulnerabilidade: acessível via JavaScript
      maxAge: 5 * 60 * 1000, // 5 minutos
      secure: false // Vulnerabilidade: sem HTTPS
    });
    
    // Limpa OTPs expirados
    setTimeout(() => {
      if (otpStore[email]) {
        delete otpStore[email];
        console.log(`🕐 OTP para ${email} expirou e foi removido`);
      }
    }, 5 * 60 * 1000); // 5 minutos

    res.render('forgot-password', { 
      error: null, 
      message: 'Código de verificação enviado!', 
      showOtpForm: true, 
      email: email,
      generatedOtp: null
    });
    
  } catch (e) {
    res.render('forgot-password', { 
      error: 'Erro interno: ' + e.message, 
      message: null, 
      showOtpForm: false, 
      email: null,
      generatedOtp: null
    });
  }
});

// Rota VULNERÁVEL para obter OTP do cookie (para fins de CTF)
router.get('/get-otp', (req, res) => {
  const resetOtpCookie = req.cookies.reset_otp;
  
  if (!resetOtpCookie) {
    return res.json({ 
      error: 'Nenhum cookie de reset encontrado',
      message: 'Solicite um código de reset primeiro em /forgot-password',
      hint: 'VULNERABILIDADE: OTP deveria estar no cookie "reset_otp"'
    });
  }
  
  try {
    const otpData = JSON.parse(resetOtpCookie);
    
    // Verifica se não expirou
    if (Date.now() > otpData.expires) {
      return res.json({
        error: 'OTP expirado',
        message: 'Solicite um novo código'
      });
    }
    
    console.log(`🚨 OTP ACESSADO VIA COOKIE para ${otpData.email}: ${otpData.otp}`);
    
    return res.json({
      success: true,
      email: otpData.email,
      otp: otpData.otp,
      generated_at: new Date(otpData.timestamp).toISOString(),
      expires_at: new Date(otpData.expires).toISOString(),
      warning: 'VULNERABILIDADE CRÍTICA: OTP obtido do cookie não-httpOnly!'
    });
  } catch (e) {
    return res.json({
      error: 'Cookie de reset inválido',
      message: 'Solicite um novo código'
    });
  }
});

// Rota para obter OTP do próprio cookie (menos crítica, mas ainda vulnerável)
router.get('/my-otp', (req, res) => {
  const resetOtpCookie = req.cookies.reset_otp;
  
  if (!resetOtpCookie) {
    return res.json({ 
      error: 'Nenhum OTP ativo encontrado',
      message: 'Solicite um código de reset primeiro'
    });
  }
  
  try {
    const otpData = JSON.parse(resetOtpCookie);
    
    if (Date.now() > otpData.expires) {
      return res.json({
        error: 'OTP expirado',
        expired_at: new Date(otpData.expires).toISOString()
      });
    }
    
    console.log(`🚨 OTP PRÓPRIO ACESSADO VIA COOKIE para ${otpData.email}: ${otpData.otp}`);
    
    return res.json({
      success: true,
      email: otpData.email,
      otp: otpData.otp,
      generated_at: new Date(otpData.timestamp).toISOString(),
      expires_at: new Date(otpData.expires).toISOString(),
      time_remaining: Math.max(0, Math.floor((otpData.expires - Date.now()) / 1000)),
      warning: 'VULNERABILIDADE: OTP exposto via cookie não-httpOnly!'
    });
  } catch (e) {
    return res.json({
      error: 'Cookie inválido',
      message: e.message
    });
  }
});

// Rota VULNERÁVEL para listar OTPs da memória (backup/debug)
router.get('/list-otps', (req, res) => {
  console.log(`🚨 TODOS OS OTPs EM MEMÓRIA ACESSADOS VIA ROTA VULNERÁVEL`);
  
  const activeOtps = Object.keys(otpStore).map(email => ({
    email: email,
    otp: otpStore[email].otp,
    generated_at: new Date(otpStore[email].timestamp).toISOString(),
    attempts_made: otpStore[email].attempts
  }));
  
  res.json({
    success: true,
    active_otps: activeOtps,
    total_count: activeOtps.length,
    warning: 'VULNERABILIDADE CRÍTICA: OTPs em memória expostos! Use /my-otp para acessar via cookie.',
    note: 'Esta rota mostra apenas os OTPs ainda em memória no servidor'
  });
});

// Validar OTP e redefinir senha
router.post('/reset-password', async (req, res) => {
  const db = req.app.locals.db;
  const { email, otp, password, confirmPassword } = req.body;
  
  try {
    // Validações básicas
    if (password !== confirmPassword) {
      return res.render('forgot-password', { 
        error: 'As senhas não coincidem', 
        message: null, 
        showOtpForm: true, 
        email: email,
        generatedOtp: null
      });
    }

    if (password.length < 4) {
      return res.render('forgot-password', { 
        error: 'A senha deve ter pelo menos 4 caracteres', 
        message: null, 
        showOtpForm: true, 
        email: email,
        generatedOtp: null
      });
    }

    // Verifica se existe OTP para o email
    if (!otpStore[email]) {
      return res.render('forgot-password', { 
        error: 'Código expirado ou inválido. Solicite um novo código.', 
        message: null, 
        showOtpForm: false, 
        email: null,
        generatedOtp: null
      });
    }

    const storedData = otpStore[email];
    
    // Incrementa tentativas
    storedData.attempts++;

    // Vulnerabilidade: Permite múltiplas tentativas sem bloqueio adequado
    if (storedData.attempts > 10) {
      delete otpStore[email];
      return res.render('forgot-password', { 
        error: 'Muitas tentativas. Solicite um novo código.', 
        message: null, 
        showOtpForm: false, 
        email: null,
        generatedOtp: null
      });
    }

    // Verifica se OTP está correto
    if (storedData.otp !== otp) {
      console.log(`❌ Tentativa de OTP inválido para ${email}: ${otp} (correto: ${storedData.otp})`);
      return res.render('forgot-password', { 
        error: `Código incorreto. Tentativa ${storedData.attempts}/10`, 
        message: null, 
        showOtpForm: true, 
        email: email,
        generatedOtp: null
      });
    }

    // OTP válido, atualiza a senha (VULNERÁVEL: SQLi + sem hash)
    // Payload exemplo na senha: admin' WHERE email='admin@test.com'; --
    const sqlUpdate = `UPDATE students SET password='${password}' WHERE email='${email}'`;
    console.log(`🚨 SQL VULNERÁVEL (reset-password): ${sqlUpdate}`);
    await db.query(sqlUpdate);
    
    // Remove OTP usado
    delete otpStore[email];
    
    console.log(`✅ Senha redefinida com sucesso para ${email}`);
    
    res.render('login', { 
      error: null,
      message: 'Senha redefinida com sucesso! Você pode fazer login agora.'
    });
    
  } catch (e) {
    res.render('forgot-password', { 
      error: 'Erro ao redefinir senha: ' + e.message, 
      message: null, 
      showOtpForm: true, 
      email: email,
      generatedOtp: null
    });
  }
});

export default router;
