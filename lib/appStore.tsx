'use client';

import React, {
  createContext, useContext, useEffect,
  useMemo, useState, useRef, useCallback,
} from 'react';
import { supabase } from './supabase';
import type { Session } from '@supabase/supabase-js';
import type { Employee, InventoryItem, Invoice, InvoiceItem, Transaction } from './mockData';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  name: string;
  businessName: string;
  email: string;
  phone: string;
  gst: string;
  address: string;
  currency: string;
  emailNotifications: boolean;
  darkMode: boolean;
  twoFactorAuth: boolean;
  onboardingComplete: boolean;
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

// Kept for page backward‑compat
export interface UserAccount {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: string;
}

interface AppStoreContextValue {
  ready: boolean;
  session: Session | null;
  profile: Profile | null;
  // Legacy shape pages expect
  currentUser: UserAccount | null;
  data: {
    employees: Employee[];
    invoices: Invoice[];
    transactions: Transaction[];
    inventory: InventoryItem[];
    businessProfile: { businessName: string; email: string; phone: string; gst: string; address: string };
    preferences: { emailNotifications: boolean; darkMode: boolean; currency: string; twoFactorAuth: boolean };
  };
  // Auth
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signup: (name: string, email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  loginDemo: () => void;
  logout: () => void;
  // Onboarding
  completeOnboarding: (info: { businessName: string; phone: string; gst: string; address: string }) => Promise<void>;
  // Data ops
  addTransaction: (input: AddTransactionInput) => void;
  addInvoice: (input: AddInvoiceInput) => void;
  toggleInvoiceStatus: (id: string) => void;
  updateEmployees: (updater: (prev: Employee[]) => Employee[]) => void;
  updateInventory: (updater: (prev: InventoryItem[]) => InventoryItem[]) => void;
  updateBusinessProfile: (p: { businessName: string; email: string; phone: string; gst: string; address: string }) => void;
  updatePreferences: (p: { emailNotifications: boolean; darkMode: boolean; currency: string; twoFactorAuth: boolean }) => void;
  resetBusinessData: () => void;
  deleteCurrentAccount: () => void;
  // Dashboard
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

// ─── Load all data for a user ────────────────────────────────────────────────

async function loadUserData(userId: string) {
  const [
    { data: profileRow },
    { data: empRows },
    { data: attRows },
    { data: invRows },
    { data: itemRows },
    { data: txRows },
    { data: invtRows },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('employees').select('*').eq('user_id', userId).order('created_at'),
    supabase.from('attendance').select('*').eq('user_id', userId),
    supabase.from('invoices').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('invoice_items').select('*'),
    supabase.from('transactions').select('*').eq('user_id', userId).order('date', { ascending: false }),
    supabase.from('inventory').select('*').eq('user_id', userId).order('created_at'),
  ]);

  // Merge attendance into employees
  const employees: Employee[] = (empRows || []).map(e => {
    const empAtt = (attRows || []).filter(a => a.employee_id === e.id);
    const attendance: Record<string, 'present' | 'absent'> = {};
    empAtt.forEach(a => { attendance[a.date] = a.status; });
    return { id: e.id, name: e.name, role: e.role, avatar: e.avatar, attendance };
  });

  const invoices: Invoice[] = (invRows || []).map(inv => ({
    id: inv.id,
    invoiceNo: inv.invoice_no,
    client: inv.client,
    date: inv.date,
    dueDate: inv.due_date,
    status: inv.status as 'Paid' | 'Pending',
    items: (itemRows || []).filter(i => i.invoice_id === inv.id).map(i => ({
      description: i.description,
      qty: i.qty,
      price: Number(i.price),
    })),
  }));

  const transactions: Transaction[] = (txRows || []).map(tx => ({
    id: tx.id,
    type: tx.type as 'Income' | 'Expense',
    category: tx.category,
    amount: Number(tx.amount),
    date: tx.date,
    note: tx.note || '',
  }));

  const inventory: InventoryItem[] = (invtRows || []).map(i => ({
    id: i.id,
    name: i.name,
    sku: i.sku,
    category: i.category,
    unit: i.unit,
    openingQty: i.opening_qty,
    currentQty: i.current_qty,
    purchasePrice: Number(i.purchase_price),
    sellingPrice: Number(i.selling_price),
    reorderLevel: i.reorder_level,
    gstRate: Number(i.gst_rate),
  }));

  const profile: Profile | null = profileRow ? {
    id: profileRow.id,
    name: profileRow.name || '',
    businessName: profileRow.business_name || '',
    email: profileRow.email || '',
    phone: profileRow.phone || '',
    gst: profileRow.gst || '',
    address: profileRow.address || '',
    currency: profileRow.currency || 'INR',
    emailNotifications: profileRow.email_notifications ?? true,
    darkMode: profileRow.dark_mode ?? true,
    twoFactorAuth: profileRow.two_factor_auth ?? false,
    onboardingComplete: profileRow.onboarding_complete ?? false,
  } : null;

  return { employees, invoices, transactions, inventory, profile };
}

// ─── Dashboard computation ───────────────────────────────────────────────────

function computeDashboard(invoices: Invoice[], transactions: Transaction[]) {
  const totals = invoices.map(inv => ({
    status: inv.status,
    total: inv.items.reduce((s, i) => s + i.qty * i.price, 0),
  }));
  const totalRevenue = totals.filter(i => i.status === 'Paid').reduce((s, i) => s + i.total, 0);
  const pendingPayments = totals.filter(i => i.status === 'Pending').reduce((s, i) => s + i.total, 0);
  const totalExpenses = transactions.filter(t => t.type === 'Expense').reduce((s, t) => s + t.amount, 0);
  const netProfit = totalRevenue - totalExpenses;

  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleString('en-IN', { month: 'short' }) };
  });

  const revenueChart = months.map(m => {
    let revenue = 0; let expenses = 0;
    transactions.forEach(tx => {
      const d = new Date(tx.date);
      if (`${d.getFullYear()}-${d.getMonth()}` !== m.key) return;
      if (tx.type === 'Income') revenue += tx.amount; else expenses += tx.amount;
    });
    return { month: m.label, revenue, expenses };
  });

  const catMap = new Map<string, number>();
  transactions.filter(t => t.type === 'Expense').forEach(t => {
    catMap.set(t.category, (catMap.get(t.category) ?? 0) + t.amount);
  });
  const COLORS = ['#3b82f6', '#06b6d4', '#8b5cf6', '#f59e0b', '#22c55e', '#ef4444', '#14b8a6'];
  const expensePie = Array.from(catMap.entries()).map(([name, value], idx) => ({
    name, value, color: COLORS[idx % COLORS.length],
  }));

  return { totalRevenue, totalExpenses, netProfit, pendingPayments, revenueChart, expensePie };
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [ready, setReady] = useState(false);

  // Refs so callbacks have fresh values without re-creating
  const empRef = useRef<Employee[]>([]);
  const invtRef = useRef<InventoryItem[]>([]);
  const profileRef = useRef<Profile | null>(null);

  const refresh = useCallback(async (uid: string) => {
    const d = await loadUserData(uid);
    setProfile(d.profile); profileRef.current = d.profile;
    setEmployees(d.employees); empRef.current = d.employees;
    setInvoices(d.invoices);
    setTransactions(d.transactions);
    setInventory(d.inventory); invtRef.current = d.inventory;
  }, []);

  const clearData = useCallback(() => {
    setProfile(null); profileRef.current = null;
    setEmployees([]); empRef.current = [];
    setInvoices([]);
    setTransactions([]);
    setInventory([]); invtRef.current = [];
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) await refresh(s.user.id);
      setReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      setSession(s);
      if (s?.user && event === 'SIGNED_IN') await refresh(s.user.id);
      if (!s) clearData();
    });
    return () => subscription.unsubscribe();
  }, [refresh, clearData]);

  const uid = session?.user?.id;

  // ── Auth ──────────────────────────────────────────────────────

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email, password, options: { data: { name } },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }, []);

  const loginDemo = useCallback(() => { }, []); // removed in production

  const logout = useCallback(() => {
    supabase.auth.signOut();
  }, []);

  // ── Onboarding ────────────────────────────────────────────────

  const completeOnboarding = useCallback(async (info: {
    businessName: string; phone: string; gst: string; address: string;
  }) => {
    if (!uid) return;
    await supabase.from('profiles').update({
      business_name: info.businessName,
      phone: info.phone,
      gst: info.gst,
      address: info.address,
      onboarding_complete: true,
    }).eq('id', uid);
    setProfile(prev => prev ? { ...prev, ...info, onboardingComplete: true } : prev);
    profileRef.current = profileRef.current ? { ...profileRef.current, ...info, onboardingComplete: true } : null;
  }, [uid]);

  // ── Data mutations ────────────────────────────────────────────

  const addTransaction = useCallback((input: AddTransactionInput) => {
    if (!uid) return;
    const id = 't-' + Date.now().toString(36);
    const tx: Transaction = { id, ...input };
    setTransactions(prev => [tx, ...prev]);
    supabase.from('transactions').insert({ id, user_id: uid, ...input })
      .then(({ error }) => { if (error) console.error(error); });
  }, [uid]);

  const addInvoice = useCallback((input: AddInvoiceInput) => {
    if (!uid) return;
    const id = 'inv-' + Date.now().toString(36);
    const invoiceNo = `INV-${String(invoices.length + 1).padStart(3, '0')}`;
    const invoice: Invoice = { id, invoiceNo, client: input.client, date: input.date, dueDate: input.dueDate || input.date, items: input.items, status: 'Pending' };
    setInvoices(prev => [invoice, ...prev]);
    supabase.from('invoices').insert({ id, user_id: uid, invoice_no: invoiceNo, client: input.client, date: input.date, due_date: input.dueDate || input.date, status: 'Pending' })
      .then(async ({ error }) => {
        if (error) { console.error(error); return; }
        await supabase.from('invoice_items').insert(input.items.map(i => ({ invoice_id: id, ...i })));
      });
  }, [uid, invoices.length]);

  const toggleInvoiceStatus = useCallback((id: string) => {
    if (!uid) return;
    setInvoices(prev => {
      const target = prev.find(i => i.id === id);
      if (!target) return prev;
      const isPaid = target.status === 'Paid';
      const nextStatus: Invoice['status'] = isPaid ? 'Pending' : 'Paid';
      supabase.from('invoices').update({ status: nextStatus }).eq('id', id).then(({ error }) => { if (error) console.error(error); });
      if (!isPaid) {
        const total = target.items.reduce((s, i) => s + i.qty * i.price, 0);
        const txId = 't-pay-' + Date.now().toString(36);
        const tx: Transaction = { id: txId, type: 'Income', category: 'Client Payment', amount: total, date: new Date().toISOString().split('T')[0], note: `${target.invoiceNo} — ${target.client}` };
        setTransactions(p => [tx, ...p]);
        supabase.from('transactions').insert({ id: txId, user_id: uid, type: 'Income', category: 'Client Payment', amount: total, date: tx.date, note: tx.note }).then(({ error }) => { if (error) console.error(error); });
      }
      return prev.map(i => i.id === id ? { ...i, status: nextStatus } : i);
    });
  }, [uid]);

  const updateEmployees = useCallback((updater: (prev: Employee[]) => Employee[]) => {
    if (!uid) return;
    const prev = empRef.current;
    const next = updater(prev);
    empRef.current = next;
    setEmployees(next);

    // Sync new employees
    const prevIds = new Set(prev.map(e => e.id));
    for (const emp of next) {
      if (!prevIds.has(emp.id)) {
        supabase.from('employees').insert({ id: emp.id, user_id: uid, name: emp.name, role: emp.role, avatar: emp.avatar })
          .then(({ error }) => { if (error) console.error(error); });
      }
    }
    // Sync attendance changes
    const prevMap = new Map(prev.map(e => [e.id, e]));
    for (const emp of next) {
      const old = prevMap.get(emp.id);
      if (!old) continue;
      const changed = Object.entries(emp.attendance || {}).filter(([d, s]) => old.attendance?.[d] !== s);
      if (changed.length === 0) continue;
      supabase.from('attendance').upsert(
        changed.map(([date, status]) => ({ employee_id: emp.id, user_id: uid, date, status })),
        { onConflict: 'employee_id,date' }
      ).then(({ error }) => { if (error) console.error(error); });
    }
  }, [uid]);

  const updateInventory = useCallback((updater: (prev: InventoryItem[]) => InventoryItem[]) => {
    if (!uid) return;
    const prev = invtRef.current;
    const next = updater(prev);
    invtRef.current = next;
    setInventory(next);

    const prevIds = new Set(prev.map(i => i.id));
    for (const item of next) {
      if (!prevIds.has(item.id)) {
        supabase.from('inventory').insert({ id: item.id, user_id: uid, name: item.name, sku: item.sku, category: item.category, unit: item.unit, opening_qty: item.openingQty, current_qty: item.currentQty, purchase_price: item.purchasePrice, selling_price: item.sellingPrice, reorder_level: item.reorderLevel, gst_rate: item.gstRate })
          .then(({ error }) => { if (error) console.error(error); });
      } else {
        supabase.from('inventory').update({ current_qty: item.currentQty, selling_price: item.sellingPrice, reorder_level: item.reorderLevel }).eq('id', item.id)
          .then(({ error }) => { if (error) console.error(error); });
      }
    }
  }, [uid]);

  const updateBusinessProfile = useCallback((p: { businessName: string; email: string; phone: string; gst: string; address: string }) => {
    if (!uid) return;
    setProfile(prev => prev ? { ...prev, ...p } : prev);
    profileRef.current = profileRef.current ? { ...profileRef.current, ...p } : null;
    supabase.from('profiles').update({ business_name: p.businessName, email: p.email, phone: p.phone, gst: p.gst, address: p.address }).eq('id', uid)
      .then(({ error }) => { if (error) console.error(error); });
  }, [uid]);

  const updatePreferences = useCallback((p: { emailNotifications: boolean; darkMode: boolean; currency: string; twoFactorAuth: boolean }) => {
    if (!uid) return;
    setProfile(prev => prev ? { ...prev, emailNotifications: p.emailNotifications, darkMode: p.darkMode, currency: p.currency, twoFactorAuth: p.twoFactorAuth } : prev);
    supabase.from('profiles').update({ email_notifications: p.emailNotifications, dark_mode: p.darkMode, currency: p.currency, two_factor_auth: p.twoFactorAuth }).eq('id', uid)
      .then(({ error }) => { if (error) console.error(error); });
  }, [uid]);

  const resetBusinessData = useCallback(() => {
    if (!uid) return;
    Promise.all([
      supabase.from('employees').delete().eq('user_id', uid),
      supabase.from('invoices').delete().eq('user_id', uid),
      supabase.from('transactions').delete().eq('user_id', uid),
      supabase.from('inventory').delete().eq('user_id', uid),
    ]).then(() => { setEmployees([]); setInvoices([]); setTransactions([]); setInventory([]); empRef.current = []; invtRef.current = []; });
  }, [uid]);

  const deleteCurrentAccount = useCallback(() => {
    if (!uid) return;
    supabase.auth.signOut();
  }, [uid]);

  // ── Memoised values ───────────────────────────────────────────

  const currentUser = useMemo<UserAccount | null>(() => {
    if (!session?.user || !profile) return null;
    return { id: session.user.id, name: profile.name, email: profile.email, password: '', createdAt: session.user.created_at };
  }, [session, profile]);

  const data = useMemo(() => ({
    employees,
    invoices,
    transactions,
    inventory,
    businessProfile: { businessName: profile?.businessName ?? '', email: profile?.email ?? '', phone: profile?.phone ?? '', gst: profile?.gst ?? '', address: profile?.address ?? '' },
    preferences: { emailNotifications: profile?.emailNotifications ?? true, darkMode: profile?.darkMode ?? true, currency: profile?.currency ?? 'INR', twoFactorAuth: profile?.twoFactorAuth ?? false },
  }), [employees, invoices, transactions, inventory, profile]);

  const dashboard = useMemo(() => computeDashboard(invoices, transactions), [invoices, transactions]);

  const value = useMemo<AppStoreContextValue>(() => ({
    ready, session, profile, currentUser, data,
    login, signup, loginDemo, logout,
    completeOnboarding,
    addTransaction, addInvoice, toggleInvoiceStatus,
    updateEmployees, updateInventory, updateBusinessProfile, updatePreferences,
    resetBusinessData, deleteCurrentAccount,
    dashboard,
  }), [ready, session, profile, currentUser, data, login, signup, loginDemo, logout, completeOnboarding, addTransaction, addInvoice, toggleInvoiceStatus, updateEmployees, updateInventory, updateBusinessProfile, updatePreferences, resetBusinessData, deleteCurrentAccount, dashboard]);

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore(): AppStoreContextValue {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error('useAppStore must be used within AppStoreProvider');
  return ctx;
}
