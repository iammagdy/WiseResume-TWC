import { useEffect, useState } from 'react';
import { useLocale } from '@/i18n/LocaleProvider';
import {
  getSandboxTransactionId,
  initializeSandboxTransactionCheckout,
  type SandboxCheckoutStatus,
} from '@/lib/sandboxPaddleCheckout';

const STATUS_KEYS: Partial<Record<SandboxCheckoutStatus, string>> = {
  loading: 'common.sandboxCheckout.loading',
  open: 'common.sandboxCheckout.open',
  completed: 'common.sandboxCheckout.completed',
  cancelled: 'common.sandboxCheckout.cancelled',
  error: 'common.sandboxCheckout.error',
  unavailable: 'common.sandboxCheckout.unavailable',
};

export function SandboxTransactionCheckout() {
  const { t } = useLocale();
  const [status, setStatus] = useState<SandboxCheckoutStatus>('idle');
  const transactionId = getSandboxTransactionId();

  useEffect(() => {
    if (!transactionId) return;
    void initializeSandboxTransactionCheckout({ transactionId, onStatus: setStatus });
  }, [transactionId]);

  const statusKey = STATUS_KEYS[status];
  if (!statusKey) return null;

  return (
    <p className="sr-only" role="status" aria-live="polite">
      {t(statusKey)}
    </p>
  );
}
