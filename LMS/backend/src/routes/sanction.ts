import { Router } from 'express';
import { Application } from '../models/Application';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();
router.use(authenticate, requireRole('sanction'));

router.get('/applications', async (_req, res) => {
  const applications = await Application.find({ status: 'APPLIED' })
    .populate('user', 'name email')
    .sort({ appliedAt: 1 });
  res.json({ applications });
});

router.post('/:id/approve', async (req, res) => {
  const app = await Application.findOneAndUpdate(
    { _id: req.params.id, status: 'APPLIED' },
    { status: 'SANCTIONED', sanctionedAt: new Date() },
    { returnDocument: 'after' }
  );
  if (!app) return res.status(409).json({ message: 'Application not found or not in APPLIED state' });
  res.json({ application: app });
});

router.post('/:id/reject', async (req, res) => {
  const reason = String(req.body?.reason ?? '').trim();
  if (!reason) return res.status(400).json({ message: 'Rejection reason is required' });
  const app = await Application.findOneAndUpdate(
    { _id: req.params.id, status: 'APPLIED' },
    { status: 'REJECTED', rejectionReason: reason, rejectedAt: new Date() },
    { returnDocument: 'after' }
  );
  if (!app) return res.status(409).json({ message: 'Application not found or not in APPLIED state' });
  res.json({ application: app });
});

export default router;
