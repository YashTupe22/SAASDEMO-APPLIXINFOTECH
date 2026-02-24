'use client';

import React, {
  createContext, useContext, useEffect,
  useMemo, useState, useRef, useCallback,
} from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  doc, getDoc, setDoc, updateDoc,
  collection, getDocs, deleteDoc,
  writeBatch, query, orderBy,
} from 'firebase/firestore';
import { auth, db } from './firebase';
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
  session: FirebaseUser | null;
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

// ─── Firestore helpers ────────────────────────────────────────────────────────

const userCol = (uid: string, col: string) => collection(db, 'users', uid, col);
const userDoc = (uid: string)               => doc(db, 'users', uid);

// ─── Load all data for a user ─────────────────────────────────────────────────

async function loadUserData(userId: string) {
  const [profileSnap, empSnaps, invSnaps, txSnaps, invtSnaps] = await Promise.all([
    getDoc(userDoc(userId)),
    getDocs(query(userCol(userId, 'employees'), orderBy('createdAt'))),
    getDocs(query(userCol(userId, 'invoices'),  orderBy('createdAt', 'desc'))),
    getDocs(query(userCol(userId, 'transactions'), orderBy('date', 'desc'))),
    getDocs(query(userCol(userId, 'inventory'),  orderBy('createdAt'))),
  ]);

  const employees: Employee[] = empSnaps.docs.map(d => {
    const e = d.data();
    return { id: d.id, name: e.name, role: e.role, avatar: e.avatar, attendance: e.attendance ?? {} };
  });

  const invoices: Invoice[] = invSnaps.docs.map(d => {
    const inv = d.data();
    return {
      id: d.id,
      invoiceNo: inv.invoiceNo,
      client: inv.client,
      date: inv.date,
      dueDate: inv.dueDate,
      status: inv.status as 'Paid' | 'Pending',
      items: (inv.items ?? []) as InvoiceItem[],
    };
  });

  const transactions: Transaction[] = txSnaps.docs.map(d => {
    const tx = d.data();
    return {
      id: d.id,
      type: tx.type as 'Income' | 'Expense',
      category: tx.category,
      amount: Number(tx.amount),
      date: tx.date,
      note: tx.note || '',
    };
  });

  const inventory: InventoryItem[] = invtSnaps.docs.map(d => {
    const i = d.data();
    return {
      id: d.id,
      name: i.name,
      sku: i.sku || '',
      category: i.category || 'General',
      unit: i.unit || 'Units',
      openingQty: Number(i.openingQty),
      currentQty: Number(i.currentQty),
      purchasePrice: Number(i.purchasePrice),
      sellingPrice: Number(i.sellingPrice),
      reorderLevel: Number(i.reorderLevel),
      gstRate: Number(i.gstRate),
    };
  });

  const profileData = profileSnap.data();
  const profile: Profile | null = profileData ? {
    id: userId,
    name: profileData.name || '',
    businessName: profileData.businessName || '',
    email: profileData.email || '',
    phone: profileData.phone || '',
    gst: profileData.gst || '',
    address: profileData.address || '',
    currency: profileData.currency || 'INR',
    emailNotifications: profileData.emailNotifications ?? true,
    darkMode: profileData.darkMode ?? true,
    twoFactorAuth: profileData.twoFactorAuth ?? false,
    onboardingComplete: profileData.onboardingComplete ?? false,
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
  const [session, setSession] = useState<FirebaseUser | null>(null);
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

  // Firebase auth listener — fires immediately with cached user (no network needed)
  useEffect(() => {
    let readySet = false;
    const markReady = () => { if (!readySet) { readySet = true; setReady(true); } };

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setSession(user);
      if (user) {
        uidRef.current = user.uid;
        markReady();
        await refresh(user.uid);
      } else {
        clearData();
        markReady();
      }
    });

    // Safety net: never leave the user on a blank loading screen
    const timeout = setTimeout(markReady, 5000);

    return () => { unsubscribe(); clearTimeout(timeout); };
  }, [refresh, clearData]);

  // Theme hydration: prefer localStorage, then profile.darkMode
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem('synplix-theme');
    const theme = stored === 'light' || stored === 'dark'
      ? stored
      : (profile?.darkMode === false ? 'light' : 'dark');
    document.documentElement.dataset.theme = theme;
  }, [profile?.darkMode]);

  // Keep invoiceCountRef in sync whenever invoices state changes
  useEffect(() => {
    invoiceCountRef.current = invoices.length;
  }, [invoices.length]);

  // ── Auth ──────────────────────────────────────────────────────────────────

  const login = useCallback(async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { ok: true };
    } catch (e: any) {
      const msg: string = e?.message ?? 'Login failed.';
      return { ok: false, error: msg.replace('Firebase: ', '').replace(/ \(auth\/.*\)\.?/, '') };
    }
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });
      // Create the profile document in Firestore
      await setDoc(userDoc(cred.user.uid), {
        name,
        email,
        businessName: '',
        phone: '',
        gst: '',
        address: '',
        currency: 'INR',
        emailNotifications: true,
        darkMode: true,
        twoFactorAuth: false,
        onboardingComplete: false,
      });
      return { ok: true };
    } catch (e: any) {
      const msg: string = e?.message ?? 'Signup failed.';
      return { ok: false, error: msg.replace('Firebase: ', '').replace(/ \(auth\/.*\)\.?/, '') };
    }
  }, []);

  const loginDemo = useCallback(() => { }, []);

  const logout = useCallback(() => {
    firebaseSignOut(auth).catch(err => console.error('signOut:', err));
  }, []);

  // ── Onboarding ────────────────────────────────────────────────────────────

  const completeOnboarding = useCallback(async (info: {
    businessName: string; phone: string; gst: string; address: string;
  }) => {
    const uid = uidRef.current;
    if (!uid) return;
    await updateDoc(userDoc(uid), {
      businessName: info.businessName,
      phone: info.phone,
      gst: info.gst,
      address: info.address,
      onboardingComplete: true,
    });
    setProfile(prev => prev ? { ...prev, ...info, onboardingComplete: true } : prev);
  }, []);

  // ── addTransaction ────────────────────────────────────────────────────────

  const addTransaction = useCallback((input: AddTransactionInput) => {
    const uid = uidRef.current;
    if (!uid) return;
    const id = crypto.randomUUID();
    const tx: Transaction = { id, ...input };
    setTransactions(prev => [tx, ...prev]);
    setDoc(doc(userCol(uid, 'transactions'), id), {
      type: input.type, category: input.category,
      amount: input.amount, date: input.date, note: input.note,
    }).catch(err => console.error('addTransaction:', err));
  }, []);

  // ── addInvoice ────────────────────────────────────────────────────────────

  const addInvoice = useCallback((input: AddInvoiceInput) => {
    const uid = uidRef.current;
    if (!uid) return;
    const id = crypto.randomUUID();
    const invoiceNo = `INV-${String(invoiceCountRef.current + 1).padStart(3, '0')}`;
    invoiceCountRef.current += 1;
    const invoice: Invoice = {
      id, invoiceNo, client: input.client,
      date: input.date, dueDate: input.dueDate || input.date,
      items: input.items, status: 'Pending',
    };
    setInvoices(prev => [invoice, ...prev]);
    setDoc(doc(userCol(uid, 'invoices'), id), {
      invoiceNo, client: input.client,
      date: input.date, dueDate: input.dueDate || input.date,
      status: 'Pending', items: input.items,
      createdAt: new Date().toISOString(),
    }).catch(err => console.error('addInvoice:', err));
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
      updateDoc(doc(userCol(uid, 'invoices'), id), { status: nextStatus })
        .catch(err => console.error('toggleInvoice:', err));
      if (!isPaid) {
        const total = target.items.reduce((s, i) => s + i.qty * i.price, 0);
        const txId = crypto.randomUUID();
        const tx: Transaction = {
          id: txId, type: 'Income', category: 'Client Payment', amount: total,
          date: new Date().toISOString().split('T')[0],
          note: `${target.invoiceNo} — ${target.client}`,
        };
        setTransactions(p => [tx, ...p]);
        setDoc(doc(userCol(uid, 'transactions'), txId), {
          type: 'Income', category: 'Client Payment', amount: total,
          date: tx.date, note: tx.note,
        }).catch(err => console.error('toggleInvoice tx:', err));
      }
      return prev.map(i => i.id === id ? { ...i, status: nextStatus } : i);
    });
  }, []);

  // ── updateEmployees (diff-sync with embedded attendance) ─────────────────

  const updateEmployees = useCallback((updater: (prev: Employee[]) => Employee[]) => {
    const uid = uidRef.current;
    const prev = empRef.current;
    const next = updater(prev);
    empRef.current = next;
    setEmployees(next);
    if (!uid) return;
    const prevIds = new Set(prev.map(e => e.id));
    for (const emp of next) {
      if (!prevIds.has(emp.id)) {
        // New employee
        setDoc(doc(userCol(uid, 'employees'), emp.id), {
          name: emp.name, role: emp.role, avatar: emp.avatar,
          attendance: emp.attendance ?? {}, createdAt: new Date().toISOString(),
        }).catch(err => console.error('insertEmployee:', err));
      } else {
        // Check if attendance changed
        const old = prev.find(e => e.id === emp.id);
        if (old && JSON.stringify(old.attendance) !== JSON.stringify(emp.attendance)) {
          updateDoc(doc(userCol(uid, 'employees'), emp.id), { attendance: emp.attendance })
            .catch(err => console.error('updateAttendance:', err));
        }
      }
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
        setDoc(doc(userCol(uid, 'inventory'), item.id), {
          name: item.name, sku: item.sku, category: item.category, unit: item.unit,
          openingQty: item.openingQty, currentQty: item.currentQty,
          purchasePrice: item.purchasePrice, sellingPrice: item.sellingPrice,
          reorderLevel: item.reorderLevel, gstRate: item.gstRate,
          createdAt: new Date().toISOString(),
        }).catch(err => console.error('insertInventory:', err));
      } else {
        updateDoc(doc(userCol(uid, 'inventory'), item.id), {
          currentQty: item.currentQty, sellingPrice: item.sellingPrice,
          reorderLevel: item.reorderLevel,
        }).catch(err => console.error('updateInventory:', err));
      }
    }
  }, []);

  // ── Profile / Preferences ─────────────────────────────────────────────────

  const updateBusinessProfile = useCallback((p: { businessName: string; email: string; phone: string; gst: string; address: string }) => {
    const uid = uidRef.current;
    if (!uid) return;
    setProfile(prev => prev ? { ...prev, ...p } : prev);
    updateDoc(userDoc(uid), { businessName: p.businessName, email: p.email, phone: p.phone, gst: p.gst, address: p.address })
      .catch(err => console.error('updateBusinessProfile:', err));
  }, []);

  const updatePreferences = useCallback((p: { emailNotifications: boolean; darkMode: boolean; currency: string; twoFactorAuth: boolean }) => {
    const uid = uidRef.current;
    if (!uid) return;
    setProfile(prev => prev ? { ...prev, emailNotifications: p.emailNotifications, darkMode: p.darkMode, currency: p.currency, twoFactorAuth: p.twoFactorAuth } : prev);
    updateDoc(userDoc(uid), { emailNotifications: p.emailNotifications, darkMode: p.darkMode, currency: p.currency, twoFactorAuth: p.twoFactorAuth })
      .catch(err => console.error('updatePreferences:', err));
    if (typeof window !== 'undefined') {
      const theme = p.darkMode ? 'dark' : 'light';
      window.localStorage.setItem('synplix-theme', theme);
      document.documentElement.dataset.theme = theme;
    }
  }, []);

  const resetBusinessData = useCallback(() => {
    const uid = uidRef.current;
    if (!uid) return;
    const deleteAll = async (colName: string) => {
      const snaps = await getDocs(userCol(uid, colName));
      const batch = writeBatch(db);
      snaps.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
    };
    Promise.all([
      deleteAll('employees'),
      deleteAll('invoices'),
      deleteAll('transactions'),
      deleteAll('inventory'),
    ]).then(() => {
      setEmployees([]); empRef.current = [];
      setInvoices([]); invoiceCountRef.current = 0;
      setTransactions([]);
      setInventory([]); invtRef.current = [];
    }).catch(err => console.error('resetBusinessData:', err));
  }, []);

  const deleteCurrentAccount = useCallback(() => {
    firebaseSignOut(auth).catch(err => console.error('deleteAccount signOut:', err));
  }, []);

  // ── Derived values ────────────────────────────────────────────────────────

  // currentUser derived from session ONLY (not requiring profile) so it is
  // non-null the instant signInWithPassword resolves — prevents redirect loop
  // where AppLayout sees null user before profile loads and bounces back to /.
  const currentUser = useMemo<UserAccount | null>(() => {
    if (!session) return null;
    return {
      id: session.uid,
      name: profile?.name ?? session.displayName ?? session.email?.split('@')[0] ?? 'User',
      email: profile?.email ?? session.email ?? '',
      password: '',
      createdAt: session.metadata.creationTime ?? '',
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
