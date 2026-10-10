import { Request, Response, NextFunction } from 'express';
import { Role } from '../models/User';

/** Allows the listed roles. Admin may also access every dashboard module (but not borrower routes). */
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.user?.role;
    if (!role) return res.status(401).json({ message: 'Authentication required' });
    const allowed = roles.includes(role) || (role === 'admin' && !roles.includes('borrower'));
    if (!allowed) return res.status(403).json({ message: 'Forbidden: insufficient role' });
    next();
  };
}
