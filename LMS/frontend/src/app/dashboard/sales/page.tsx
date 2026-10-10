'use client';
import RoleGuard from '@/components/RoleGuard';
import { Page, Table, td } from '@/components/ui';
import { useList } from '@/components/useList';
import { Lead } from '@/lib/types';

export default function SalesPage() {
  const { items, error, loading } = useList<Lead>('/sales/leads', 'leads');
  return (
    <RoleGuard allow="sales">
      <Page title="Sales — Leads" error={error}>
        <p className="mb-3 text-sm text-slate-600">Registered borrowers who have not applied for a loan yet.</p>
        <Table head={['Name', 'Email', 'Registered', 'Stage']} empty={!loading && items.length === 0}>
          {items.map((l) => (
            <tr key={l.id}>
              <td className={td}>{l.name}</td>
              <td className={td}>{l.email}</td>
              <td className={td}>{new Date(l.registeredAt).toLocaleDateString()}</td>
              <td className={td}>{l.stage}</td>
            </tr>
          ))}
        </Table>
      </Page>
    </RoleGuard>
  );
}
