const express      = require('express');
const cors         = require('cors');
const compression  = require('compression');
const helmet       = require('helmet');
const rateLimit    = require('express-rate-limit');
const multer       = require('multer');
const path         = require('path');
const fs           = require('fs');

const config       = require('./config/config');
const errorHandler = require('./middleware/errorHandler');
const { pool }     = require('./db/pool');

// ── Routes ────────────────────────────────────────────────────────────────
const uploadRoutes   = require('./routes/uploadRoutes');
const questionRoutes = require('./routes/questionRoutes');
const summaryRoutes  = require('./routes/summaryRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const examRoutes     = require('./routes/examRoutes');
const chatRoutes     = require('./routes/chatRoutes');
const writtenRoutes  = require('./routes/writtenRoutes');
const vivaRoutes     = require('./routes/vivaRoutes');
const authRoutes     = require('./routes/authRoutes');
const { authenticateToken } = require('./middleware/auth');

const app = express();

// ── Security & Compression ────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false })); // CSP handled by Nginx
app.use(compression());
app.set('trust proxy', 1); // required when behind Nginx lb

// ── CORS ──────────────────────────────────────────────────────────────────
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ── Rate Limiting ─────────────────────────────────────────────────────────
// Global: 300 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests — please try again later.' },
});
app.use(globalLimiter);

// Strict: AI generation routes — 60 per 15 minutes per IP
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'AI rate limit reached — please slow down.' },
});

// ── Upload directory ──────────────────────────────────────────────────────
if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

// ── Multer — PDF ──────────────────────────────────────────────────────────
const pdfStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, config.uploadDir),
  filename:    (req, file, cb) => {
    const suffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'pdf-' + suffix + path.extname(file.originalname));
  },
});
const upload = multer({
  storage: pdfStorage,
  limits: { fileSize: config.maxFileSize },
  fileFilter: (req, file, cb) => {
    file.mimetype === 'application/pdf'
      ? cb(null, true)
      : cb(new Error('Only PDF files are allowed'), false);
  },
});

// ── Multer — Image ────────────────────────────────────────────────────────
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, config.uploadDir),
  filename:    (req, file, cb) => {
    const suffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'image-' + suffix + path.extname(file.originalname));
  },
});
const uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    file.mimetype.startsWith('image/')
      ? cb(null, true)
      : cb(new Error('Only image files are allowed'), false);
  },
});

// ── Request logging ───────────────────────────────────────────────────────
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} [${process.pid}] ${req.method} ${req.path}`);
  next();
});

// ── Health check ──────────────────────────────────────────────────────────
app.get('/health', async (req, res) => {
  try {
    const dbQueries = require('./db/queries');
    const hasNotes = await dbQueries.hasActiveNotes();
    res.json({
      status:      'Server running',
      notesLoaded: hasNotes,
      db:          'connected',
      pid:         process.pid,
      uptime:      Math.floor(process.uptime()),
      version:     config.groqModel,
      timestamp:   new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({
      status:      'offline',
      notesLoaded: false,
      db:          'disconnected',
      error:       err.message,
    });
  }
});

// ── Public Auth Routes ────────────────────────────────────────────────────
app.use('/auth', authRoutes);

// ── API Routes (Protected) ────────────────────────────────────────────────
app.use('/upload',            authenticateToken, upload.array('files', 10),           uploadRoutes);
app.use('/generate-questions', authenticateToken, aiLimiter,                          questionRoutes);
app.use('/summarize',          authenticateToken, aiLimiter,                          summaryRoutes);
app.use('/study-schedule',     authenticateToken, aiLimiter,                          scheduleRoutes);
app.use('/mock-exam',          authenticateToken, aiLimiter,                          examRoutes);
app.use('/chat',               authenticateToken, aiLimiter,                          chatRoutes);
app.use('/evaluate-written',   authenticateToken, aiLimiter, uploadImage.single('image'), writtenRoutes);
app.use('/viva',               authenticateToken, aiLimiter,                          vivaRoutes);

// ── 404 ───────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// ── Error handler ─────────────────────────────────────────────────────────
app.use(errorHandler);

const { initializeDatabase } = require('./db/init');

// ── Start ─────────────────────────────────────────────────────────────────
async function startServer() {
  try {
    await initializeDatabase();
    app.listen(config.port, () => {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🎯  STUDY BUDDY AI — Backend');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`✅  Listening on port  ${config.port}  (PID ${process.pid})`);
      console.log(`🗄️  Database:          ${process.env.DATABASE_URL ? 'configured' : 'NOT SET'}`);
      console.log(`🤖  AI Model:          ${config.groqModel}`);
      console.log(`🌐  CORS origin:       ${config.corsOrigin}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    });
  } catch (err) {
    console.error('❌ Failed to start Study Buddy AI server:', err.message);
    process.exit(1);
  }
}

startServer();

// ── Graceful shutdown ─────────────────────────────────────────────────────
async function shutdown(signal) {
  console.log(`\n🛑 ${signal} received — closing DB pool and shutting down…`);
  await pool.end();
  process.exit(0);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

module.exports = app;
