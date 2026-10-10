import { app } from './app';
import { connectDb } from './config/db';
import { env } from './config/env';

connectDb()
  .then(() => app.listen(env.port, () => console.log(`API listening on :${env.port}`)))
  .catch((err) => {
    console.error('Failed to start', err);
    process.exit(1);
  });
