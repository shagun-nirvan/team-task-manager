import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { createUser, findUserByEmail, listUsers } from '../repositories/userRepository.js';

export const userRouter = Router();

userRouter.get('/', requireAuth, async (_req, res) => {
  res.json({ users: await listUsers() });
});

userRouter.post('/', requireAuth, requireAdmin, [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters.'),
  body('email').isEmail().withMessage('Enter a valid email.').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
  body('role').isIn(['admin', 'member']).withMessage('Invalid role.')
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
    role: req.body.role
  });

  res.status(201).json({ user });
});
