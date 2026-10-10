'use client';
import { useState } from 'react';
import RoleGuard from '@/components/RoleGuard';
import { Page, Table, td } from '@/components/ui';
import { useList } from '@/components/useList';
import { api } from '@/lib/api';
import { Loan, inr } from '@/lib/types';

export default function SanctionPage() {
  const { items, error, loading, run } = useList<Loan>('/sanction/applications', 'applications');
  const [rejecting, setRejecting] = useState<Loan | null>(null);
  const [reason, setReason] = useState('');
  const who = (l: Loan) => (typeof l.user === 'object' ? `${l.user.name} (${l.user.email})` : l.fullName);

  return (
    <RoleGuard allow="sanction">
      <Page title="Sanction — Applied Loans" error={error}>
        <Table head={['Applicant', 'PAN', 'Salary', 'Amount', 'Tenure', 'Total repayment', 'Actions']} empty={!loading && items.length === 0}>
          {items.map((l) => (
            <tr key={l._id}>
              <td className={td}>{who(l)}</td>
              <td className={td}>{l.pan}</td>
              <td className={td}>{inr(l.monthlySalary)}</td>
              <td className={td}>{inr(l.amount)}</td>
              <td className={td}>{l.tenureDays} d</td>
              <td className={td}>{inr(l.totalRepayment)}</td>
              <td className={`${td} space-x-2 whitespace-nowrap`}>
                <button className="btn" onClick={() => run(() => api(`/sanction/${l._id}/approve`, { method: 'POST' }))}>Approve</button>
                <button className="btn-danger" onClick={() => { setRejecting(l); setReason(''); }}>Reject</button>
              </td>
            </tr>
          ))}
        </Table>

        {rejecting && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
            <div className="card w-full max-w-md space-y-3">
              <h2 className="font-semibold">Reject application of {rejecting.fullName}</h2>
              <textarea className="input" rows={3} placeholder="Reason (required)" value={reason} onChange={(e) => setReason(e.target.value)} />
              <div className="flex justify-end gap-2">
                <button className="btn-secondary" onClick={() => setRejecting(null)}>Cancel</button>
                <button
                  className="btn-danger"
                  disabled={!reason.trim()}
                  onClick={() => run(() => api(`/sanction/${rejecting._id}/reject`, { body: { reason } })).then(() => setRejecting(null))}
                >
                  Confirm reject
                </button>
              </div>
            </div>
          </div>
        )}
      </Page>
    </RoleGuard>
  );
}
