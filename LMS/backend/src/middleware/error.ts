import { Request, Response, NextFunction } from 'express';
import multer from 'multer';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'File must be 5 MB or smaller' : err.message;
    return res.status(400).json({ message });
  }
  if (err?.message?.startsWith('Only PDF')) return res.status(400).json({ message: err.message });
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
}
