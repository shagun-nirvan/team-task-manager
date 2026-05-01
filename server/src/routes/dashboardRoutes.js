import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getDashboardStats, listTasksForUser } from '../repositories/taskRepository.js';
import { listProjectsForUser } from '../repositories/projectRepository.js';

export const dashboardRouter = Router();

dashboardRouter.get('/', requireAuth, async (req, res) => {
  const [stats, tasks, projects] = await Promise.all([
    getDashboardStats(req.user),
    listTasksForUser(req.user),
    listProjectsForUser(req.user)
  ]);

  res.json({
    stats,
    projectCount: projects.length,
    upcomingTasks: tasks.slice(0, 5)
  });
});
