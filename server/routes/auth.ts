import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { storage } from '../storage';
import { generateToken, auth, AuthRequest } from '../middleware/auth';
import { insertUserSchema } from '@shared/schema';
import cookieParser from 'cookie-parser';
import session from 'express-session';

const router = Router();

// Configure middleware
router.use(cookieParser());
router.use(session({
  secret: process.env.JWT_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  },
  store: storage.sessionStore
}));

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user);

    // Set both session and JWT token
    req.session.user = user;
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current user
router.get('/me', auth, (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  const { password: _, ...userWithoutPassword } = req.user;
  res.json(userWithoutPassword);
});

// Logout route
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ message: 'Error logging out' });
    }
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
  });
});

export default router;