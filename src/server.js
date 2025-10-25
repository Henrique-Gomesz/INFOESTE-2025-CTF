import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { createSequelize } from './utils/db.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import utilRoutes from './routes/utils.js';
import postRoutes from './routes/posts.js';
import { insecureDecodeJwt } from './utils/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// CORS - Permite chamadas do frontend
app.use(cors({
  origin: true, // Em produção, especifique o domínio
  credentials: true
}));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Attach sequelize instance
const sequelize = await createSequelize();
app.locals.sequelize = sequelize;
app.locals.models = sequelize.models;

// Sessão baseada em JWT (insegura)
app.use(insecureDecodeJwt);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/utils', utilRoutes);
app.use('/api/posts', postRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Serve o frontend estático
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Middleware para rota não encontrada (404)
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ 
      error: 'Rota não encontrada',
      message: `A rota ${req.originalUrl} não existe.`
    });
  }
  next();
});

// Middleware de tratamento de erros global
app.use((err, req, res, next) => {
  // Log do erro no console para debug
  console.error('❌ Erro capturado pelo middleware:', err);
  console.error('Stack trace:', err.stack);
  
  // Determina o status code
  const statusCode = err.statusCode || err.status || 500;
  
  // Mensagem de erro (não expõe detalhes em produção)
  const message = process.env.NODE_ENV === 'production' 
    ? 'Ocorreu um erro interno no servidor' 
    : err.message;
  
  // Retorna JSON para todas as requisições
  return res.status(statusCode).json({
    error: message,
    status: statusCode,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

app.listen(PORT, () => {
  console.log(`[banco-digital] Servidor iniciado na porta ${PORT}`);
});

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
  console.error('❌ EXCEÇÃO NÃO CAPTURADA:', error);
  console.error('Stack trace:', error.stack);
  // Em produção, você pode querer reiniciar o processo graciosamente
  // process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ PROMESSA REJEITADA NÃO TRATADA:', reason);
  console.error('Promise:', promise);
  // Em produção, você pode querer reiniciar o processo graciosamente
  // process.exit(1);
});

// Tratamento de shutdown gracioso
process.on('SIGTERM', async () => {
  console.log('⚠️  SIGTERM recebido, encerrando aplicação...');
  if (app.locals.sequelize) {
    await app.locals.sequelize.close();
    console.log('✅ Conexões com banco de dados fechadas');
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n⚠️  SIGINT recebido, encerrando aplicação...');
  if (app.locals.sequelize) {
    await app.locals.sequelize.close();
    console.log('✅ Conexões com banco de dados fechadas');
  }
  process.exit(0);
});
