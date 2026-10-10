// End-to-end API smoke test against an in-memory MongoDB: `npm run smoke`
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import assert from 'assert';
import { app } from '../app';
import { connectDb } from '../config/db';
import { seed, SEED_PASSWORD } from './seed';

async function main() {
  const mongod = await MongoMemoryServer.create();
  await connectDb(mongod.getUri());
  await seed();
  const server = app.listen(0);
  const base = `http://127.0.0.1:${(server.address() as any).port}/api`;

  const call = async (method: string, path: string, token?: string, body?: any, form?: FormData) => {
    const res = await fetch(base + path, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: form ?? (body ? JSON.stringify(body) : undefined),
    });
    return { status: res.status, data: (await res.json()) as any };
  };
  const login = async (email: string) =>
    (await call('POST', '/auth/login', undefined, { email, password: SEED_PASSWORD })).data.token as string;

  const [admin, sales, sanction, disb, coll, borrower] = await Promise.all(
    ['admin', 'sales', 'sanction', 'disbursement', 'collection', 'borrower'].map((r) => login(`${r}@lms.com`))
  );

  // RBAC
  assert.equal((await call('GET', '/sanction/applications')).status, 401);
  assert.equal((await call('GET', '/sanction/applications', borrower)).status, 403);
  assert.equal((await call('GET', '/sanction/applications', sales)).status, 403);
  assert.equal((await call('GET', '/sanction/applications', admin)).status, 200);
  assert.equal((await call('GET', '/borrower/application', admin)).status, 403);
  assert.equal((await call('GET', '/sales/leads', sales)).status, 200);

  // BRE fail cases
  const good = { fullName: 'Test User', pan: 'ABCDE1234F', dob: '1995-01-01', monthlySalary: 50000, employmentMode: 'Salaried' };
  for (const bad of [
    { dob: '2010-01-01' },
    { monthlySalary: 20000 },
    { pan: 'abcde12345' },
    { employmentMode: 'Unemployed' },
  ]) {
    const r = await call('POST', '/borrower/personal-details', borrower, { ...good, ...bad });
    assert.equal(r.status, 422, JSON.stringify(bad));
    assert.ok(r.data.errors.length >= 1);
  }

  // Happy path
  assert.equal((await call('POST', '/borrower/personal-details', borrower, good)).status, 200);
  assert.equal((await call('POST', '/borrower/apply', borrower, { amount: 100000, tenureDays: 365 })).status, 400); // no slip

  const bad = new FormData();
  bad.append('file', new Blob(['hi'], { type: 'text/plain' }), 'x.txt');
  assert.equal((await call('POST', '/borrower/salary-slip', borrower, undefined, bad)).status, 400);
  const big = new FormData();
  big.append('file', new Blob([new Uint8Array(5 * 1024 * 1024 + 10)], { type: 'application/pdf' }), 'big.pdf');
  assert.equal((await call('POST', '/borrower/salary-slip', borrower, undefined, big)).status, 400);
  const ok = new FormData();
  ok.append('file', new Blob(['%PDF-1.4'], { type: 'application/pdf' }), 'slip.pdf');
  assert.equal((await call('POST', '/borrower/salary-slip', borrower, undefined, ok)).status, 200);

  assert.equal((await call('POST', '/borrower/apply', borrower, { amount: 1000, tenureDays: 100 })).status, 400);
  const applied = await call('POST', '/borrower/apply', borrower, { amount: 100000, tenureDays: 365 });
  assert.equal(applied.status, 201);
  assert.equal(applied.data.application.simpleInterest, 12000);
  assert.equal(applied.data.application.totalRepayment, 112000);
  const id = applied.data.application._id;

  // Sanction -> Disburse
  assert.equal((await call('POST', `/sanction/${id}/reject`, sanction, {})).status, 400);
  assert.equal((await call('POST', `/disbursement/${id}/disburse`, disb)).status, 409); // not sanctioned yet
  assert.equal((await call('POST', `/sanction/${id}/approve`, sanction)).status, 200);
  assert.equal((await call('POST', `/sanction/${id}/approve`, sanction)).status, 409);
  assert.equal((await call('POST', `/disbursement/${id}/disburse`, disb)).status, 200);

  // Collection
  const pay = (utr: string, amount: number) =>
    call('POST', `/collection/${id}/payments`, coll, { utr, amount, paidOn: new Date().toISOString() });
  assert.equal((await pay('UTR1', 200000)).status, 400); // overpay
  assert.equal((await pay('UTR1', 50000)).status, 201);
  assert.equal((await pay('UTR1', 10)).status, 409); // duplicate UTR
  const last = await pay('UTR2', 62000);
  assert.equal(last.status, 201);
  assert.equal(last.data.loan.status, 'CLOSED');
  assert.equal((await pay('UTR3', 1)).status, 409); // closed

  console.log('SMOKE TEST PASSED');
  server.close();
  await mongoose.disconnect();
  await mongod.stop();
}

main().catch((e) => {
  console.error('SMOKE TEST FAILED', e);
  process.exit(1);
});
