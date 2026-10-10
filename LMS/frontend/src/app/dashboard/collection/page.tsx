'use client';
import { FormEvent, useEffect, useState } from 'react';
import RoleGuard from '@/components/RoleGuard';
import { Page, Table, td } from '@/components/ui';
import { useList } from '@/components/useList';
import { api } from '@/lib/api';
import { Loan, Payment, inr } from '@/lib/types';

const today = () => new Date().toISOString().slice(0, 10);

function PaymentPanel({ loan, onClose, onSaved }: { loan: Loan; onClose: () => void; onSaved: () => void }) {
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [form, setForm] = useState({ utr: '', amount: '', paidOn: today() });
  const [error, setError] = useState('');
  const [current, setCurrent] = useState(loan);

  const loadPayments = async () => {
    const r = await api<{ loan: Loan; payments: Payment[] }>(`/collection/${loan._id}`);
    setPayments(r.payments);
    setCurrent(r.loan);
  };
  useEffect(() => { loadPayments().catch((e) => setError(e.message)); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api(`/collection/${loan._id}/payments`, { body: { ...form, amount: Number(form.amount) } });
      setForm({ utr: '', amount: '', paidOn: today() });
      await loadPayments();
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const closed = current.status === 'CLOSED';
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
      <div className="card max-h-[90vh] w-full max-w-lg space-y-3 overflow-y-auto">
        <div className="flex justify-between">
          <h2 className="font-semibold">Payments — {loan.fullName}</h2>
          <button className="text-slate-500" onClick={onClose}>✕</button>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded-lg bg-slate-50 p-2"><p className="text-xs text-slate-500">Total</p>{inr(current.totalRepayment)}</div>
          <div className="rounded-lg bg-slate-50 p-2"><p className="text-xs text-slate-500">Paid</p>{inr(current.totalPaid)}</div>
          <div className="rounded-lg bg-indigo-50 p-2 font-semibold"><p className="text-xs font-normal text-slate-500">Outstanding</p>{inr(current.outstanding)}</div>
        </div>
        {closed ? (
          <p className="rounded-lg bg-emerald-50 p-2 text-sm text-emerald-700">Loan fully repaid and closed.</p>
        ) : (
          <form onSubmit={submit} className="grid gap-3 sm:grid-cols-3">
            <input className="input" placeholder="UTR number" required value={form.utr} onChange={(e) => setForm({ ...form, utr: e.target.value })} />
            <input className="input" type="number" step="0.01" min="0.01" max={current.outstanding} placeholder="Amount" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            <input className="input" type="date" max={today()} required value={form.paidOn} onChange={(e) => setForm({ ...form, paidOn: e.target.value })} />
            {error && <p className="rounded-lg bg-rose-50 p-2 text-sm text-rose-700 sm:col-span-3">{error}</p>}
            <button className="btn sm:col-span-3">Record payment</button>
          </form>
        )}
        <ul className="divide-y divide-slate-100 text-sm">
          {payments?.map((p) => (
            <li key={p._id} className="flex justify-between py-2">
              <span>{p.utr} · {new Date(p.paidOn).toLocaleDateString()}</span>
              <span>{inr(p.amount)}</span>
            </li>
          ))}
          {payments?.length === 0 && <li className="py-2 text-slate-500">No payments yet.</li>}
        </ul>
      </div>
    </div>
  );
}

export default function CollectionPage() {
  const { items, error, loading, reload } = useList<Loan>('/collection/loans', 'loans');
  const [open, setOpen] = useState<Loan | null>(null);
  const who = (l: Loan) => (typeof l.user === 'object' ? `${l.user.name} (${l.user.email})` : l.fullName);

  return (
    <RoleGuard allow="collection">
      <Page title="Collection — Active Loans" error={error}>
        <Table head={['Borrower', 'Total repayment', 'Paid', 'Outstanding', 'Action']} empty={!loading && items.length === 0}>
          {items.map((l) => (
            <tr key={l._id}>
              <td className={td}>{who(l)}</td>
              <td className={td}>{inr(l.totalRepayment)}</td>
              <td className={td}>{inr(l.totalPaid)}</td>
              <td className={td}>{inr(l.outstanding)}</td>
              <td className={td}><button className="btn" onClick={() => setOpen(l)}>Payments</button></td>
            </tr>
          ))}
        </Table>
        {open && <PaymentPanel key={open._id} loan={open} onClose={() => setOpen(null)} onSaved={reload} />}
      </Page>
    </RoleGuard>
  );
}
