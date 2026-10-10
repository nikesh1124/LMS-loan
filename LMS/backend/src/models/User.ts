import { Schema, model, Document } from 'mongoose';

export const ROLES = ['admin', 'sales', 'sanction', 'disbursement', 'collection', 'borrower'] as const;
export type Role = (typeof ROLES)[number];

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  createdAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ROLES, default: 'borrower', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const User = model<IUser>('User', userSchema);
