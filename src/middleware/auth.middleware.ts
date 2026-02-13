import { Request, Response, NextFunction } from 'express';
import { verifyToken, JWTPayload } from '../lib/jwt.js';
import prisma from '../lib/prisma.js';

export interface AuthRequest extends Request {
  admin?: JWTPayload & { scopes: string[] };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    // Fetch admin scopes
    const adminScopes = await prisma.adminScope.findMany({
      where: { adminId: decoded.adminId },
      select: { scope: true },
    });

    req.admin = {
      ...decoded,
      scopes: adminScopes.map(s => s.scope),
    };

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const requireSuperAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.admin?.isSuperAdmin) {
    res.status(403).json({ error: 'Super admin access required' });
    return;
  }
  next();
};

export const requireScope = (allowedScopes: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (req.admin?.isSuperAdmin) {
      // Super admins have access to everything
      next();
      return;
    }

    const hasScope = req.admin?.scopes.some(scope => allowedScopes.includes(scope));
    
    if (!hasScope) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    
    next();
  };
};
