import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { requireAuth, signToken } from '../middleware/auth.js';
import { createUser, findUserByEmail } from '../repositories/userRepository.js';
import { publicUser } from '../services/localStore.js';

export const authRouter = Router();

authRouter.post('/signup', [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters.'),
  body('email').isEmail().withMessage('Enter a valid email.').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ message: errors.array()[0].msg });

  const existing = await findUserByEmail(req.body.email);
  if (existing) return res.status(409).json({ message: 'Email is already registered.' });

  const passwordHash = await bcrypt.hash(req.body.password, 10);
  const user = await createUser({
    name: req.body.name,
    email: req.body.email.toLowerCase(),
    passwordHash,
    role: 'member'
  });

  res.status(201).json({ user, token: signToken(user) });
});

authRouter.post('/login', [
  body('email').isEmail().withMessage('Enter a valid email.').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required.')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ message: errors.array()[0].msg });

  const user = await findUserByEmail(req.body.email);
  const passwordOk = user ? await bcrypt.compare(req.body.password, user.passwordHash) : false;

  if (!passwordOk) return res.status(401).json({ message: 'Invalid email or password.' });

  res.json({ user: publicUser(user), token: signToken(user) });
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});
