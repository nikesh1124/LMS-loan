import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { User } from '../models/User';
import { authenticate } from '../middleware/auth';

const router = Router();

function signToken(id: string, role: string) {
  return jwt.sign({ id, role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions);
}

router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body ?? {};
  if (!name || !email || !password || String(password).length < 6) {
    return res.status(400).json({ message: 'Name, email and a password of at least 6 characters are required' });
  }
  if (await User.findOne({ email: String(email).toLowerCase() })) {
    return res.status(409).json({ message: 'Email already registered' });
  }
  // Role is always forced to borrower on public signup.
  const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 10), role: 'borrower' });
  res.status(201).json({
    token: signToken(user.id, user.role),
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  const user = email ? await User.findOne({ email: String(email).toLowerCase() }) : null;
  if (!user || !(await bcrypt.compare(String(password ?? ''), user.passwordHash))) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  res.json({
    token: signToken(user.id, user.role),
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

router.get('/me', authenticate, async (req, res) => {
  const user = await User.findById(req.user!.id);
  if (!user) return res.status(401).json({ message: 'User no longer exists' });
  res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

export default router;
