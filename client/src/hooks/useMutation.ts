import { useState } from 'react';
import { errorMessage } from '../services/api';
import { useToast } from '../components/ui/Toast';
export function useMutation() {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const run = async (action: () => Promise<unknown>, success: string, after?: () => void) => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
      toast(success);
      after?.();
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setBusy(false);
    }
  };
  return { busy, run };
}
