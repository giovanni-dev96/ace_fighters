import { useEffect } from 'react';
import { useStore } from '../store';

export function ErrorToast() {
  const error = useStore((s) => s.error);
  const clearError = useStore((s) => s.clearError);
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(clearError, 4000);
    return () => clearTimeout(t);
  }, [error, clearError]);
  if (!error) return null;
  return <div className="error-toast">{error}</div>;
}
