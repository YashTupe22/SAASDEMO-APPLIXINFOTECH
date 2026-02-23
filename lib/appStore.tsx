'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  INITIAL_EMPLOYEES,
  INITIAL_INVENTORY,
  INITIAL_INVOICES,
  INITIAL_TRANSACTIONS,
} from './mockData';
import type { Employee, InventoryItem, Invoice, InvoiceItem, Transaction } from './mockData';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  password: string; // Plaintext for demo only – do NOT use in real apps
  createdAt: string;
}

export interface AppData {
  users: UserAccount[];
  currentUserId?: string;
  employees: Employee[];
  invoices: Invoice[];
  transactions: Transaction[];
  inventory: InventoryItem[];
  businessProfile: {
    businessName: string;
    email: string;
    phone: string;
    gst: string;
    address: string;
  };
  preferences: {
    emailNotifications: boolean;
    darkMode: boolean;
    currency: string;
    twoFactorAuth: boolean;
  };
}

interface AddTransactionInput {
  type: Transaction['type'];
  category: string;
  amount: number;
  date: string;
  note: string;
}

interface AddInvoiceInput {
  client: string;
  date: string;
  dueDate: string;
  items: InvoiceItem[];
}

interface AppStoreContextValue {
  ready: boolean;
  data: AppData;
  // Auth
  currentUser: UserAccount | null;
  signup: (name: string, email: string, password: string) => { ok: boolean; error?: string };
  login: (email: string, password: string) => { ok: boolean; error?: string };
  loginDemo: () => void;
  logout: () => void;
  // Data operations
  addTransaction: (input: AddTransactionInput) => void;
  addInvoice: (input: AddInvoiceInput) => void;
  toggleInvoiceStatus: (id: string) => void;
  updateEmployees: (updater: (prev: Employee[]) => Employee[]) => void;
  updateInventory: (updater: (prev: InventoryItem[]) => InventoryItem[]) => void;
  updateBusinessProfile: (profile: AppData['businessProfile']) => void;
  updatePreferences: (prefs: AppData['preferences']) => void;
  resetBusinessData: () => void;
  deleteCurrentAccount: () => void;
  // Derived dashboard data
  dashboard: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    pendingPayments: number;
    revenueChart: { month: string; revenue: number; expenses: number }[];
    expensePie: { name: string; value: number; color: string }[];
  };
}

const AppStoreContext = createContext<AppStoreContextValue | null>(null);

const STORAGE_KEY = 'applix-demo-app-data-v1';

const DEFAULT_USERS: UserAccount[] = [
  {
    id: 'u-demo',
    name: 'Demo Admin',
    email: 'demo@applix.in',
    password: 'demo123',
    createdAt: new Date().toISOString(),
  },
];

const DEFAULT_BUSINESS_PROFILE: AppData['businessProfile'] = {
  businessName: 'Applix Infotech Services',
  email: 'info@applix.in',
  phone: '+91 98765 43210',
  gst: '27AABCA1234F1Z5',
  address: 'Mumbai, Maharashtra, India',
};

const DEFAULT_PREFERENCES: AppData['preferences'] = {
  emailNotifications: true,
  darkMode: true,
  currency: 'INR',
  twoFactorAuth: false,
};

const DEFAULT_DATA: AppData = {
  users: DEFAULT_USERS,
  currentUserId: 'u-demo',
  employees: INITIAL_EMPLOYEES,
  invoices: INITIAL_INVOICES,
  transactions: INITIAL_TRANSACTIONS,
  inventory: INITIAL_INVENTORY,
  businessProfile: DEFAULT_BUSINESS_PROFILE,
  preferences: DEFAULT_PREFERENCES,
};

