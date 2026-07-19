const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { loadEnv } = require('./config/env');
const { connectDatabase } = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const authRoutes = require('./routes/authRoutes');
const yearRoutes = require('./routes/yearRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');

const env = loadEnv();
const app = express();
const isLocalClient = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(env.clientUrl);
const allowedOrigins = new Set([
  env.clientUrl,
  'https://attendance-tracker-blond.vercel.app',
].filter(Boolean));

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet());
const isAllowedOrigin = (origin) => {
  if (!origin || allowedOrigins.has(origin)) return true;
  if (isLocalClient && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return true;
  if (/^https:\/\/attendance-tracker-[a-z0-9-]+\.vercel\.app$/.test(origin)) return true;
  return false;
};

app.use(cors({
  origin(origin, callback) {
    const allowed = isAllowedOrigin(origin);
    callback(allowed ? null : new Error('This browser origin is not allowed.'), allowed);
  },
  credentials: true,
}));
if (env.nodeEnv === 'production' && !isLocalClient) {
  app.use((req, res, next) => (req.secure ? next() : res.status(400).json({ message: 'HTTPS is required.' })));
}
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false, message: { message: 'Too many sign-in attempts. Please wait 15 minutes and try again.' } });
app.use('/api', apiLimiter);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/years', yearRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/attendance', attendanceRoutes);

app.use(notFound);
app.use(errorHandler);

connectDatabase(env.mongoUri)
  .then(() => app.listen(env.port, () => console.log(`API listening on port ${env.port}`)))
  .catch((error) => {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  });
