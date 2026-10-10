'use client';
import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { homeFor } from '@/lib/types';

export default function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const { login, signup } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user =
        mode === 'login' ? await login(form.email, form.password) : await signup(form.name, form.email, form.password);
      router.replace(homeFor(user.role));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4">
        <h1 className="text-xl font-semibold">{mode === 'login' ? 'Sign in' : 'Create borrower account'}</h1>
        {mode === 'signup' && (
          <div>
            <label className="label">Name</label>
            <input className="input" required value={form.name} onChange={set('name')} />
          </div>
        )}
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" required value={form.email} onChange={set('email')} />
        </div>
        <div>
          <label className="label">Password</label>
          <input className="input" type="password" required minLength={6} value={form.password} onChange={set('password')} />
        </div>
        {error && <p className="rounded-lg bg-rose-50 p-2 text-sm text-rose-700">{error}</p>}
        <button className="btn w-full" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Sign up'}
        </button>
        <p className="text-center text-sm text-slate-500">
          {mode === 'login' ? (
            <>
              New borrower? <Link className="text-indigo-600" href="/signup">Sign up</Link>
            </>
          ) : (
            <>
              Have an account? <Link className="text-indigo-600" href="/login">Sign in</Link>
            </>
          )}
        </p>
      </form>
    </div>
  );
}
