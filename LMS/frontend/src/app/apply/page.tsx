'use client';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import RoleGuard from '@/components/RoleGuard';
import { api, ApiError } from '@/lib/api';
import { Loan, inr } from '@/lib/types';

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const STEPS = ['Personal Details', 'Salary Slip', 'Loan Config'];
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

// Same formula as the server (SI = P*R*T / (365*100)); server recomputes and is authoritative.
const calc = (p: number, t: number) => {
  const si = Math.round(((p * 12 * t) / (365 * 100)) * 100) / 100;
  return { si, total: Math.round((p + si) * 100) / 100 };
};

function ageOf(dob: string) {
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--;
  return age;
}

function Stepper({ step }: { step: number }) {
  return (
    <ol className="mb-6 flex gap-2">
      {STEPS.map((s, i) => (
        <li
          key={s}
          className={`flex-1 rounded-lg px-3 py-2 text-center text-xs font-medium sm:text-sm ${
            i < step ? 'bg-emerald-100 text-emerald-700' : i === step ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'
          }`}
        >
          {i + 1}. {s}
        </li>
      ))}
    </ol>
  );
}

function PersonalDetails({ onDone }: { onDone: () => void }) {
  const [f, setF] = useState({ fullName: '', pan: '', dob: '', monthlySalary: '', employmentMode: 'Salaried' });
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: k === 'pan' ? e.target.value.toUpperCase() : e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    // Client-side BRE for instant feedback; the server repeats it and is the source of truth.
    const local: string[] = [];
    const age = ageOf(f.dob);
    if (age < 23 || age > 50) local.push(`Age must be between 23 and 50 (your age: ${age}).`);
    if (Number(f.monthlySalary) < 25000) local.push('Monthly salary must be at least ₹25,000.');
    if (!PAN_REGEX.test(f.pan)) local.push('PAN format is invalid (expected e.g. ABCDE1234F).');
    if (f.employmentMode === 'Unemployed') local.push('Unemployed applicants are not eligible.');
    setErrors(local);
    if (local.length) return;
    setBusy(true);
    try {
      await api('/borrower/personal-details', { body: { ...f, monthlySalary: Number(f.monthlySalary) } });
      onDone();
    } catch (err) {
      const e2 = err as ApiError;
      setErrors(e2.errors?.length ? e2.errors : [e2.message]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="label">Full Name</label>
        <input className="input" required value={f.fullName} onChange={set('fullName')} />
      </div>
      <div>
        <label className="label">PAN</label>
        <input className="input" required maxLength={10} placeholder="ABCDE1234F" value={f.pan} onChange={set('pan')} />
      </div>
      <div>
        <label className="label">Date of Birth</label>
        <input className="input" type="date" required value={f.dob} onChange={set('dob')} />
      </div>
      <div>
        <label className="label">Monthly Salary (₹)</label>
        <input className="input" type="number" min={0} required value={f.monthlySalary} onChange={set('monthlySalary')} />
      </div>
      <div>
        <label className="label">Employment Mode</label>
        <select className="input" value={f.employmentMode} onChange={set('employmentMode')}>
          <option>Salaried</option>
          <option>Self-Employed</option>
          <option>Unemployed</option>
        </select>
      </div>
      {errors.length > 0 && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 sm:col-span-2">
          <p className="mb-1 font-semibold">Not eligible for a loan:</p>
          <ul className="list-disc pl-5">
            {errors.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="sm:col-span-2">
        <button className="btn" disabled={busy}>{busy ? 'Checking…' : 'Check eligibility & continue'}</button>
      </div>
    </form>
  );
}

function SalarySlip({ onDone }: { onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setError('');
    if (f && !ALLOWED_TYPES.includes(f.type)) setError('Only PDF, JPG or PNG files are allowed');
    else if (f && f.size > 5 * 1024 * 1024) setError('File must be 5 MB or smaller');
    else setFile(f);
  }

  async function upload() {
    if (!file) return;
    setBusy(true);
    const form = new FormData();
    form.append('file', file);
    try {
      await api('/borrower/salary-slip', { form });
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card space-y-4">
      <p className="text-sm text-slate-600">Upload your latest salary slip (PDF, JPG or PNG, max 5 MB).</p>
      <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={pick} className="block w-full text-sm" />
      {error && <p className="rounded-lg bg-rose-50 p-2 text-sm text-rose-700">{error}</p>}
      <button className="btn" disabled={!file || busy} onClick={upload}>{busy ? 'Uploading…' : 'Upload & continue'}</button>
    </div>
  );
}

function LoanConfig({ onDone }: { onDone: () => void }) {
  const [amount, setAmount] = useState(100000);
  const [tenure, setTenure] = useState(90);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { si, total } = calc(amount, tenure);

  async function apply() {
    setBusy(true);
    setError('');
    try {
      await api('/borrower/apply', { body: { amount, tenureDays: tenure } });
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="card space-y-6">
        <div>
          <div className="mb-1 flex justify-between text-sm font-medium"><span>Loan Amount</span><span>{inr(amount)}</span></div>
          <input type="range" min={50000} max={500000} step={5000} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-full accent-indigo-600" />
          <div className="flex justify-between text-xs text-slate-500"><span>₹50K</span><span>₹5L</span></div>
        </div>
        <div>
          <div className="mb-1 flex justify-between text-sm font-medium"><span>Tenure</span><span>{tenure} days</span></div>
          <input type="range" min={30} max={365} step={1} value={tenure} onChange={(e) => setTenure(Number(e.target.value))} className="w-full accent-indigo-600" />
          <div className="flex justify-between text-xs text-slate-500"><span>30 days</span><span>365 days</span></div>
        </div>
      </div>
      <div className="card space-y-2 bg-indigo-50">
        <h3 className="font-semibold">Repayment summary</h3>
        <Row k="Principal" v={inr(amount)} />
        <Row k="Interest rate" v="12% p.a. (simple)" />
        <Row k="Tenure" v={`${tenure} days`} />
        <Row k="Simple interest" v={inr(si)} />
        <div className="border-t border-indigo-200 pt-2"><Row k="Total repayment" v={inr(total)} bold /></div>
        {error && <p className="rounded-lg bg-rose-50 p-2 text-sm text-rose-700">{error}</p>}
        <button className="btn mt-2 w-full" disabled={busy} onClick={apply}>{busy ? 'Applying…' : 'Apply'}</button>
      </div>
    </div>
  );
}

const Row = ({ k, v, bold }: { k: string; v: string; bold?: boolean }) => (
  <div className={`flex justify-between text-sm ${bold ? 'text-base font-semibold' : ''}`}><span className="text-slate-600">{k}</span><span>{v}</span></div>
);

const STATUS_TEXT: Record<string, { label: string; color: string; note: string }> = {
  APPLIED: { label: 'Applied', color: 'bg-blue-100 text-blue-700', note: 'Your application is awaiting review by the sanction team.' },
  SANCTIONED: { label: 'Sanctioned', color: 'bg-amber-100 text-amber-700', note: 'Approved! Waiting for disbursement.' },
  REJECTED: { label: 'Rejected', color: 'bg-rose-100 text-rose-700', note: 'Unfortunately your application was rejected.' },
  DISBURSED: { label: 'Disbursed', color: 'bg-teal-100 text-teal-700', note: 'Funds have been released. Repayment is in progress.' },
  CLOSED: { label: 'Closed', color: 'bg-emerald-100 text-emerald-700', note: 'Loan fully repaid. Thank you!' },
};

function StatusView({ app, onNew }: { app: Loan; onNew: () => void }) {
  const s = STATUS_TEXT[app.status];
  return (
    <div className="card space-y-3">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">Your loan application</h2>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${s.color}`}>{s.label}</span>
      </div>
      <p className="text-sm text-slate-600">{s.note}</p>
      {app.rejectionReason && <p className="rounded-lg bg-rose-50 p-2 text-sm text-rose-700">Reason: {app.rejectionReason}</p>}
      <Row k="Amount" v={inr(app.amount)} />
      <Row k="Tenure" v={`${app.tenureDays} days`} />
      <Row k="Interest" v={inr(app.simpleInterest)} />
      <Row k="Total repayment" v={inr(app.totalRepayment)} bold />
      <Row k="Paid so far" v={inr(app.totalPaid)} />
      {(app.status === 'REJECTED' || app.status === 'CLOSED') && (
        <button className="btn" onClick={onNew}>Start a new application</button>
      )}
    </div>
  );
}

function ApplyFlow() {
  const [app, setApp] = useState<Loan | null>(null);
  const [fresh, setFresh] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const r = await api<{ application: Loan | null }>('/borrower/application');
    setApp(r.application);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading) return <p className="text-slate-500">Loading…</p>;

  const finished = app && app.status !== 'PERSONAL_DETAILS';
  if (finished && !fresh) return <StatusView app={app} onNew={() => setFresh(true)} />;

  const step = fresh || !app ? 0 : app.salarySlip?.path ? 2 : 1;
  const next = async () => { setFresh(false); await load(); };
  return (
    <>
      <Stepper step={step} />
      {step === 0 && <PersonalDetails onDone={next} />}
      {step === 1 && <SalarySlip onDone={next} />}
      {step === 2 && <LoanConfig onDone={next} />}
    </>
  );
}

export default function ApplyPage() {
  return (
    <RoleGuard allow="borrower">
      <h1 className="mb-4 text-2xl font-semibold">Loan Application</h1>
      <ApplyFlow />
    </RoleGuard>
  );
}
