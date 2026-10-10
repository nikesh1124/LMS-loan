export type Role = 'admin' | 'sales' | 'sanction' | 'disbursement' | 'collection' | 'borrower';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export type LoanStatus = 'PERSONAL_DETAILS' | 'APPLIED' | 'SANCTIONED' | 'REJECTED' | 'DISBURSED' | 'CLOSED';

export interface Loan {
  _id: string;
  user?: { name: string; email: string } | string;
  fullName: string;
  pan: string;
  dob: string;
  monthlySalary: number;
  employmentMode: string;
  salarySlip?: { path?: string; originalName?: string };
  amount?: number;
  tenureDays?: number;
  interestRate: number;
  simpleInterest?: number;
  totalRepayment?: number;
  totalPaid: number;
  outstanding?: number;
  status: LoanStatus;
  rejectionReason?: string;
  createdAt: string;
}

export interface Payment {
  _id: string;
  utr: string;
  amount: number;
  paidOn: string;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  registeredAt: string;
  stage: string;
}

export const MODULES: { role: Exclude<Role, 'admin' | 'borrower'>; label: string; href: string }[] = [
  { role: 'sales', label: 'Sales', href: '/dashboard/sales' },
  { role: 'sanction', label: 'Sanction', href: '/dashboard/sanction' },
  { role: 'disbursement', label: 'Disbursement', href: '/dashboard/disbursement' },
  { role: 'collection', label: 'Collection', href: '/dashboard/collection' },
];

export const homeFor = (role: Role): string =>
  role === 'borrower' ? '/apply' : role === 'admin' ? '/dashboard/sales' : `/dashboard/${role}`;

export const inr = (n = 0): string =>
  '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
