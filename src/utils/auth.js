import jwt from 'jsonwebtoken';

const SECRET = process.env.SESSION_SECRET || 'inseguro';

// Middleware de sessão: verifica o JWT com a assinatura SESSION_SECRET
export function insecureDecodeJwt(req, res, next) {
  const auth = req.headers['authorization'] || '';
  const token = (auth.startsWith('Bearer ') ? auth.substring(7) : null)
    || req.cookies.token
    || req.query.token;
  try {
    if (token) {
      // Verifica a assinatura do JWT usando SESSION_SECRET
      const payload = jwt.verify(token, SECRET, { algorithms: ['HS256'] });
      req.user = payload;
    } else {
      req.user = null;
    }
  } catch (err) {
    // Token inválido ou expirado - limpa o cookie e redireciona para login
    console.log(`⚠️  Token inválido: ${err.message}`);
    res.clearCookie('token');
    req.user = null;
    
    // Se for uma requisição de página HTML, redireciona para login
    const acceptHeader = req.get('accept') || '';
    if (acceptHeader.includes('text/html')) {
      return res.redirect('/login.html?error=' + encodeURIComponent('Sessão expirada ou token inválido. Faça login novamente.'));
    }
    
    // Se for uma requisição de API, retorna erro 401
    return res.status(401).json({
      success: false,
      error: 'Token inválido ou expirado'
    });
  }
  res.locals.user = req.user;
  res.locals.isAdmin = !!(req.user && req.user.role === 'admin');
  res.locals.uid = (req.user && req.user.id) || null;
  next();
}

// Checagem de admin (com base no payload verificado do JWT)
export function requireAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') return next();
  return res.status(403).send('Acesso restrito a admin (JWT).');
}

// Utilitário para emitir token (assinado com SESSION_SECRET)
export function mintToken(claims) {
  // Assina o token com SESSION_SECRET da variável de ambiente
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
  const user = req.user;
  
  // Verifica se tem user no JWT
  if (user && user.id) {
    return next();
  }
  
  // Redireciona para login se não autenticado
  return res.redirect('/login?error=' + encodeURIComponent('Você precisa estar logado para acessar esta página'));
}
