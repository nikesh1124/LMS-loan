import { Router } from 'express';
import { Application, EMPLOYMENT_MODES } from '../models/Application';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { upload } from '../middleware/upload';
import { runBre } from '../services/bre';
import {
  calculateLoan,
  INTEREST_RATE,
  MAX_AMOUNT,
  MAX_TENURE,
  MIN_AMOUNT,
  MIN_TENURE,
} from '../services/loanMath';

const router = Router();
router.use(authenticate, requireRole('borrower'));

// A borrower's current (latest) application.
const findCurrent = (userId: string) => Application.findOne({ user: userId }).sort({ createdAt: -1 });

router.get('/application', async (req, res) => {
  res.json({ application: await findCurrent(req.user!.id) });
});

// Step 2: personal details + BRE (authoritative server-side check)
router.post('/personal-details', async (req, res) => {
  const { fullName, pan, dob, monthlySalary, employmentMode } = req.body ?? {};
  const salary = Number(monthlySalary);
  if (!fullName || !pan || !dob || !Number.isFinite(salary) || !EMPLOYMENT_MODES.includes(employmentMode)) {
    return res.status(400).json({ message: 'All personal detail fields are required' });
  }
  const errors = runBre({ pan, dob, monthlySalary: salary, employmentMode });
  if (errors.length) return res.status(422).json({ message: 'Application rejected by eligibility check', errors });

  const details = {
    fullName: String(fullName).trim(),
    pan: String(pan).toUpperCase(),
    dob: new Date(dob),
    monthlySalary: salary,
    employmentMode,
  };
  let app = await findCurrent(req.user!.id);
  // Re-use an in-progress draft or a finished/rejected one starts a new application.
  if (app && app.status === 'PERSONAL_DETAILS') {
    app.set(details);
    await app.save();
  } else if (app && !['REJECTED', 'CLOSED'].includes(app.status)) {
    return res.status(409).json({ message: 'You already have an active application' });
  } else {
    app = await Application.create({ user: req.user!.id, ...details });
  }
  res.json({ application: app });
});

// Step 3: salary slip upload
router.post('/salary-slip', upload.single('file'), async (req, res) => {
  const app = await findCurrent(req.user!.id);
  if (!app || app.status !== 'PERSONAL_DETAILS') {
    return res.status(409).json({ message: 'Complete personal details first' });
  }
  if (!req.file) return res.status(400).json({ message: 'File is required' });
  app.salarySlip = {
    path: req.file.filename,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
  };
  await app.save();
  res.json({ application: app });
});

// Step 4: loan configuration + apply
router.post('/apply', async (req, res) => {
  const amount = Number(req.body?.amount);
  const tenureDays = Number(req.body?.tenureDays);
  if (!Number.isFinite(amount) || amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
    return res.status(400).json({ message: `Amount must be between ${MIN_AMOUNT} and ${MAX_AMOUNT}` });
  }
  if (!Number.isInteger(tenureDays) || tenureDays < MIN_TENURE || tenureDays > MAX_TENURE) {
    return res.status(400).json({ message: `Tenure must be between ${MIN_TENURE} and ${MAX_TENURE} days` });
  }
  const app = await findCurrent(req.user!.id);
  if (!app || app.status !== 'PERSONAL_DETAILS') {
    return res.status(409).json({ message: 'No draft application to submit' });
  }
  if (!app.salarySlip?.path) return res.status(400).json({ message: 'Upload your salary slip first' });

  const { simpleInterest, totalRepayment } = calculateLoan(amount, tenureDays);
  app.set({ amount, tenureDays, interestRate: INTEREST_RATE, simpleInterest, totalRepayment });
  app.status = 'APPLIED';
  app.appliedAt = new Date();
  await app.save();
  res.status(201).json({ application: app });
});

export default router;
