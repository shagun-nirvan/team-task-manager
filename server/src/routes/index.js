import { Router } from 'express';
import { authRouter } from './authRoutes.js';
import { dashboardRouter } from './dashboardRoutes.js';
import { projectRouter } from './projectRoutes.js';
import { taskRouter } from './taskRoutes.js';
import { userRouter } from './userRoutes.js';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/dashboard', dashboardRouter);
apiRouter.use('/projects', projectRouter);
apiRouter.use('/tasks', taskRouter);
apiRouter.use('/users', userRouter);