function computeDashboard(data: AppData): AppStoreContextValue['dashboard'] {
  // Revenue from PAID invoices
  const invoiceTotals = data.invoices.map(inv => ({
    id: inv.id,
    status: inv.status,
    total: inv.items.reduce((s, i) => s + i.qty * i.price, 0),
  }));

  const totalRevenue = invoiceTotals
    .filter(i => i.status === 'Paid')
    .reduce((s, i) => s + i.total, 0);

  const pendingPayments = invoiceTotals
    .filter(i => i.status === 'Pending')
    .reduce((s, i) => s + i.total, 0);

  const totalExpenses = data.transactions
    .filter(t => t.type === 'Expense')
    .reduce((s, t) => s + t.amount, 0);

  const netProfit = totalRevenue - totalExpenses;

  // Build last 6 months revenue vs expenses chart from transactions
  const now = new Date();
  const months: { key: string; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const label = d.toLocaleString('en-IN', { month: 'short' });
    months.push({ key, label });
  }

  const revenueChart = months.map(m => {
    let revenue = 0;
    let expenses = 0;
    data.transactions.forEach(tx => {
      const d = new Date(tx.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (key !== m.key) return;
      if (tx.type === 'Income') revenue += tx.amount;
      else expenses += tx.amount;
    });
    return { month: m.label, revenue, expenses };
  });

  // Expense pie – by category from all expenses
  const expenseByCategory = new Map<string, number>();
  data.transactions
    .filter(t => t.type === 'Expense')
    .forEach(t => {
      expenseByCategory.set(t.category, (expenseByCategory.get(t.category) ?? 0) + t.amount);
    });

  const COLORS = ['#3b82f6', '#06b6d4', '#8b5cf6', '#f59e0b', '#22c55e', '#ef4444', '#14b8a6'];

  const expensePie: { name: string; value: number; color: string }[] = [];
  Array.from(expenseByCategory.entries()).forEach(([name, value], idx) => {
    expensePie.push({ name, value, color: COLORS[idx % COLORS.length] });
  });

  return {
    totalRevenue,
    totalExpenses,
    netProfit,
    pendingPayments,
    revenueChart,
    expensePie,
  };
}

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(DEFAULT_DATA);
  const [ready, setReady] = useState(false);

  // Initial load
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setData(DEFAULT_DATA);
      } else {
        const parsed = JSON.parse(raw) as AppData;
        setData({
          ...DEFAULT_DATA,
          ...parsed,
        });
      }
    } catch {
      setData(DEFAULT_DATA);
    } finally {
      setReady(true);
    }
  }, []);

  // Persist whenever data changes
  useEffect(() => {
    if (!ready || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // ignore
    }
  }, [data, ready]);

  const currentUser = useMemo(
    () => (data.currentUserId ? data.users.find(u => u.id === data.currentUserId) ?? null : null),
    [data.currentUserId, data.users],
  );

  const value = useMemo<AppStoreContextValue>(() => {
    function ensureDemoUser() {
      const existing = data.users.find(u => u.email === 'demo@applix.in');
      if (existing) return existing;
      const demo: UserAccount = {
        id: 'u-demo',
        name: 'Demo Admin',
        email: 'demo@applix.in',
        password: 'demo123',
        createdAt: new Date().toISOString(),
      };
      setData(prev => ({ ...prev, users: [...prev.users, demo] }));
      return demo;
    }

    const signup: AppStoreContextValue['signup'] = (name, email, password) => {
      const trimmedEmail = email.trim().toLowerCase();
      if (!trimmedEmail || !password.trim() || !name.trim()) {
        return { ok: false, error: 'All fields are required.' };
      }
      if (data.users.some(u => u.email.toLowerCase() === trimmedEmail)) {
        return { ok: false, error: 'An account with this email already exists.' };
      }
      const user: UserAccount = {
        id: 'u-' + Date.now().toString(36),
        name: name.trim(),
        email: trimmedEmail,
        password: password,
        createdAt: new Date().toISOString(),
      };
      setData(prev => ({
        ...prev,
        users: [...prev.users, user],
        currentUserId: user.id,
      }));
      return { ok: true };
    };

    const login: AppStoreContextValue['login'] = (email, password) => {
      const trimmedEmail = email.trim().toLowerCase();
      const user = data.users.find(u => u.email.toLowerCase() === trimmedEmail && u.password === password);
      if (!user) {
        return { ok: false, error: 'Invalid email or password.' };
      }
      setData(prev => ({ ...prev, currentUserId: user.id }));
      return { ok: true };
    };

    const loginDemo = () => {
      const demo = ensureDemoUser();
      setData(prev => ({ ...prev, currentUserId: demo.id }));
    };

    const logout = () => {
      setData(prev => ({ ...prev, currentUserId: undefined }));
    };

    const addTransaction = (input: AddTransactionInput) => {
      const tx: Transaction = {
        id: 't-' + Date.now().toString(36),
        type: input.type,
        category: input.category,
        amount: input.amount,
        date: input.date,
        note: input.note,
      };
      setData(prev => ({
        ...prev,
        transactions: [tx, ...prev.transactions],
      }));
    };

    const addInvoice = (input: AddInvoiceInput) => {
      const invoiceNoBase = data.invoices.length + 1;
      const invoice: Invoice = {
        id: 'inv-' + Date.now().toString(36),
        invoiceNo: `INV-${String(invoiceNoBase).padStart(3, '0')}`,
        client: input.client,
        date: input.date,
        dueDate: input.dueDate || input.date,
        items: input.items,
        status: 'Pending',
      };
      setData(prev => ({
        ...prev,
        invoices: [invoice, ...prev.invoices],
      }));
    };

    const toggleInvoiceStatus = (id: string) => {
      const getTotal = (items: InvoiceItem[]) => items.reduce((s, i) => s + i.qty * i.price, 0);
      setData(prev => {
        const target = prev.invoices.find(inv => inv.id === id);
        if (!target) return prev;

        const isPaid = target.status === 'Paid';
        const nextStatus: Invoice['status'] = isPaid ? 'Pending' : 'Paid';

        // Track an auto-generated payment transaction for charting.
        const paymentTxId = (target as any).paymentTransactionId as string | undefined;

        if (!isPaid) {
          const txId = 't-pay-' + Date.now().toString(36);
          const tx: Transaction = {
            id: txId,
            type: 'Income',
            category: 'Client Payment',
            amount: getTotal(target.items),
            date: new Date().toISOString().split('T')[0],
            note: `${target.invoiceNo} — ${target.client}`,
          };
          return {
            ...prev,
            invoices: prev.invoices.map(inv =>
              inv.id === id ? ({ ...inv, status: nextStatus, paymentTransactionId: txId } as any) : inv,
            ),
            transactions: [tx, ...prev.transactions],
          };
        }

        // Paid -> Pending: remove the auto payment transaction if we created one
        return {
          ...prev,
          invoices: prev.invoices.map(inv =>
            inv.id === id ? ({ ...inv, status: nextStatus, paymentTransactionId: undefined } as any) : inv,
          ),
          transactions: paymentTxId ? prev.transactions.filter(t => t.id !== paymentTxId) : prev.transactions,
        };
      });
    };

    const updateEmployees: AppStoreContextValue['updateEmployees'] = updater => {
      setData(prev => ({
        ...prev,
        employees: updater(prev.employees),
      }));
    };

    const updateInventory: AppStoreContextValue['updateInventory'] = updater => {
      setData(prev => ({
        ...prev,
        inventory: updater(prev.inventory),
      }));
    };

    const updateBusinessProfile: AppStoreContextValue['updateBusinessProfile'] = profile => {
      setData(prev => ({
        ...prev,
        businessProfile: profile,
      }));
    };

    const updatePreferences: AppStoreContextValue['updatePreferences'] = prefs => {
      setData(prev => ({
        ...prev,
        preferences: prefs,
      }));
    };

    const resetBusinessData = () => {
      setData(prev => ({
        ...prev,
        employees: INITIAL_EMPLOYEES,
        invoices: INITIAL_INVOICES,
        transactions: INITIAL_TRANSACTIONS,
        inventory: INITIAL_INVENTORY,
        businessProfile: DEFAULT_BUSINESS_PROFILE,
        preferences: DEFAULT_PREFERENCES,
      }));
    };

    const deleteCurrentAccount = () => {
      if (!data.currentUserId) return;
      setData(prev => ({
        ...prev,
        users: prev.users.filter(u => u.id !== prev.currentUserId),
        currentUserId: undefined,
      }));
    };

    const dashboard = computeDashboard(data);

    return {
      ready,
      data,
      currentUser,
      signup,
      login,
      loginDemo,
      logout,
      addTransaction,
      addInvoice,
      toggleInvoiceStatus,
      updateEmployees,
      updateInventory,
      updateBusinessProfile,
      updatePreferences,
      resetBusinessData,
      deleteCurrentAccount,
      dashboard,
    };
  }, [data, ready, currentUser]);

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore(): AppStoreContextValue {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error('useAppStore must be used within AppStoreProvider');
  return ctx;
}

