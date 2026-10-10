'use client';
import RoleGuard from '@/components/RoleGuard';
import { Page, Table, td } from '@/components/ui';
import { useList } from '@/components/useList';
import { api } from '@/lib/api';
import { Loan, inr } from '@/lib/types';

export default function DisbursementPage() {
  const { items, error, loading, run } = useList<Loan>('/disbursement/loans', 'loans');
  const who = (l: Loan) => (typeof l.user === 'object' ? `${l.user.name} (${l.user.email})` : l.fullName);

  return (
    <RoleGuard allow="disbursement">
      <Page title="Disbursement — Sanctioned Loans" error={error}>
        <Table head={['Borrower', 'Amount', 'Tenure', 'Total repayment', 'Action']} empty={!loading && items.length === 0}>
          {items.map((l) => (
            <tr key={l._id}>
              <td className={td}>{who(l)}</td>
              <td className={td}>{inr(l.amount)}</td>
              <td className={td}>{l.tenureDays} d</td>
              <td className={td}>{inr(l.totalRepayment)}</td>
              <td className={td}>
                <button className="btn" onClick={() => run(() => api(`/disbursement/${l._id}/disburse`, { method: 'POST' }))}>
                  Mark disbursed
                </button>
              </td>
            </tr>
          ))}
        </Table>
      </Page>
    </RoleGuard>
  );
}
