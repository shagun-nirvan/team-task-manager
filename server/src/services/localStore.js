import fs from 'fs/promises';
import path from 'path';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

const dataDir = path.resolve('server/data');
const dataFile = path.join(dataDir, 'local-db.json');

async function defaultData() {
  const adminId = nanoid();
  const memberId = nanoid();
  const projectId = nanoid();

  return {
    users: [
      {
        id: adminId,
        name: 'Aarav Admin',
        email: 'admin@example.com',
        passwordHash: await bcrypt.hash('Admin@123', 10),
        role: 'admin',
        createdAt: new Date().toISOString()
      },
      {
        id: memberId,
        name: 'Meera Member',
        email: 'member@example.com',
        passwordHash: await bcrypt.hash('Member@123', 10),
        role: 'member',
        createdAt: new Date().toISOString()
      }
    ],
    projects: [
      {
        id: projectId,
        name: 'Website Launch',
        description: 'Coordinate launch tasks for the new marketing site.',
        status: 'active',
        members: [adminId, memberId],
        createdBy: adminId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ],
    tasks: [
      {
        id: nanoid(),
        title: 'Prepare QA checklist',
        description: 'Cover mobile, auth, dashboard, and form validation paths.',
        status: 'in-progress',
        priority: 'high',
        dueDate: new Date(Date.now() + 86400000).toISOString(),
        project: projectId,
        assignedTo: memberId,
        createdBy: adminId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]
  };
}

export function usingMongo() {
  return Boolean(process.env.MONGO_URI);
}

export async function seedLocalDatabase() {
  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(dataFile);
  } catch {
    await writeLocalData(await defaultData());
  }
}

export async function readLocalData() {
  await seedLocalDatabase();
  const raw = await fs.readFile(dataFile, 'utf8');
  return JSON.parse(raw);
}

export async function writeLocalData(data) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(dataFile, JSON.stringify(data, null, 2));
}

export function publicUser(user) {
  if (!user) return null;
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

export function withTimestamps(entity, existing = {}) {
  const now = new Date().toISOString();
  return {
    ...existing,
    ...entity,
    updatedAt: now,
    createdAt: existing.createdAt || now
  };
}
