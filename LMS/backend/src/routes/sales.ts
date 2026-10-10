import { Router } from 'express';
import { User } from '../models/User';
import { Application } from '../models/Application';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();
router.use(authenticate, requireRole('sales'));

// Leads: registered borrowers who have not yet submitted a loan application.
router.get('/leads', async (_req, res) => {
  const appliedUsers = await Application.distinct('user', { status: { $ne: 'PERSONAL_DETAILS' } });
  const borrowers = await User.find({ role: 'borrower', _id: { $nin: appliedUsers } })
    .select('name email createdAt')
    .sort({ createdAt: -1 });
  const drafts = await Application.find({ status: 'PERSONAL_DETAILS' }).select('user');
  const draftUsers = new Set(drafts.map((d) => String(d.user)));
  res.json({
    leads: borrowers.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      registeredAt: u.createdAt,
      stage: draftUsers.has(u.id) ? 'Details filled, not applied' : 'Registered only',
    })),
  });
});

export default router;
