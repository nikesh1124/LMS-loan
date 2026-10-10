import { Router } from 'express';
import mongoose from 'mongoose';
import { Application } from '../models/Application';
import { Payment } from '../models/Payment';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { round2 } from '../services/loanMath';

const router = Router();
router.use(authenticate, requireRole('collection'));

const withOutstanding = (loan: any) => ({
  ...loan.toObject(),
  outstanding: round2((loan.totalRepayment ?? 0) - loan.totalPaid),
});

router.get('/loans', async (_req, res) => {
  const loans = await Application.find({ status: 'DISBURSED' })
    .populate('user', 'name email')
    .sort({ disbursedAt: 1 });
  res.json({ loans: loans.map(withOutstanding) });
});

router.get('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Loan not found' });
  const loan = await Application.findById(req.params.id).populate('user', 'name email');
  if (!loan) return res.status(404).json({ message: 'Loan not found' });
  const payments = await Payment.find({ application: loan._id }).sort({ paidOn: 1 });
  res.json({ loan: withOutstanding(loan), payments });
});

router.post('/:id/payments', async (req, res) => {
  const utr = String(req.body?.utr ?? '').trim().toUpperCase();
  const amount = round2(Number(req.body?.amount));
  const paidOn = new Date(req.body?.paidOn);
  if (!utr) return res.status(400).json({ message: 'UTR number is required' });
  if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ message: 'Amount must be greater than 0' });
  if (isNaN(paidOn.getTime())) return res.status(400).json({ message: 'Valid payment date is required' });
  if (paidOn.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
    return res.status(400).json({ message: 'Payment date cannot be in the future' });
  }
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Loan not found' });

  const loan = await Application.findById(req.params.id);
  if (!loan) return res.status(404).json({ message: 'Loan not found' });
  if (loan.status !== 'DISBURSED') return res.status(409).json({ message: 'Loan is not active (must be DISBURSED)' });
  const outstanding = round2((loan.totalRepayment ?? 0) - loan.totalPaid);
  if (amount > outstanding) {
    return res.status(400).json({ message: `Amount exceeds outstanding balance of ${outstanding}` });
  }

  let payment;
  try {
    payment = await Payment.create({ application: loan._id, utr, amount, paidOn, recordedBy: req.user!.id });
  } catch (err: any) {
    if (err?.code === 11000) return res.status(409).json({ message: 'UTR number already used' });
    throw err;
  }

  // Atomic increment guarded by the same outstanding check to avoid overpayment races.
  const updated = await Application.findOneAndUpdate(
    { _id: loan._id, status: 'DISBURSED', totalPaid: { $lte: round2(loan.totalRepayment! - amount) + 0.001 } },
    { $inc: { totalPaid: amount } },
    { returnDocument: 'after' }
  );
  if (!updated) {
    await payment.deleteOne();
    return res.status(409).json({ message: 'Loan changed while recording payment, please retry' });
  }
  updated.totalPaid = round2(updated.totalPaid);
  if (updated.totalPaid >= round2(updated.totalRepayment!)) {
    updated.status = 'CLOSED';
    updated.closedAt = new Date();
  }
  await updated.save();
  res.status(201).json({ payment, loan: withOutstanding(updated) });
});

export default router;
