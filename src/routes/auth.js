import { Router } from 'express';
import { mintToken } from '../utils/auth.js';

const router = Router();

// Registro de novo usuário (inseguro: sem validação, SQL concatenado)
router.post('/register', async (req, res) => {
  const { User } = req.app.locals.models;
  const { name, email, password } = req.body;
  try {
    // Gera número de conta curto automaticamente
    const lastUser = await User.findOne({
      order: [['id', 'DESC']],
      attributes: ['id']
    });
    const nextId = lastUser ? lastUser.id + 1 : 1;
    const accountNumber = `${Math.floor(nextId / 1000) || 1}-${String(nextId).padStart(3, '0')}`;
    
    // Cria um usuário com senha (inseguro: senha em texto)
    const user = await User.create({
      name,
      email,
      password,
      account_number: accountNumber,
      balance: 0
    });
    res.status(201).json({ 
      success: true,
      message: 'Usuário criado com sucesso. Você já pode fazer login.',
      user: { id: user.id, name: user.name, email: user.email, account_number: user.account_number }
    });
  } catch (e) {
    res.status(400).json({ 
      success: false,
      error: 'Erro ao cadastrar usuário: ' + e.message 
    });
  }
});

router.post('/login', async (req, res) => {
  const { User } = req.app.locals.models;
  const { email, password } = req.body;

  try {
    // Tenta autenticar usuário
    const user = await User.findOne({
      where: {
        email,
        password
      },
      attributes: ['id', 'name', 'role'],
      raw: true
    });

    if (user) {
      console.log("Usuário autenticado: ", user);
      const token = mintToken({ id: user.id, name: user.name, role: user.role || 'user', subject: 'user' });
      
      res.cookie('uid', String(user.id), { httpOnly: false });
      res.cookie('token', token, { httpOnly: false });
      
      return res.json({ 
        success: true,
        message: 'Login realizado com sucesso',
        user: { id: user.id, name: user.name, role: user.role },
        token
      });
    }

    res.status(401).json({ 
      success: false,
      error: 'Credenciais inválidas' 
    });
  } catch (e) {
    res.status(500).json({ 
      success: false,
      error: 'Erro no login: ' + e.message 
    });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('uid');
  res.clearCookie('token');
  res.json({ 
    success: true,
    message: 'Logout realizado com sucesso' 
  });
});

// Sistema de Reset de Senha VULNERÁVEL
let otpStore = {}; // Armazenamento temporário em memória (vulnerável)

// Gerar OTP para reset de senha
router.post('/forgot-password', async (req, res) => {
  const { User } = req.app.locals.models;
  const { email } = req.body;

  try {
    // Busca usuário por email
    const user = await User.findOne({
      where: { email },
      attributes: ['id', 'name', 'email'],
      raw: true
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Email não encontrado no sistema'
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

    res.json({
      success: true,
      message: 'Código de verificação enviado!',
      email: email
    });

  } catch (e) {
    res.status(500).json({
      success: false,
      error: 'Erro interno: ' + e.message
    });
  }
});

// Validar OTP e redefinir senha
router.post('/reset-password', async (req, res) => {
  const { User } = req.app.locals.models;
  const { email, otp, password, confirmPassword } = req.body;

  try {
    // Validações básicas
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'As senhas não coincidem'
      });
    }

    if (password.length < 4) {
      return res.status(400).json({
        success: false,
        error: 'A senha deve ter pelo menos 4 caracteres'
      });
    }

    // Verifica se existe OTP para o email
    if (!otpStore[email]) {
      return res.status(400).json({
        success: false,
        error: 'Código expirado ou inválido. Solicite um novo código.'
      });
    }

    const storedData = otpStore[email];

    // Incrementa tentativas
    storedData.attempts++;

    // Vulnerabilidade: Permite múltiplas tentativas sem bloqueio adequado
    if (storedData.attempts > 10) {
      delete otpStore[email];
      return res.status(429).json({
        success: false,
        error: 'Muitas tentativas. Solicite um novo código.'
      });
    }

    // Verifica se OTP está correto
    if (storedData.otp !== otp) {
      console.log(`❌ Tentativa de OTP inválido para ${email}: ${otp} (correto: ${storedData.otp})`);
      return res.status(400).json({
        success: false,
        error: `Código incorreto. Tentativa ${storedData.attempts}/10`
      });
    }

    // OTP válido, atualiza a senha (sem hash - inseguro)
    await User.update(
      { password },
      { where: { email } }
    );

    // Remove OTP usado
    delete otpStore[email];

    console.log(`✅ Senha redefinida com sucesso para ${email}`);

    res.json({
      success: true,
      message: 'Senha redefinida com sucesso! Você pode fazer login agora.'
    });

  } catch (e) {
    res.status(500).json({
      success: false,
      error: 'Erro ao redefinir senha: ' + e.message
    });
  }
});

export default router;
