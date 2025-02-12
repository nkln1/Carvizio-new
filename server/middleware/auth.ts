import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '@shared/schema';
import { storage } from '../storage';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface AuthRequest extends Request {
  user?: User;
}

export const generateToken = (user: User): string => {
  return jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
};

export const auth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Check session first
    if (req.session && req.session.user) {
      req.user = req.session.user;
      return next();
    }

    // Then check JWT token
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
    const user = await storage.getUser(decoded.id);

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Set both session and request user
    req.session.user = user;
    req.user = user;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(401).json({ message: 'Token is not valid' });
  }
};