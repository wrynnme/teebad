import { Router } from 'express';
import { verifyLiff } from '../middleware/verifyLiff';

const router = Router();

router.get('/leaderboard', verifyLiff, async (_req, res) => { res.json([]); });
router.get('/session/:id', verifyLiff, async (_req, res) => { res.json(null); });
router.get('/player/:userId', verifyLiff, async (_req, res) => { res.json(null); });

export default router;
