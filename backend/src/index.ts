import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

// Routes (จะ import เพิ่มเมื่อสร้างแต่ละ phase)
import usersRouter from './routes/users';
import sessionsRouter from './routes/sessions';
import registrationsRouter from './routes/registrations';
import matchesRouter from './routes/matches';
import paymentsRouter from './routes/payments';
import locksRouter from './routes/locks';
import statsRouter from './routes/stats';
import adminRouter from './routes/admin';

const app = express();
const PORT = process.env.PORT ?? 4000;

// Middleware
app.use(helmet());
// รองรับ FRONTEND_URL เป็น comma-separated หลาย origin ได้
const allowedOrigins = (process.env.FRONTEND_URL ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins.length > 0
    ? (origin, callback) => {
        // อนุญาต request ที่ไม่มี origin (เช่น curl, mobile) หรือ origin ที่อยู่ใน whitelist
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`CORS: origin ${origin} not allowed`));
        }
      }
    : '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV });
});

// Routes
app.use('/api/users', usersRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/registrations', registrationsRouter);
app.use('/api/matches', matchesRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/locks', locksRouter);
app.use('/api/stats', statsRouter);
app.use('/api/admin', adminRouter);

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: true, message: err.message ?? 'Internal server error' });
});

// เรียก listen เฉพาะ local dev — Vercel ใช้ serverless ไม่ต้องการ listen
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`TeeBad API running on port ${PORT}`);
  });
}

export default app;
