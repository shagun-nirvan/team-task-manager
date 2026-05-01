import { nanoid } from 'nanoid';
import { Task } from '../models/Task.js';
import { readLocalData, usingMongo, withTimestamps, writeLocalData } from '../services/localStore.js';
import mongoose from 'mongoose';

export const normalizeTask = (plain, data = {}) => {
  const users = data.users || [];
  const projects = data.projects || [];

  const assignee = users.find(
    (user) => user.id === plain.assignedTo
  );

  const project = projects.find(
    (p) => p.id === plain.project
  );

  return {
    ...plain,
    assignee: assignee || null,
    project: project || null
  };
};

export async function listTasksForUser(user) {
  if (usingMongo()) {
    const query = user.role === 'admin' ? {} : { assignedTo: user.id };
    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email role')
      .populate('project', 'name status')
      .sort({ dueDate: 1 })
      .lean();
    return tasks.map(normalizeTask);
  }

  const data = await readLocalData();
  const tasks = user.role === 'admin'
    ? data.tasks
    : data.tasks.filter((task) => task.assignedTo === user.id);

  return tasks.map((task) => normalizeTask(task, data));
}

export async function createTask(input) {
  if (usingMongo()) {
    const task = await Task.create(input);
    const populated = await Task.findById(task._id)
      .populate('assignedTo', 'name email role')
      .populate('project', 'name status')
      .lean();
    return normalizeTask(populated);
  }

  const data = await readLocalData();
  const task = withTimestamps({ id: nanoid(), ...input });
  data.tasks.push(task);
  await writeLocalData(data);
  return normalizeTask(task, data);
}

export async function updateTask(id, input) {
  if (usingMongo()) {
    const task = await Task.findByIdAndUpdate(id, input, { new: true })
      .populate('assignedTo', 'name email role')
      .populate('project', 'name status')
      .lean();
    return task ? normalizeTask(task) : null;
  }

  const data = await readLocalData();
  const index = data.tasks.findIndex((task) => task.id === id);
  if (index === -1) return null;

  data.tasks[index] = withTimestamps(input, data.tasks[index]);
  await writeLocalData(data);
  return normalizeTask(data.tasks[index], data);
}

export async function findTaskById(id) {
  // 🔒 Validate ID FIRST
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return null; // or throw new Error("Invalid Task ID");
  }

  if (usingMongo()) {
    const task = await Task.findById(id).lean();
    return task ? normalizeTask(task, {}) : null;
  }
}

export async function deleteTask(id) {
  // 🔒 Validate ID
  if (usingMongo()) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }

    const task = await Task.findByIdAndDelete(id);
    return task ? normalizeTask(task) : null;
  }

  // 🔁 Local DB logic
  const data = await readLocalData();
  const index = data.tasks.findIndex((task) => task.id === id);
  if (index === -1) return null;

  const [task] = data.tasks.splice(index, 1);
  await writeLocalData(data);
  return normalizeTask(task, data);
}

export async function getDashboardStats(user) {
  const tasks = await listTasksForUser(user);
  const today = new Date();
  const activeTasks = tasks.filter((task) => task.status !== 'done');

  return {
    total: tasks.length,
    todo: tasks.filter((task) => task.status === 'todo').length,
    inProgress: tasks.filter((task) => task.status === 'in-progress').length,
    done: tasks.filter((task) => task.status === 'done').length,
    overdue: activeTasks.filter((task) => new Date(task.dueDate) < today).length
  };
}
