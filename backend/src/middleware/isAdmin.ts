import { Request, Response, NextFunction } from 'express';

export function isAdmin(req: Request, res: Response, next: NextFunction): void {
  const userId = req.user?.userId;

  if (!userId) {
    res.status(401).json({ error: true, message: 'Unauthorized' });
    return;
  }

  const adminIds = (process.env.ADMIN_LINE_USER_IDS ?? '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean);

  if (!adminIds.includes(userId)) {
    res.status(403).json({ error: true, message: 'ไม่มีสิทธิ์ admin' });
    return;
  }

  next();
}
