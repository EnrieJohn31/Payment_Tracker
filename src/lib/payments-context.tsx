import { useSQLiteContext } from 'expo-sqlite';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  getAllPayments,
  getPaymentItems,
  getSetting,
  insertPayment,
  setSetting,
  type NewPaymentInput,
  type Payment,
  type PaymentItem,
} from '@/lib/db';
import { periodRange } from '@/lib/dates';

export type LimitStatus = 'none' | 'ok' | 'near' | 'maxed';

/** Warn when spending reaches this fraction of the balance limit. */
export const NEAR_LIMIT_RATIO = 0.8;

type PaymentsContextValue = {
  ready: boolean;
  payments: Payment[];
  addPayment: (input: NewPaymentInput) => Promise<number>;
  loadItems: (paymentId: number) => Promise<PaymentItem[]>;
  refresh: () => Promise<void>;
  /** Monthly balance limit in pesos, or null when not set. */
  balanceLimit: number | null;
  setBalanceLimit: (value: number | null) => Promise<void>;
  /** Total spent in the current calendar month. */
  spentThisMonth: number;
  remaining: number | null;
  limitStatus: LimitStatus;
};

const PaymentsContext = createContext<PaymentsContextValue | null>(null);

export function PaymentsProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [ready, setReady] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [balanceLimit, setBalanceLimitState] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    const [rows, limitRaw] = await Promise.all([
      getAllPayments(db),
      getSetting(db, 'balanceLimit'),
    ]);
    setPayments(rows);
    const parsed = limitRaw === null ? NaN : Number(limitRaw);
    setBalanceLimitState(Number.isFinite(parsed) && parsed > 0 ? parsed : null);
    setReady(true);
  }, [db]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addPayment = useCallback(
    async (input: NewPaymentInput) => {
      const id = await insertPayment(db, input);
      await refresh();
      return id;
    },
    [db, refresh],
  );

  const loadItems = useCallback(
    (paymentId: number) => getPaymentItems(db, paymentId),
    [db],
  );

  const setBalanceLimit = useCallback(
    async (value: number | null) => {
      await setSetting(db, 'balanceLimit', value === null ? null : String(value));
      setBalanceLimitState(value);
    },
    [db],
  );

  const spentThisMonth = useMemo(() => {
    const { start, end } = periodRange('month', new Date());
    return payments
      .filter((p) => p.createdAt >= start && p.createdAt < end)
      .reduce((sum, p) => sum + p.total, 0);
  }, [payments]);

  const remaining = balanceLimit === null ? null : Math.max(0, balanceLimit - spentThisMonth);

  const limitStatus: LimitStatus = useMemo(() => {
    if (balanceLimit === null) return 'none';
    if (spentThisMonth >= balanceLimit) return 'maxed';
    if (spentThisMonth >= balanceLimit * NEAR_LIMIT_RATIO) return 'near';
    return 'ok';
  }, [balanceLimit, spentThisMonth]);

  const value = useMemo(
    () => ({
      ready,
      payments,
      addPayment,
      loadItems,
      refresh,
      balanceLimit,
      setBalanceLimit,
      spentThisMonth,
      remaining,
      limitStatus,
    }),
    [
      ready,
      payments,
      addPayment,
      loadItems,
      refresh,
      balanceLimit,
      setBalanceLimit,
      spentThisMonth,
      remaining,
      limitStatus,
    ],
  );

  return <PaymentsContext.Provider value={value}>{children}</PaymentsContext.Provider>;
}

export function usePayments(): PaymentsContextValue {
  const ctx = useContext(PaymentsContext);
  if (!ctx) throw new Error('usePayments must be used within PaymentsProvider');
  return ctx;
}
