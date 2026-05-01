import { nanoid } from 'nanoid';
import { Project } from '../models/Project.js';
import { Task } from '../models/Task.js';
import { readLocalData, usingMongo, withTimestamps, writeLocalData } from '../services/localStore.js';

function normalizeProject(project, users = []) {
  const members = (project.members || []).map((member) => {
    if (typeof member === 'object' && member.name) {
      return { id: member._id?.toString?.() || member.id, name: member.name, email: member.email, role: member.role };
    }

    const user = users.find((candidate) => candidate.id === member);
    return user ? { id: user.id, name: user.name, email: user.email, role: user.role } : member?._id?.toString?.() || member?.toString?.() || member;
  });

  return {
    ...project,
    id: project._id?.toString?.() || project.id,
    members
  };
}

export async function listProjectsForUser(user) {
  if (usingMongo()) {
    const query = user.role === 'admin' ? {} : { members: user.id };
    const projects = await Project.find(query).populate('members', 'name email role').sort({ updatedAt: -1 }).lean();
    return projects.map((project) => normalizeProject(project));
  }

  const data = await readLocalData();
  const projects = user.role === 'admin'
    ? data.projects
    : data.projects.filter((project) => project.members.includes(user.id));

  return projects.map((project) => normalizeProject(project, data.users));
}

export async function createProject(input) {
  if (usingMongo()) {
    const project = await Project.create(input);
    const populated = await Project.findById(project._id).populate('members', 'name email role').lean();
    return normalizeProject(populated);
  }

  const data = await readLocalData();
  const project = withTimestamps({ id: nanoid(), ...input });
  data.projects.push(project);
  await writeLocalData(data);
  return normalizeProject(project, data.users);
}

export async function updateProject(id, input) {
  if (usingMongo()) {
    const project = await Project.findByIdAndUpdate(id, input, { new: true }).populate('members', 'name email role').lean();
    return project ? normalizeProject(project) : null;
  }

  const data = await readLocalData();
  const index = data.projects.findIndex((project) => project.id === id);
  if (index === -1) return null;

  data.projects[index] = withTimestamps(input, data.projects[index]);
  await writeLocalData(data);
  return normalizeProject(data.projects[index], data.users);
}

export async function findProjectById(id) {
  if (usingMongo()) {
    const project = await Project.findById(id).lean();
    return project ? normalizeProject(project) : null;
  }

  const data = await readLocalData();
  return data.projects.find((project) => project.id === id) || null;
}

export async function deleteProject(id) {
  if (usingMongo()) {
    const project = await Project.findByIdAndDelete(id).lean();
    if (!project) return null;
    await Task.deleteMany({ project: id });
    return normalizeProject(project);
  }

  const data = await readLocalData();
  const index = data.projects.findIndex((project) => project.id === id);
  if (index === -1) return null;

  const [project] = data.projects.splice(index, 1);
  data.tasks = data.tasks.filter((task) => task.project !== id);
  await writeLocalData(data);
  return normalizeProject(project, data.users);
}
