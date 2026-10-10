import { ReactNode } from 'react';

export function Page({ title, error, children }: { title: string; error?: string; children: ReactNode }) {
  return (
    <>
      <h1 className="mb-4 text-2xl font-semibold">{title}</h1>
      {error && <p className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {children}
    </>
  );
}

export function Table({ head, children, empty }: { head: string[]; children: ReactNode; empty?: boolean }) {
  return (
    <div className="card overflow-x-auto p-0">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
          <tr>{head.map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
      {empty && <p className="p-6 text-center text-sm text-slate-500">Nothing here yet.</p>}
    </div>
  );
}

export const td = 'px-4 py-3 align-middle';
