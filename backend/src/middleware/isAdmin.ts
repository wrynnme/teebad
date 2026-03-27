import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';

export async function isAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = req.user?.userId;

  if (!userId) {
    res.status(401).json({ error: true, message: 'Unauthorized' });
    return;
  }

  const { data, error } = await supabase
    .from('users')
    .select('is_admin')
    .eq('line_user_id', userId)
    .single();

  if (error || !data?.is_admin) {
    res.status(403).json({ error: true, message: 'ไม่มีสิทธิ์ admin' });
    return;
  }

  next();
}
