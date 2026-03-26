import { Router } from 'express';
import { verifyLiff } from '../middleware/verifyLiff';
import { isAdmin } from '../middleware/isAdmin';

const router = Router();

router.get('/dashboard', verifyLiff, isAdmin, async (_req, res) => { res.json(null); });
router.get('/payments/pending', verifyLiff, isAdmin, async (_req, res) => { res.json([]); });
router.patch('/users/:userId', verifyLiff, isAdmin, async (_req, res) => { res.json(null); });
router.post('/sessions/:id/end', verifyLiff, isAdmin, async (_req, res) => { res.json({ ok: true }); });

export default router;
