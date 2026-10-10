import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { errorHandler } from './middleware/error';
import authRoutes from './routes/auth';
import borrowerRoutes from './routes/borrower';
import salesRoutes from './routes/sales';
import sanctionRoutes from './routes/sanction';
import disbursementRoutes from './routes/disbursement';
import collectionRoutes from './routes/collection';

export const app = express();
app.use(cors({ origin: env.clientUrl }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/borrower', borrowerRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/sanction', sanctionRoutes);
app.use('/api/disbursement', disbursementRoutes);
app.use('/api/collection', collectionRoutes);

app.use(errorHandler);
