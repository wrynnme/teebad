import { Router } from 'express';
import { verifyLiff } from '../middleware/verifyLiff';

const router = Router();

router.get('/billing/:sessionId', verifyLiff, async (_req, res) => { res.json(null); });
router.post('/', verifyLiff, async (_req, res) => { res.json(null); });
router.patch('/:id/approve', verifyLiff, async (_req, res) => { res.json(null); });
router.patch('/:id/reject', verifyLiff, async (_req, res) => { res.json(null); });
router.post('/billing/:sessionId/notify-all', verifyLiff, async (_req, res) => { res.json({ ok: true }); });

export default router;
