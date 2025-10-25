import jwt from 'jsonwebtoken';

const SECRET = process.env.SESSION_SECRET || 'inseguro';

// Middleware de sessão inseguro: decodifica o JWT sem verificar assinatura
export function insecureDecodeJwt(req, res, next) {
  const auth = req.headers['authorization'] || '';
  const token = (auth.startsWith('Bearer ') ? auth.substring(7) : null)
    || req.cookies.token
    || req.query.token;
  try {
    if (token) {
      // Inseguro: usa decode (sem verify) — qualquer um pode forjar role=admin
      const payload = jwt.decode(token) || {};
      req.user = payload;
    } else {
      req.user = null;
    }
  } catch (_) {
    req.user = null;
  }
  res.locals.user = req.user;
  res.locals.isAdmin = !!(req.user && req.user.role === 'admin');
  res.locals.uid = (req.user && req.user.id) || req.cookies.uid || null;
  next();
}

// Checagem simples de admin (com base no payload não verificado)
export function requireAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') return next();
  return res.status(403).send('Acesso restrito a admin (JWT).');
}

// Utilitário para emitir token (assinado com segredo fraco)
export function mintToken(claims) {
  // Inseguro: sem expiração, segredo fraco
  return jwt.sign(claims, SECRET, { algorithm: 'HS256' });
}

// Middleware: exige que o alvo (:id) seja o próprio usuário autenticado OU admin
export function requireUserSelfOrAdmin(req, res, next) {
  const user = req.user || null;
  const targetId = String(req.params.id || '');
  if (user && user.role === 'admin') return next();
  if (user && (user.subject === 'user' || typeof user.subject === 'undefined') && String(user.id) === targetId) {
    return next();
  }
  return res.status(403).send('IDOR bloqueado: você não pode alterar este usuário.');
}

// Middleware: exige autenticação (usuário logado)
export function requireAuth(req, res, next) {
  const uid = req.cookies.uid;
  const user = req.user;
  
  // Verifica se tem uid no cookie OU user no JWT
  if (uid || (user && user.id)) {
    return next();
  }
  
  // Redireciona para login se não autenticado
  return res.redirect('/login?error=' + encodeURIComponent('Você precisa estar logado para acessar esta página'));
}
