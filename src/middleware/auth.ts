import type { Request, Response, NextFunction } from 'express';
import { auth } from '../auth';
import { UserRole } from '../types';


export interface AuthenticatedRequest<
  Params = any,
  ResBody = any,
  ReqBody = any,
  ReqQuery = any
> extends Request<Params, ResBody, ReqBody, ReqQuery> {
  user?: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
  };
}

export const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    req.user = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: (session.user.role as UserRole) ?? UserRole.AGENT,
    };
    next();
  } catch (error) {
    console.error('Auth Middleware Error:', error);
    res.status(500).json({ error: 'Internal Server Error during authentication' });
  }
};

