import { Schema, model, Document, Types } from 'mongoose';

export const STATUSES = ['PERSONAL_DETAILS', 'APPLIED', 'SANCTIONED', 'REJECTED', 'DISBURSED', 'CLOSED'] as const;
export type LoanStatus = (typeof STATUSES)[number];
export const EMPLOYMENT_MODES = ['Salaried', 'Self-Employed', 'Unemployed'] as const;
export type EmploymentMode = (typeof EMPLOYMENT_MODES)[number];

export interface IApplication extends Document {
  user: Types.ObjectId;
  fullName: string;
  pan: string;
  dob: Date;
  monthlySalary: number;
  employmentMode: EmploymentMode;
  salarySlip?: { path: string; originalName: string; mimeType: string; size: number };
  amount?: number;
  tenureDays?: number;
  interestRate: number;
  simpleInterest?: number;
  totalRepayment?: number;
  totalPaid: number;
  status: LoanStatus;
  rejectionReason?: string;
  appliedAt?: Date;
  sanctionedAt?: Date;
  rejectedAt?: Date;
  disbursedAt?: Date;
  closedAt?: Date;
}

const applicationSchema = new Schema<IApplication>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fullName: { type: String, required: true },
    pan: { type: String, required: true },
    dob: { type: Date, required: true },
    monthlySalary: { type: Number, required: true },
    employmentMode: { type: String, enum: EMPLOYMENT_MODES, required: true },
    salarySlip: { path: String, originalName: String, mimeType: String, size: Number },
    amount: Number,
    tenureDays: Number,
    interestRate: { type: Number, default: 12 },
    simpleInterest: Number,
    totalRepayment: Number,
    totalPaid: { type: Number, default: 0 },
    status: { type: String, enum: STATUSES, default: 'PERSONAL_DETAILS', index: true },
    rejectionReason: String,
    appliedAt: Date,
    sanctionedAt: Date,
    rejectedAt: Date,
    disbursedAt: Date,
    closedAt: Date,
  },
  { timestamps: true }
);

export const Application = model<IApplication>('Application', applicationSchema);
