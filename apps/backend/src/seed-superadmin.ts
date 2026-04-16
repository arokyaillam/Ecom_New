import 'dotenv/config';
import { db } from './db/index.js';
import { superAdmins } from './db/schema.js';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

async function seed() {
  console.log('Seeding super admin...');

  const hashedPassword = await bcrypt.hash('Admin1234', SALT_ROUNDS);

  const [admin] = await db.insert(superAdmins).values({
    email: 'admin@saasplatform.com',
    password: hashedPassword,
    name: 'Super Admin',
    isActive: true,
  }).onConflictDoNothing().returning();

  if (admin) {
    console.log('Super admin created:', admin.email);
  } else {
    console.log('Super admin already exists');
  }

  process.exit(0);
}

seed().catch(console.error);