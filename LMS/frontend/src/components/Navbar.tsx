'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { MODULES } from '@/lib/types';

export default function Navbar() {
  const { user, logout } = useAuth();
  const path = usePathname();
  if (!user) return null;
  const modules = MODULES.filter((m) => user.role === 'admin' || user.role === m.role);

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
        <span className="font-semibold text-indigo-700">LMS</span>
        <nav className="flex flex-1 flex-wrap gap-1">
          {user.role === 'borrower' ? (
            <Link href="/apply" className="rounded-md bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700">
              My Application
            </Link>
          ) : (
            modules.map((m) => (
              <Link
                key={m.href}
                href={m.href}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  path.startsWith(m.href) ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {m.label}
              </Link>
            ))
          )}
        </nav>
        <span className="hidden text-sm text-slate-500 sm:inline">
          {user.name} · <span className="capitalize">{user.role}</span>
        </span>
        <button onClick={logout} className="btn-secondary">
          Logout
        </button>
      </div>
    </header>
  );
}
