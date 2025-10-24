import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import { createPool } from './utils/db.js';
import ejsLayouts from 'express-ejs-layouts';
import authRoutes from './routes/auth.js';
import studentRoutes from './routes/students.js';
import courseRoutes from './routes/courses.js';
import adminRoutes from './routes/admin.js';
import utilRoutes from './routes/utils.js';
import { insecureDecodeJwt } from './utils/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// View engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(ejsLayouts);
app.set('layout', 'layout');

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Attach db pool (insecurely global)
app.locals.db = await createPool();

// Ajuste de schema em tempo de execução (inseguro/rápido para o lab)
try {
  await app.locals.db.query("ALTER TABLE students ADD COLUMN password VARCHAR(100) NULL");
} catch (e) {
  // ignora se já existe
}

// Sessão baseada em JWT (insegura)
app.use(insecureDecodeJwt);

// Routes
app.use('/', authRoutes);
app.use('/students', studentRoutes);
app.use('/courses', courseRoutes);
app.use('/admin', adminRoutes);
app.use('/utils', utilRoutes);

// Nova página principal pública
app.get('/', (req, res) => {
  res.render('home');
});

// Dashboard antigo movido para rota própria
app.get('/dashboard', async (req, res) => {
  const db = req.app.locals.db;
  const [rows] = await db.query('SELECT a.id, a.title, a.body, u.name as author FROM announcements a JOIN users u ON u.id = a.author_id ORDER BY a.created_at DESC');
  res.render('dashboard', { announcements: rows });
});

// Health
app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`[unilab] Servidor iniciado na porta ${PORT}`);
});
