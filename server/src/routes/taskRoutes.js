import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { findProjectById, updateProject } from '../repositories/projectRepository.js';
import { createTask, deleteTask, findTaskById, listTasksForUser, updateTask } from '../repositories/taskRepository.js';

export const taskRouter = Router();

function projectMemberIds(project) {
  return (project.members || []).map((member) => member.id || member._id?.toString?.() || member.toString?.() || member);
}

taskRouter.get('/', requireAuth, async (req, res) => {
  res.json({ tasks: await listTasksForUser(req.user) });
});

taskRouter.post('/', requireAuth, requireAdmin, [
  body('title').trim().isLength({ min: 2 }).withMessage('Task title is required.'),
  body('description').optional().trim(),
  body('status').isIn(['todo', 'in-progress', 'done']).withMessage('Invalid task status.'),
  body('priority').isIn(['low', 'medium', 'high']).withMessage('Invalid priority.'),
  body('dueDate').isISO8601().withMessage('Valid due date is required.'),
  body('project').notEmpty().withMessage('Project is required.'),
  body('assignedTo').notEmpty().withMessage('Assignee is required.')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ message: errors.array()[0].msg });

  const project = await findProjectById(req.body.project);
  if (!project) return res.status(404).json({ message: 'Project not found.' });

  const members = projectMemberIds(project);
  if (!members.includes(req.body.assignedTo)) {
    await updateProject(project.id, { members: [...members, req.body.assignedTo] });
  }

  const task = await createTask({
    title: req.body.title,
    description: req.body.description || '',
    status: req.body.status,
    priority: req.body.priority,
    dueDate: req.body.dueDate,
    project: req.body.project,
    assignedTo: req.body.assignedTo,
    createdBy: req.user.id
  });

  res.status(201).json({ task });
});

taskRouter.patch('/:id', requireAuth, [
  body('title').optional().trim().isLength({ min: 2 }).withMessage('Task title is required.'),
  body('status').optional().isIn(['todo', 'in-progress', 'done']).withMessage('Invalid task status.'),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority.'),
  body('dueDate').optional().isISO8601().withMessage('Valid due date is required.')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ message: errors.array()[0].msg });

 const { id } = req.params;                    // ➜ ADD (above)
if (!id) return res.status(400).json({ message: "Task ID is required" });  // ➜ ADD

const existingTask = await findTaskById(id);
  if (!existingTask) return res.status(404).json({ message: 'Task not found.' });

  if (req.user.role !== 'admin' && existingTask.assignedTo !== req.user.id) {
    return res.status(403).json({ message: 'You can only update tasks assigned to you.' });
  }

  const allowedInput = req.user.role === 'admin'
    ? req.body
    : { status: req.body.status };

  if (req.user.role === 'admin') {
    const targetProjectId = allowedInput.project || existingTask.project;
    const targetAssigneeId = allowedInput.assignedTo || existingTask.assignedTo;

    if (targetProjectId && targetAssigneeId) {
      const project = await findProjectById(targetProjectId);
      if (!project) return res.status(404).json({ message: 'Project not found.' });

      const members = projectMemberIds(project);
      if (!members.includes(targetAssigneeId)) {
        await updateProject(project.id, { members: [...members, targetAssigneeId] });
      }
    }
  }

  const task = await updateTask(id, allowedInput);

  res.json({ task });
});

taskRouter.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;   // ➜ ADD
if (!id) return res.status(400).json({ message: "Task ID is required" }); 

console.log("DELETE ID:", id);

const task = await deleteTask(id); 
  if (!task) return res.status(404).json({ message: 'Task not found.' });

  res.json({ task });
});
