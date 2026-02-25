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
import { localDb } from './localDb';
import { localDate } from './utils';
import {
  loadFromLocal,
  fetchAndCacheFromFirebase,
  syncPendingToFirebase,
  clearLocalData,
} from './syncEngine';
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
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
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
  updateInvoice: (id: string, input: Partial<AddInvoiceInput & { status: Invoice['status'] }>) => void;
  toggleInvoiceStatus: (id: string) => void;
  updateEmployees: (updater: (prev: Employee[]) => Employee[]) => void;
  updateInventory: (updater: (prev: InventoryItem[]) => InventoryItem[]) => void;
  updateBusinessProfile: (p: { businessName: string; email: string; phone: string; gst: string; address: string }) => void;
  updatePreferences: (p: { emailNotifications: boolean; darkMode: boolean; currency: string; twoFactorAuth: boolean }) => void;
  resetBusinessData: () => void;
  deleteCurrentAccount: () => void;
  isOnline: boolean;
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
    return {
      id: d.id,
      name: e.name,
      role: e.role,
      avatar: e.avatar,
      attendance: e.attendance ?? {},
      overtime: e.overtime ?? {},
      salary: e.salary ?? 0,
      dateOfJoining: e.dateOfJoining ?? '',
      salaryDeductionRules: e.salaryDeductionRules ?? '',
      email: e.email ?? '',
      phone: e.phone ?? '',
      aadhaar: e.aadhaar ?? '',
    };
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
      clientEmail: inv.clientEmail ?? '',
      clientPhone: inv.clientPhone ?? '',
      clientAddress: inv.clientAddress ?? '',
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
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Refs for stable values inside callbacks (avoids stale closures)
  const uidRef = useRef<string | undefined>(undefined);
  const empRef = useRef<Employee[]>([]);
  const invtRef = useRef<InventoryItem[]>([]);
  const invoiceCountRef = useRef<number>(0);

  const refresh = useCallback(async (uid: string) => {
    // ── Step 1: Load from IndexedDB immediately (works offline) ──────────
    const local = await loadFromLocal(uid);
    const hasLocal =
      local.profile !== null ||
      local.invoices.length > 0 ||
      local.employees.length > 0;
    if (hasLocal) {
      setProfile(local.profile);
      setEmployees(local.employees); empRef.current = local.employees;
      setInvoices(local.invoices); invoiceCountRef.current = local.invoices.length;
      setTransactions(local.transactions);
      setInventory(local.inventory); invtRef.current = local.inventory;
    }

    // ── Step 2: If online, sync pending → fetch from Firestore → re-load ─
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        await syncPendingToFirebase(uid);
        await fetchAndCacheFromFirebase(uid);
        const fresh = await loadFromLocal(uid);
        setProfile(fresh.profile);
        setEmployees(fresh.employees); empRef.current = fresh.employees;
        setInvoices(fresh.invoices); invoiceCountRef.current = fresh.invoices.length;
        setTransactions(fresh.transactions);
        setInventory(fresh.inventory); invtRef.current = fresh.inventory;
      } catch (e) {
        console.warn('[Sync] Background fetch failed — using local data:', e);
      }
    }
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

  // ── Online / offline detection + background sync ──────────────────────
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      const uid = uidRef.current;
      if (!uid) return;
      try {
        const count = await syncPendingToFirebase(uid);
        if (count > 0) {
          await fetchAndCacheFromFirebase(uid);
          const fresh = await loadFromLocal(uid);
          setProfile(fresh.profile);
          setEmployees(fresh.employees); empRef.current = fresh.employees;
          setInvoices(fresh.invoices); invoiceCountRef.current = fresh.invoices.length;
          setTransactions(fresh.transactions);
          setInventory(fresh.inventory); invtRef.current = fresh.inventory;
          console.log(`[Sync] Flushed ${count} pending record(s) to Firestore.`);
        }
      } catch (e) {
        console.warn('[Sync] Online sync failed:', e);
      }
    };
    const handleOffline = () => setIsOnline(false);
    // SW background-sync trigger
    const handleSwSync = () => handleOnline();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('sw-sync', handleSwSync);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('sw-sync', handleSwSync);
    };
  }, []);

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
    const uid = uidRef.current;
    if (uid) clearLocalData(uid).catch(console.error);
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
    // 1. Update state immediately
    setTransactions(prev => [tx, ...prev]);
    // 2. Write local DB (pending)
    localDb.transactions.put({ ...tx, _uid: uid, _syncStatus: 'pending' }).catch(console.error);
    // 3. Try Firestore; on success mark synced
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      setDoc(doc(userCol(uid, 'transactions'), id), {
        type: input.type, category: input.category,
        amount: input.amount, date: input.date, note: input.note,
      }).then(() => localDb.transactions.update(id, { _syncStatus: 'synced' }).catch(console.error))
        .catch(() => console.warn('[Offline] Transaction queued for sync'));
    }
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
      clientEmail: input.clientEmail ?? '',
      clientPhone: input.clientPhone ?? '',
      clientAddress: input.clientAddress ?? '',
    };
    const createdAt = new Date().toISOString();
    // 1. Update state immediately
    setInvoices(prev => [invoice, ...prev]);
    // 2. Write local DB (pending)
    localDb.invoices.put({ ...invoice, _uid: uid, _syncStatus: 'pending', _createdAt: createdAt }).catch(console.error);
    // 3. Try Firestore
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      setDoc(doc(userCol(uid, 'invoices'), id), {
        invoiceNo, client: input.client,
        date: input.date, dueDate: input.dueDate || input.date,
        status: 'Pending', items: input.items, createdAt,
        clientEmail: input.clientEmail ?? '',
        clientPhone: input.clientPhone ?? '',
        clientAddress: input.clientAddress ?? '',
      }).then(() => localDb.invoices.update(id, { _syncStatus: 'synced' }).catch(console.error))
        .catch(() => console.warn('[Offline] Invoice queued for sync'));
    }
  }, []);

  // ── updateInvoice ─────────────────────────────────────────────────────────────

  const updateInvoice = useCallback((id: string, input: Partial<AddInvoiceInput & { status: Invoice['status'] }>) => {
    const uid = uidRef.current;
    if (!uid) return;
    setInvoices(prev => prev.map(inv => {
      if (inv.id !== id) return inv;
      const updated: Invoice = {
        ...inv,
        ...(input.client !== undefined ? { client: input.client } : {}),
        ...(input.date !== undefined ? { date: input.date } : {}),
        ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
        ...(input.items !== undefined ? { items: input.items } : {}),
        ...(input.clientEmail !== undefined ? { clientEmail: input.clientEmail } : {}),
        ...(input.clientPhone !== undefined ? { clientPhone: input.clientPhone } : {}),
        ...(input.clientAddress !== undefined ? { clientAddress: input.clientAddress } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      };
      localDb.invoices.update(id, { ...updated, _syncStatus: 'pending' }).catch(console.error);
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        updateDoc(doc(userCol(uid, 'invoices'), id), {
          client: updated.client,
          date: updated.date,
          dueDate: updated.dueDate,
          items: updated.items,
          clientEmail: updated.clientEmail ?? '',
          clientPhone: updated.clientPhone ?? '',
          clientAddress: updated.clientAddress ?? '',
        }).then(() => localDb.invoices.update(id, { _syncStatus: 'synced' }).catch(console.error))
          .catch(() => console.warn('[Offline] Invoice update queued'));
      }
      return updated;
    }));
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
      // Local DB: mark invoice status pending
      localDb.invoices.update(id, { status: nextStatus, _syncStatus: 'pending' }).catch(console.error);
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        updateDoc(doc(userCol(uid, 'invoices'), id), { status: nextStatus })
          .then(() => localDb.invoices.update(id, { _syncStatus: 'synced' }).catch(console.error))
          .catch(() => console.warn('[Offline] Invoice status queued'));
      }
      if (!isPaid) {
        const total = target.items.reduce((s, i) => s + i.qty * i.price, 0);
        const txId = crypto.randomUUID();
        const tx: Transaction = {
          id: txId, type: 'Income', category: 'Client Payment', amount: total,
          date: localDate(),
          note: `${target.invoiceNo} — ${target.client}`,
        };
        setTransactions(p => [tx, ...p]);
        localDb.transactions.put({ ...tx, _uid: uid, _syncStatus: 'pending' }).catch(console.error);
        if (typeof navigator !== 'undefined' && navigator.onLine) {
          setDoc(doc(userCol(uid, 'transactions'), txId), {
            type: 'Income', category: 'Client Payment', amount: total,
            date: tx.date, note: tx.note,
          }).then(() => localDb.transactions.update(txId, { _syncStatus: 'synced' }).catch(console.error))
            .catch(() => console.warn('[Offline] Toggle transaction queued'));
        }
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
    const now = new Date().toISOString();
    for (const emp of next) {
      if (!prevIds.has(emp.id)) {
        localDb.employees.put({ ...emp, _uid: uid, _syncStatus: 'pending', _createdAt: now }).catch(console.error);
        if (typeof navigator !== 'undefined' && navigator.onLine) {
          setDoc(doc(userCol(uid, 'employees'), emp.id), {
            name: emp.name, role: emp.role, avatar: emp.avatar,
            attendance: emp.attendance ?? {},
            overtime: emp.overtime ?? {},
            salary: emp.salary ?? 0,
            dateOfJoining: emp.dateOfJoining ?? '',
            salaryDeductionRules: emp.salaryDeductionRules ?? '',
            email: emp.email ?? '',
            phone: emp.phone ?? '',
            aadhaar: emp.aadhaar ?? '',
            createdAt: now,
          }).then(() => localDb.employees.update(emp.id, { _syncStatus: 'synced' }).catch(console.error))
            .catch(() => console.warn('[Offline] Employee queued'));
        }
      } else {
        const old = prev.find(e => e.id === emp.id);
        if (old && JSON.stringify(old) !== JSON.stringify(emp)) {
          const updateData = {
            attendance: emp.attendance,
            overtime: emp.overtime ?? {},
            salary: emp.salary ?? 0,
            dateOfJoining: emp.dateOfJoining ?? '',
            salaryDeductionRules: emp.salaryDeductionRules ?? '',
            email: emp.email ?? '',
            phone: emp.phone ?? '',
            aadhaar: emp.aadhaar ?? '',
            _syncStatus: 'pending' as const,
          };
          localDb.employees.update(emp.id, updateData).catch(console.error);
          if (typeof navigator !== 'undefined' && navigator.onLine) {
            updateDoc(doc(userCol(uid, 'employees'), emp.id), {
              attendance: emp.attendance,
              overtime: emp.overtime ?? {},
              salary: emp.salary ?? 0,
              dateOfJoining: emp.dateOfJoining ?? '',
              salaryDeductionRules: emp.salaryDeductionRules ?? '',
              email: emp.email ?? '',
              phone: emp.phone ?? '',
              aadhaar: emp.aadhaar ?? '',
            })
              .then(() => localDb.employees.update(emp.id, { _syncStatus: 'synced' }).catch(console.error))
              .catch(() => console.warn('[Offline] Employee update queued'));
          }
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
    const now = new Date().toISOString();
    for (const item of next) {
      if (!prevIds.has(item.id)) {
        localDb.inventory.put({ ...item, _uid: uid, _syncStatus: 'pending', _createdAt: now }).catch(console.error);
        if (typeof navigator !== 'undefined' && navigator.onLine) {
          setDoc(doc(userCol(uid, 'inventory'), item.id), {
            name: item.name, sku: item.sku, category: item.category, unit: item.unit,
            openingQty: item.openingQty, currentQty: item.currentQty,
            purchasePrice: item.purchasePrice, sellingPrice: item.sellingPrice,
            reorderLevel: item.reorderLevel, gstRate: item.gstRate, createdAt: now,
          }).then(() => localDb.inventory.update(item.id, { _syncStatus: 'synced' }).catch(console.error))
            .catch(() => console.warn('[Offline] Inventory queued'));
        }
      } else {
        localDb.inventory.update(item.id, { currentQty: item.currentQty, sellingPrice: item.sellingPrice, reorderLevel: item.reorderLevel, _syncStatus: 'pending' }).catch(console.error);
        if (typeof navigator !== 'undefined' && navigator.onLine) {
          updateDoc(doc(userCol(uid, 'inventory'), item.id), {
            currentQty: item.currentQty, sellingPrice: item.sellingPrice, reorderLevel: item.reorderLevel,
          }).then(() => localDb.inventory.update(item.id, { _syncStatus: 'synced' }).catch(console.error))
            .catch(() => console.warn('[Offline] Inventory update queued'));
        }
      }
    }
  }, []);

  // ── Profile / Preferences ─────────────────────────────────────────────────

  const updateBusinessProfile = useCallback((p: { businessName: string; email: string; phone: string; gst: string; address: string }) => {
    const uid = uidRef.current;
    if (!uid) return;
    setProfile(prev => prev ? { ...prev, ...p } : prev);
    localDb.profile.where('id').equals(uid).modify({ ...p, _syncStatus: 'pending' }).catch(console.error);
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      updateDoc(userDoc(uid), { businessName: p.businessName, email: p.email, phone: p.phone, gst: p.gst, address: p.address })
        .then(() => localDb.profile.where('id').equals(uid).modify({ _syncStatus: 'synced' }).catch(console.error))
        .catch(() => console.warn('[Offline] Business profile queued'));
    }
  }, []);

  const updatePreferences = useCallback((p: { emailNotifications: boolean; darkMode: boolean; currency: string; twoFactorAuth: boolean }) => {
    const uid = uidRef.current;
    if (!uid) return;
    setProfile(prev => prev ? { ...prev, emailNotifications: p.emailNotifications, darkMode: p.darkMode, currency: p.currency, twoFactorAuth: p.twoFactorAuth } : prev);
    localDb.profile.where('id').equals(uid).modify({ ...p, _syncStatus: 'pending' }).catch(console.error);
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      updateDoc(userDoc(uid), { emailNotifications: p.emailNotifications, darkMode: p.darkMode, currency: p.currency, twoFactorAuth: p.twoFactorAuth })
        .then(() => localDb.profile.where('id').equals(uid).modify({ _syncStatus: 'synced' }).catch(console.error))
        .catch(() => console.warn('[Offline] Preferences queued'));
    }
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
    addTransaction, addInvoice, updateInvoice, toggleInvoiceStatus,
    updateEmployees, updateInventory, updateBusinessProfile, updatePreferences,
    resetBusinessData, deleteCurrentAccount,
    isOnline,
    dashboard,
  }), [
    ready, session, profile, currentUser, data,
    login, signup, loginDemo, logout, completeOnboarding,
    addTransaction, addInvoice, updateInvoice, toggleInvoiceStatus,
    updateEmployees, updateInventory, updateBusinessProfile, updatePreferences,
    resetBusinessData, deleteCurrentAccount, isOnline, dashboard,
  ]);

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore(): AppStoreContextValue {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error('useAppStore must be used within AppStoreProvider');
  return ctx;
}
