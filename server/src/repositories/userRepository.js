import { nanoid } from 'nanoid';
import { User } from '../models/User.js';
import { publicUser, readLocalData, usingMongo, writeLocalData } from '../services/localStore.js';

export async function createUser(input) {
  if (usingMongo()) {
    const user = await User.create(input);
    return user.toJSON();
  }

  const data = await readLocalData();
  const user = {
    id: nanoid(),
    ...input,
    createdAt: new Date().toISOString()
  };
  data.users.push(user);
  await writeLocalData(data);
  return publicUser(user);
}

export async function findUserByEmail(email) {
  if (usingMongo()) {
    const user = await User.findOne({ email: email.toLowerCase() }).lean();
    return user ? { ...user, id: user._id.toString() } : null;
  }

  const data = await readLocalData();
  return data.users.find((user) => user.email === email.toLowerCase()) || null;
}

export async function findUserById(id) {
  if (usingMongo()) {
    const user = await User.findById(id).lean();
    return user ? { ...user, id: user._id.toString() } : null;
  }

  const data = await readLocalData();
  return data.users.find((user) => user.id === id) || null;
}

export async function listUsers() {
  if (usingMongo()) {
    const users = await User.find().select('-passwordHash').sort({ name: 1 }).lean();
    return users.map((user) => ({ ...user, id: user._id.toString() }));
  }

  const data = await readLocalData();
  return data.users.map(publicUser).sort((a, b) => a.name.localeCompare(b.name));
}
