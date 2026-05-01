import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { createProject, deleteProject, listProjectsForUser, updateProject } from '../repositories/projectRepository.js';

export const projectRouter = Router();

projectRouter.get('/', requireAuth, async (req, res) => {
  res.json({ projects: await listProjectsForUser(req.user) });
});

projectRouter.post('/', requireAuth, requireAdmin, [
  body('name').trim().isLength({ min: 2 }).withMessage('Project name is required.'),
  body('description').optional().trim(),
  body('status').isIn(['planning', 'active', 'completed']).withMessage('Invalid project status.'),
  body('members').isArray().withMessage('Members must be an array.')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ message: errors.array()[0].msg });

  const project = await createProject({
    name: req.body.name,
    description: req.body.description || '',
    status: req.body.status,
    members: [...new Set([req.user.id, ...req.body.members])],
    createdBy: req.user.id
  });

  res.status(201).json({ project });
});

projectRouter.patch('/:id', requireAuth, requireAdmin, [
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Project name is required.'),
  body('status').optional().isIn(['planning', 'active', 'completed']).withMessage('Invalid project status.'),
  body('members').optional().isArray().withMessage('Members must be an array.')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ message: errors.array()[0].msg });

  const project = await updateProject(req.params.id, req.body);
  if (!project) return res.status(404).json({ message: 'Project not found.' });

  res.json({ project });
});

projectRouter.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const project = await deleteProject(req.params.id);
  if (!project) return res.status(404).json({ message: 'Project not found.' });

  res.json({ project });
});
