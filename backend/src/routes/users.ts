import { Router } from 'express';
import { verifyLiff } from '../middleware/verifyLiff';

const router = Router();

// POST /api/users/sync — upsert user หลัง LIFF login
router.post('/sync', verifyLiff, async (_req, res) => {
  res.json({ ok: true });
});

export default router;
