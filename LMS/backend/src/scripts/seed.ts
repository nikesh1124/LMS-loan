import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDb } from '../config/db';
import { User, Role } from '../models/User';

export const SEED_PASSWORD = 'Password@123';
const accounts: { name: string; email: string; role: Role }[] = [
  { name: 'Admin User', email: 'admin@lms.com', role: 'admin' },
  { name: 'Sales Executive', email: 'sales@lms.com', role: 'sales' },
  { name: 'Sanction Executive', email: 'sanction@lms.com', role: 'sanction' },
  { name: 'Disbursement Executive', email: 'disbursement@lms.com', role: 'disbursement' },
  { name: 'Collection Executive', email: 'collection@lms.com', role: 'collection' },
  { name: 'Demo Borrower', email: 'borrower@lms.com', role: 'borrower' },
];

export async function seed() {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
  for (const a of accounts) {
    await User.updateOne({ email: a.email }, { $set: { ...a, passwordHash } }, { upsert: true });
  }
}

if (require.main === module) {
  connectDb()
    .then(seed)
    .then(() => {
      console.log(`Seeded ${accounts.length} users. Password for all: ${SEED_PASSWORD}`);
      accounts.forEach((a) => console.log(` - ${a.role.padEnd(13)} ${a.email}`));
      return mongoose.disconnect();
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
