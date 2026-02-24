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
  currentUser: UserAccount | null;
  data: {
    employees: Employee[];
    invoices: Invoice[];
    transactions: Transaction[];
    inventory: InventoryItem[];
    businessProfile: { businessName: string; email: string; phone: string; gst: string; address: string };
    preferences: { emailNotifications: boolean; darkMode: boolean; currency: string; twoFactorAuth: boolean };
  };
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signup: (name: string, email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  loginDemo: () => void;
  logout: () => void;
  completeOnboarding: (info: { businessName: string; phone: string; gst: string; address: string }) => Promise<void>;
  addTransaction: (input: AddTransactionInput) => void;
  addInvoice: (input: AddInvoiceInput) => void;
  toggleInvoiceStatus: (id: string) => void;
  updateEmployees: (updater: (prev: Employee[]) => Employee[]) => void;
  updateInventory: (updater: (prev: InventoryItem[]) => InventoryItem[]) => void;
  updateBusinessProfile: (p: { businessName: string; email: string; phone: string; gst: string; address: string }) => void;
  updatePreferences: (p: { emailNotifications: boolean; darkMode: boolean; currency: string; twoFactorAuth: boolean }) => void;
  resetBusinessData: () => void;
  deleteCurrentAccount: () => void;
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

// ─── Load all data for a user ─────────────────────────────────────────────────

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
    supabase.from('invoice_items').select('*').eq('user_id', userId),
    supabase.from('transactions').select('*').eq('user_id', userId).order('date', { ascending: false }),
    supabase.from('inventory').select('*').eq('user_id', userId).order('created_at'),
  ]);

  // Employees with merged attendance
  const employees: Employee[] = (empRows || []).map(e => {
    const attendance: Record<string, 'present' | 'absent'> = {};
    (attRows || []).filter(a => a.employee_id === e.id).forEach(a => {
      attendance[a.date] = a.status;
    });
    return { id: e.id, name: e.name, role: e.role, avatar: e.avatar, attendance };
  });

  // Invoices with merged items
  const invoices: Invoice[] = (invRows || []).map(inv => ({
    id: inv.id,
    invoiceNo: inv.invoice_no,
    client: inv.client,
    date: inv.date,
    dueDate: inv.due_date,
    status: inv.status as 'Paid' | 'Pending',
    items: (itemRows || []).filter(i => i.invoice_id === inv.id).map(i => ({
      description: i.description,
      qty: Number(i.qty),
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
    sku: i.sku || '',
    category: i.category || 'General',
    unit: i.unit || 'Units',
    openingQty: Number(i.opening_qty),
    currentQty: Number(i.current_qty),
    purchasePrice: Number(i.purchase_price),
    sellingPrice: Number(i.selling_price),
    reorderLevel: Number(i.reorder_level),
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

// ─── Dashboard ───────────────────────────────────────────────────────────────

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

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [ready, setReady] = useState(false);

  // Refs for stable values inside callbacks (avoids stale closures)
  const uidRef = useRef<string | undefined>(undefined);
  const empRef = useRef<Employee[]>([]);
  const invtRef = useRef<InventoryItem[]>([]);
  const invoiceCountRef = useRef<number>(0);

  const refresh = useCallback(async (uid: string) => {
    const d = await loadUserData(uid);
    setProfile(d.profile);
    setEmployees(d.employees); empRef.current = d.employees;
    setInvoices(d.invoices); invoiceCountRef.current = d.invoices.length;
    setTransactions(d.transactions);
    setInventory(d.inventory); invtRef.current = d.inventory;
  }, []);

  const clearData = useCallback(() => {
    uidRef.current = undefined;
    setProfile(null);
    setEmployees([]); empRef.current = [];
    setInvoices([]); invoiceCountRef.current = 0;
    setTransactions([]);
    setInventory([]); invtRef.current = [];
  }, []);

  // Handle ALL auth events (INITIAL_SESSION, SIGNED_IN, TOKEN_REFRESHED, SIGNED_OUT)
  // setReady(true) fires IMMEDIATELY after we know the session state — before refresh()
  // completes — so AppLayout never blocks on data loading.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s);
      if (s?.user) {
        uidRef.current = s.user.id;
        setReady(true);           // ← ready IMMEDIATELY so AppLayout can render
        await refresh(s.user.id); // ← data loads in background
      } else {
        clearData();
        setReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, [refresh, clearData]);

  // Keep invoiceCountRef in sync whenever invoices state changes
  useEffect(() => {
    invoiceCountRef.current = invoices.length;
  }, [invoices.length]);

  // ── Auth ──────────────────────────────────────────────────────────────────

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

  const loginDemo = useCallback(() => { }, []);

  const logout = useCallback(() => {
    supabase.auth.signOut();
  }, []);

  // ── Onboarding ────────────────────────────────────────────────────────────

  const completeOnboarding = useCallback(async (info: {
    businessName: string; phone: string; gst: string; address: string;
  }) => {
    const uid = uidRef.current;
    if (!uid) return;
    await supabase.from('profiles').update({
      business_name: info.businessName,
      phone: info.phone,
      gst: info.gst,
      address: info.address,
      onboarding_complete: true,
    }).eq('id', uid);
    setProfile(prev => prev ? { ...prev, ...info, onboardingComplete: true } : prev);
  }, []);

  // ── FIX #2 & #3: addTransaction ─────────────────────────────────────────

  const addTransaction = useCallback((input: AddTransactionInput) => {
    const uid = uidRef.current;
    if (!uid) return;
    const id = 't-' + Date.now().toString(36);
    const tx: Transaction = { id, ...input };
    setTransactions(prev => [tx, ...prev]);
    supabase.from('transactions')
      .insert({ id, user_id: uid, type: input.type, category: input.category, amount: input.amount, date: input.date, note: input.note })
      .then(({ error }) => { if (error) console.error('addTransaction:', error.message, error.details); });
  }, []);

  // ── FIX #3: addInvoice — use ref for count, await invoice before items ───

  const addInvoice = useCallback((input: AddInvoiceInput) => {
    const uid = uidRef.current;
    if (!uid) return;

    const id = 'inv-' + Date.now().toString(36);
    // FIX: use ref (not stale state closure) for invoice count
    const invoiceNo = `INV-${String(invoiceCountRef.current + 1).padStart(3, '0')}`;
    invoiceCountRef.current += 1;

    const invoice: Invoice = {
      id,
      invoiceNo,
      client: input.client,
      date: input.date,
      dueDate: input.dueDate || input.date,
      items: input.items,
      status: 'Pending',
    };
    setInvoices(prev => [invoice, ...prev]);

    // FIX: await invoice row before inserting items, pass user_id on items
    (async () => {
      const { error: invErr } = await supabase.from('invoices').insert({
        id,
        user_id: uid,
        invoice_no: invoiceNo,
        client: input.client,
        date: input.date,
        due_date: input.dueDate || input.date,
        status: 'Pending',
      });
      if (invErr) { console.error('addInvoice header:', invErr.message, invErr.details); return; }

      if (input.items.length > 0) {
        const { error: itemErr } = await supabase.from('invoice_items').insert(
          input.items.map(i => ({
            invoice_id: id,
            user_id: uid,           // FIX: include user_id so RLS is satisfied
            description: i.description,
            qty: i.qty,
            price: i.price,
          }))
        );
        if (itemErr) console.error('addInvoice items:', itemErr.message, itemErr.details);
      }
    })();
  }, []);

  // ── toggleInvoiceStatus ───────────────────────────────────────────────────

  const toggleInvoiceStatus = useCallback((id: string) => {
    const uid = uidRef.current;
    if (!uid) return;

    setInvoices(prev => {
      const target = prev.find(i => i.id === id);
      if (!target) return prev;
      const isPaid = target.status === 'Paid';
      const nextStatus: Invoice['status'] = isPaid ? 'Pending' : 'Paid';

      supabase.from('invoices').update({ status: nextStatus }).eq('id', id)
        .then(({ error }) => { if (error) console.error('toggleInvoice:', error.message); });

      if (!isPaid) {
        const total = target.items.reduce((s, i) => s + i.qty * i.price, 0);
        const txId = 't-pay-' + Date.now().toString(36);
        const tx: Transaction = {
          id: txId,
          type: 'Income',
          category: 'Client Payment',
          amount: total,
          date: new Date().toISOString().split('T')[0],
          note: `${target.invoiceNo} — ${target.client}`,
        };
        setTransactions(p => [tx, ...p]);
        supabase.from('transactions').insert({ id: txId, user_id: uid, type: 'Income', category: 'Client Payment', amount: total, date: tx.date, note: tx.note })
          .then(({ error }) => { if (error) console.error('toggleInvoice tx:', error.message); });
      }

      return prev.map(i => i.id === id ? { ...i, status: nextStatus } : i);
    });
  }, []);

  // ── updateEmployees (diff-sync) ───────────────────────────────────────────

  const updateEmployees = useCallback((updater: (prev: Employee[]) => Employee[]) => {
    const uid = uidRef.current;
    const prev = empRef.current;
    const next = updater(prev);
    empRef.current = next;
    setEmployees(next);
    if (!uid) return;

    const prevIds = new Set(prev.map(e => e.id));
    // New employees
    for (const emp of next) {
      if (!prevIds.has(emp.id)) {
        supabase.from('employees').insert({ id: emp.id, user_id: uid, name: emp.name, role: emp.role, avatar: emp.avatar })
          .then(({ error }) => { if (error) console.error('insertEmployee:', error.message); });
      }
    }
    // Attendance diffs
    const prevMap = new Map(prev.map(e => [e.id, e]));
    for (const emp of next) {
      const old = prevMap.get(emp.id);
      if (!old) continue;
      const changed = Object.entries(emp.attendance || {}).filter(([d, s]) => old.attendance?.[d] !== s);
      if (changed.length === 0) continue;
      supabase.from('attendance').upsert(
        changed.map(([date, status]) => ({ employee_id: emp.id, user_id: uid, date, status })),
        { onConflict: 'employee_id,date' }
      ).then(({ error }) => { if (error) console.error('upsertAttendance:', error.message); });
    }
  }, []);

  // ── updateInventory ───────────────────────────────────────────────────────

  const updateInventory = useCallback((updater: (prev: InventoryItem[]) => InventoryItem[]) => {
    const uid = uidRef.current;
    const prev = invtRef.current;
    const next = updater(prev);
    invtRef.current = next;
    setInventory(next);
    if (!uid) return;

    const prevIds = new Set(prev.map(i => i.id));
    for (const item of next) {
      if (!prevIds.has(item.id)) {
        supabase.from('inventory').insert({ id: item.id, user_id: uid, name: item.name, sku: item.sku, category: item.category, unit: item.unit, opening_qty: item.openingQty, current_qty: item.currentQty, purchase_price: item.purchasePrice, selling_price: item.sellingPrice, reorder_level: item.reorderLevel, gst_rate: item.gstRate })
          .then(({ error }) => { if (error) console.error('insertInventory:', error.message); });
      } else {
        supabase.from('inventory').update({ current_qty: item.currentQty, selling_price: item.sellingPrice, reorder_level: item.reorderLevel }).eq('id', item.id)
          .then(({ error }) => { if (error) console.error('updateInventory:', error.message); });
      }
    }
  }, []);

  // ── Profile / preferences ─────────────────────────────────────────────────

  const updateBusinessProfile = useCallback((p: { businessName: string; email: string; phone: string; gst: string; address: string }) => {
    const uid = uidRef.current;
    if (!uid) return;
    setProfile(prev => prev ? { ...prev, ...p } : prev);
    supabase.from('profiles').update({ business_name: p.businessName, email: p.email, phone: p.phone, gst: p.gst, address: p.address }).eq('id', uid)
      .then(({ error }) => { if (error) console.error('updateBusinessProfile:', error.message); });
  }, []);

  const updatePreferences = useCallback((p: { emailNotifications: boolean; darkMode: boolean; currency: string; twoFactorAuth: boolean }) => {
    const uid = uidRef.current;
    if (!uid) return;
    setProfile(prev => prev ? { ...prev, emailNotifications: p.emailNotifications, darkMode: p.darkMode, currency: p.currency, twoFactorAuth: p.twoFactorAuth } : prev);
    supabase.from('profiles').update({ email_notifications: p.emailNotifications, dark_mode: p.darkMode, currency: p.currency, two_factor_auth: p.twoFactorAuth }).eq('id', uid)
      .then(({ error }) => { if (error) console.error('updatePreferences:', error.message); });
  }, []);

  const resetBusinessData = useCallback(() => {
    const uid = uidRef.current;
    if (!uid) return;
    Promise.all([
      supabase.from('employees').delete().eq('user_id', uid),
      supabase.from('invoices').delete().eq('user_id', uid),
      supabase.from('transactions').delete().eq('user_id', uid),
      supabase.from('inventory').delete().eq('user_id', uid),
    ]).then(() => {
      setEmployees([]); empRef.current = [];
      setInvoices([]); invoiceCountRef.current = 0;
      setTransactions([]);
      setInventory([]); invtRef.current = [];
    });
  }, []);

  const deleteCurrentAccount = useCallback(() => {
    supabase.auth.signOut();
  }, []);

  // ── Derived values ────────────────────────────────────────────────────────

  // currentUser derived from session ONLY (not requiring profile) so it is
  // non-null the instant signInWithPassword resolves — prevents redirect loop
  // where AppLayout sees null user before profile loads and bounces back to /.
  const currentUser = useMemo<UserAccount | null>(() => {
    if (!session?.user) return null;
    const u = session.user;
    return {
      id: u.id,
      name: profile?.name ?? u.email?.split('@')[0] ?? 'User',
      email: profile?.email ?? u.email ?? '',
      password: '',
      createdAt: u.created_at,
    };
  }, [session, profile]);

  const data = useMemo(() => ({
    employees,
    invoices,
    transactions,
    inventory,
    businessProfile: {
      businessName: profile?.businessName ?? '',
      email: profile?.email ?? '',
      phone: profile?.phone ?? '',
      gst: profile?.gst ?? '',
      address: profile?.address ?? '',
    },
    preferences: {
      emailNotifications: profile?.emailNotifications ?? true,
      darkMode: profile?.darkMode ?? true,
      currency: profile?.currency ?? 'INR',
      twoFactorAuth: profile?.twoFactorAuth ?? false,
    },
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
  }), [
    ready, session, profile, currentUser, data,
    login, signup, loginDemo, logout, completeOnboarding,
    addTransaction, addInvoice, toggleInvoiceStatus,
    updateEmployees, updateInventory, updateBusinessProfile, updatePreferences,
    resetBusinessData, deleteCurrentAccount, dashboard,
  ]);

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore(): AppStoreContextValue {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error('useAppStore must be used within AppStoreProvider');
  return ctx;
}
