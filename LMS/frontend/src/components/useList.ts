'use client';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';

/** Loads `key` from a list endpoint, exposing reload + a shared action runner with error state. */
export function useList<T>(path: string, key: string) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    try {
      const r = await api<Record<string, T[]>>(path);
      setItems(r[key]);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [path, key]);
  useEffect(() => { reload(); }, [reload]);

  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      await reload();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return { items, loading, error, setError, reload, run };
}
