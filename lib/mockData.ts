// ─── Employees ────────────────────────────────────────────────────────────────
export type AttendanceRecord = Record<string, 'present' | 'absent'>;

export interface Employee {
  id: string;
  name: string;
  role: string;
  avatar: string;
  attendance: AttendanceRecord; // key: "YYYY-MM-DD", value: present | absent
}

export const INITIAL_EMPLOYEES: Employee[] = [
  { id: 'e1', name: 'Aarav Sharma',   role: 'Frontend Dev',    avatar: 'AS', attendance: {} },
  { id: 'e2', name: 'Priya Mehta',    role: 'Backend Dev',     avatar: 'PM', attendance: {} },
  { id: 'e3', name: 'Rohan Verma',    role: 'UI/UX Designer',  avatar: 'RV', attendance: {} },
  { id: 'e4', name: 'Neha Joshi',     role: 'QA Engineer',     avatar: 'NJ', attendance: {} },
  { id: 'e5', name: 'Karan Patel',    role: 'DevOps Engineer', avatar: 'KP', attendance: {} },
  { id: 'e6', name: 'Sneha Gupta',    role: 'Product Manager', avatar: 'SG', attendance: {} },
];

// ─── Invoices ─────────────────────────────────────────────────────────────────
export interface InvoiceItem {
  description: string;
  qty: number;
  price: number;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  client: string;
  date: string;
  dueDate: string;
  items: InvoiceItem[];
  status: 'Paid' | 'Pending';
}

export const INITIAL_INVOICES: Invoice[] = [
  {
    id: 'inv1',
    invoiceNo: 'INV-001',
    client: 'TechNova Solutions',
    date: '2026-02-01',
    dueDate: '2026-02-15',
    items: [
      { description: 'Web Development', qty: 1, price: 45000 },
      { description: 'SEO Optimization', qty: 1, price: 12000 },
    ],
    status: 'Paid',
  },
  {
    id: 'inv2',
    invoiceNo: 'INV-002',
    client: 'Skyline Retail Pvt.',
    date: '2026-02-05',
    dueDate: '2026-02-20',
    items: [
      { description: 'Mobile App (Android)', qty: 1, price: 80000 },
    ],
    status: 'Pending',
  },
  {
    id: 'inv3',
    invoiceNo: 'INV-003',
    client: 'GreenLeaf Organics',
    date: '2026-02-10',
    dueDate: '2026-02-24',
    items: [
      { description: 'E-commerce Portal', qty: 1, price: 55000 },
      { description: 'Hosting Setup', qty: 1, price: 8000 },
    ],
    status: 'Paid',
  },
  {
    id: 'inv4',
    invoiceNo: 'INV-004',
    client: 'HealthFirst Clinics',
    date: '2026-02-14',
    dueDate: '2026-02-28',
    items: [
      { description: 'CRM Integration', qty: 1, price: 35000 },
    ],
    status: 'Pending',
  },
  {
    id: 'inv5',
    invoiceNo: 'INV-005',
    client: 'Zephyr Logistics',
    date: '2026-02-18',
    dueDate: '2026-03-05',
    items: [
      { description: 'Tracking Dashboard', qty: 1, price: 60000 },
      { description: 'API Integration', qty: 2, price: 15000 },
    ],
    status: 'Pending',
  },
];

// ─── Transactions ─────────────────────────────────────────────────────────────
export type TransactionType = 'Income' | 'Expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  category: string;
  amount: number;
  date: string;
  note: string;
}

