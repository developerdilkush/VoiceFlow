import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { connectDb } from '../config/db.js';
import { AdminUser } from '../models/index.js';

const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || '';
if (!env.mongoUri) { console.error('MONGODB_URI is not set'); process.exit(1); }
if (!email || password.length < 10) { console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD (min 10 chars) in .env, then run again.'); process.exit(1); }

await connectDb();
if (await AdminUser.exists({ email })) { console.error('An administrator with this email already exists.'); process.exit(1); }
await AdminUser.create({ email, displayName: process.env.ADMIN_NAME || 'Administrator', passwordHash: await bcrypt.hash(password, 12) });
console.log(`Administrator created: ${email}\nNow remove ADMIN_PASSWORD from your .env file.`);
await mongoose.disconnect();
