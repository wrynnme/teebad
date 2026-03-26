import { Router } from 'express';
import { verifyLiff } from '../middleware/verifyLiff';

const router = Router();

router.get('/', verifyLiff, async (_req, res) => { res.json([]); });
router.post('/', verifyLiff, async (_req, res) => { res.json(null); });
router.delete('/:id', verifyLiff, async (_req, res) => { res.json({ ok: true }); });

export default router;
