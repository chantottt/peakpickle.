import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { api, errorMessage } from '../services/api';
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(!!path);
  const [error, setError] = useState<string | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const current = useRef<AbortController | null>(null);
  const refetch = useCallback(async () => {
    current.current?.abort();
    const controller = new AbortController();
    current.current = controller;
    if (!path) {
      setLoading(false);
      setData(undefined);
      setHasNext(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<T>(path, { signal: controller.signal });
      if (!controller.signal.aborted) {
        setData(response.data);
        setHasNext(response.headers['x-has-next'] === 'true');
      }
    } catch (cause) {
      if (!axios.isCancel(cause) && !controller.signal.aborted) setError(errorMessage(cause));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [path]);
  useEffect(() => {
    setData(undefined);
    setHasNext(false);
    void refetch();
    return () => current.current?.abort();
  }, [refetch]);
  return { data, loading, error, refetch, hasNext };
}
