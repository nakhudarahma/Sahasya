import { Request, Response, NextFunction } from 'express';
import { supabase } from '../../config/supabase.config';

export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
    return;
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error('Supabase Auth Error:', error?.message || 'No user found for token');
      res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
      return;
    }

    // Attach user to request object
    (req as any).user = user;
    next();
  } catch (err: any) {
    // If it's a network/fetch error (timeout), don't return 401
    if (err.message?.includes('fetch failed') || err.code === 'UND_ERR_CONNECT_TIMEOUT') {
      console.error('CRITICAL: Auth Service Unreachable (Network Error)', err);
      res.status(503).json({ 
        success: false, 
        error: 'Authentication service is temporarily unreachable. Check your internet connection.' 
      });
      return;
    }
    next(err);
  }
};

export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return next();

  try {
    const { data: { user } } = await supabase.auth.getUser(token);
    if (user) (req as any).user = user;
    next();
  } catch (err) {
    next();
  }
};
