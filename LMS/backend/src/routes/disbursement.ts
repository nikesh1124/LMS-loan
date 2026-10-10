import { Router } from 'express';
import { Application } from '../models/Application';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();
router.use(authenticate, requireRole('disbursement'));

router.get('/loans', async (_req, res) => {
  const loans = await Application.find({ status: 'SANCTIONED' })
    .populate('user', 'name email')
    .sort({ sanctionedAt: 1 });
  res.json({ loans });
});

// SANCTIONED -> DISBURSED (loan becomes active for collection)
router.post('/:id/disburse', async (req, res) => {
  const loan = await Application.findOneAndUpdate(
    { _id: req.params.id, status: 'SANCTIONED' },
    { status: 'DISBURSED', disbursedAt: new Date() },
    { returnDocument: 'after' }
  );
  if (!loan) return res.status(409).json({ message: 'Loan not found or not in SANCTIONED state' });
  res.json({ loan });
});

export default router;
