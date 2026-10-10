'use client';
import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Role, homeFor } from '@/lib/types';
import Navbar from './Navbar';

/** Client-side guard: renders children only when the user's role is allowed (admin passes dashboard guards). */
export default function RoleGuard({ allow, children }: { allow: Role; children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const ok = !!user && (user.role === allow || (user.role === 'admin' && allow !== 'borrower'));

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
    else if (!ok) router.replace(homeFor(user.role));
  }, [loading, user, ok, router]);

  if (loading || !ok) return <p className="p-8 text-slate-500">Loading…</p>;
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </>
  );
}
