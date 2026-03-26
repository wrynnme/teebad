import { Request, Response, NextFunction } from 'express';

// ขยาย Express Request ให้มี user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        displayName?: string;
        pictureUrl?: string;
      };
    }
  }
}

export async function verifyLiff(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: true, message: 'Missing authorization token' });
    return;
  }

  const idToken = authHeader.slice(7);

  try {
    // ตรวจสอบ LIFF ID Token กับ LINE API
    const response = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        id_token: idToken,
        client_id: process.env.LIFF_CHANNEL_ID ?? '',
      }),
    });

    if (!response.ok) {
      res.status(401).json({ error: true, message: 'Invalid LIFF token' });
      return;
    }

    const payload = await response.json() as { sub: string; name?: string; picture?: string };
    req.user = {
      userId: payload.sub,
      displayName: payload.name,
      pictureUrl: payload.picture,
    };

    next();
  } catch (err) {
    console.error('verifyLiff error:', err);
    res.status(500).json({ error: true, message: 'Token verification failed' });
  }
}
