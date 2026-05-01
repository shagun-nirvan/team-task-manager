import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';

export async function seedMongoDatabase() {
  const userCount = await User.countDocuments();
  if (userCount > 0) return;

  await User.create({
    name: 'Aarav Admin',
    email: 'admin@example.com',
    passwordHash: await bcrypt.hash('Admin@123', 10),
    role: 'admin'
  });
}