export const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: 't1', type: 'Income',  category: 'Client Payment', amount: 45000, date: '2026-02-01', note: 'INV-001 - TechNova Solutions' },
  { id: 't2', type: 'Expense', category: 'Software',       amount: 3500,  date: '2026-02-02', note: 'GitHub Copilot & Figma licenses' },
  { id: 't3', type: 'Income',  category: 'Client Payment', amount: 55000, date: '2026-02-10', note: 'INV-003 - GreenLeaf Organics' },
  { id: 't4', type: 'Expense', category: 'Salaries',       amount: 120000, date: '2026-02-10', note: 'February team salaries' },
  { id: 't5', type: 'Expense', category: 'Infrastructure', amount: 8000,  date: '2026-02-12', note: 'AWS & Vercel hosting' },
  { id: 't6', type: 'Income',  category: 'Consulting',     amount: 20000, date: '2026-02-15', note: 'Advisory session - StartupX' },
  { id: 't7', type: 'Expense', category: 'Marketing',      amount: 15000, date: '2026-02-16', note: 'Google Ads campaign' },
  { id: 't8', type: 'Income',  category: 'Client Payment', amount: 8000,  date: '2026-02-18', note: 'INV-003 hosting setup' },
  { id: 't9', type: 'Expense', category: 'Office',         amount: 5000,  date: '2026-02-20', note: 'Office supplies' },
  { id: 't10', type: 'Income', category: 'Consulting',     amount: 12000, date: '2026-02-22', note: 'Tech audit - BrightPath Inc.' },
];

// ─── Inventory ─────────────────────────────────────────────────────────────────

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  openingQty: number;
  currentQty: number;
  purchasePrice: number;
  sellingPrice: number;
  reorderLevel: number;
  gstRate: number; // %
}

export const INITIAL_INVENTORY: InventoryItem[] = [
  {
    id: 'it1',
    name: 'Website Maintenance Hours',
    sku: 'SVC-MNT-10',
    category: 'Services',
    unit: 'Hours',
    openingQty: 100,
    currentQty: 72,
    purchasePrice: 0,
    sellingPrice: 1500,
    reorderLevel: 20,
    gstRate: 18,
  },
  {
    id: 'it2',
    name: 'Cloud Server Credits',
    sku: 'CLD-CR-1000',
    category: 'Infrastructure',
    unit: 'Credits',
    openingQty: 1000,
    currentQty: 420,
    purchasePrice: 5,
    sellingPrice: 0,
    reorderLevel: 200,
    gstRate: 18,
  },
  {
    id: 'it3',
    name: 'Email Marketing Seats',
    sku: 'MKT-EMAIL-50',
    category: 'Marketing',
    unit: 'Seats',
    openingQty: 50,
    currentQty: 18,
    purchasePrice: 300,
    sellingPrice: 0,
    reorderLevel: 10,
    gstRate: 18,
  },
  {
    id: 'it4',
    name: 'Domain Credits',
    sku: 'DOM-CR-10',
    category: 'Licensing',
    unit: 'Domains',
    openingQty: 10,
    currentQty: 6,
    purchasePrice: 700,
    sellingPrice: 0,
    reorderLevel: 3,
    gstRate: 18,
  },
];

// ─── Chart Data ───────────────────────────────────────────────────────────────
export const REVENUE_CHART_DATA = [
  { month: 'Sep', revenue: 180000, expenses: 95000 },
  { month: 'Oct', revenue: 210000, expenses: 110000 },
  { month: 'Nov', revenue: 195000, expenses: 100000 },
  { month: 'Dec', revenue: 240000, expenses: 125000 },
  { month: 'Jan', revenue: 225000, expenses: 118000 },
  { month: 'Feb', revenue: 140000, expenses: 151500 },
];

export const EXPENSE_PIE_DATA = [
  { name: 'Salaries',      value: 120000, color: '#3b82f6' },
  { name: 'Infrastructure', value: 8000,  color: '#06b6d4' },
  { name: 'Marketing',     value: 15000,  color: '#8b5cf6' },
  { name: 'Software',      value: 3500,   color: '#f59e0b' },
  { name: 'Office',        value: 5000,   color: '#22c55e' },
];

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
export const DASHBOARD_STATS = {
  totalRevenue: 140000,
  totalExpenses: 151500,
  netProfit: -11500,
  pendingPayments: 190000,
};
