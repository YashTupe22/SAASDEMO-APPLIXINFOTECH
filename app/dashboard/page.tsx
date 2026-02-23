'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import StatCard from '@/components/ui/StatCard';
import { TrendingUp, TrendingDown, DollarSign, Clock } from 'lucide-react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    PieChart,
    Pie,
    Cell,
} from 'recharts';
import { useAppStore } from '@/lib/appStore';

function formatCurrency(v: number) {
    if (v < 0) return `-₹${Math.abs(v).toLocaleString('en-IN')}`;
    return `₹${v.toLocaleString('en-IN')}`;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="glass-card" style={{ padding: '10px 14px', minWidth: 140 }}>
            <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>{label}</p>
            {payload.map((entry: any) => (
                <p key={entry.name} style={{ fontSize: 13, fontWeight: 600, color: entry.color }}>
                    {entry.name}: {formatCurrency(entry.value)}
                </p>
            ))}
        </div>
    );
};

export default function DashboardPage() {
    const { dashboard, currentUser } = useAppStore();
    const searchParams = useSearchParams();
    const [showWelcome, setShowWelcome] = useState(false);

    useEffect(() => {
        if (searchParams.get('welcome') === '1' && currentUser) {
            setShowWelcome(true);
            const t = window.setTimeout(() => setShowWelcome(false), 2600);
            return () => window.clearTimeout(t);
        }
        return;
    }, [searchParams, currentUser]);

    return (
        <AppLayout
            title="Dashboard"
            subtitle="Welcome back — here's what's happening today."
        >
            {showWelcome && currentUser && (
                <div
                    className="glass-card"
                    style={{
                        position: 'fixed',
                        top: 20,
                        right: 24,
                        zIndex: 40,
                        padding: '14px 18px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        borderRadius: 999,
                        background:
                            'linear-gradient(135deg, rgba(56,189,248,0.2), rgba(59,130,246,0.2))',
                        border: '1px solid rgba(59,130,246,0.6)',
                        boxShadow: '0 18px 40px rgba(15,23,42,0.7)',
                        backdropFilter: 'blur(20px)',
                        animation: 'fade-down 0.35s ease-out',
                    }}
                >
                    <div
                        style={{
                            width: 30,
                            height: 30,
                            borderRadius: 999,
                            background: 'linear-gradient(135deg,#0ea5e9,#22c55e)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: 14,
                            fontWeight: 700,
                        }}
                    >
                        {currentUser.name
                            .split(' ')
                            .map(w => w[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2)}
                    </div>
                    <div>
                        <p style={{ fontSize: 12, color: '#e2e8f0' }}>Welcome back,</p>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#f9fafb' }}>
                            {currentUser.name.split(' ')[0]} 👋
                        </p>
                    </div>
                </div>
            )}
            {/* Stat Cards */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 18,
                    marginBottom: 28,
                }}
            >
                <StatCard
                    label="Total Revenue"
                    value={formatCurrency(dashboard.totalRevenue)}
                    sub="All paid invoices"
                    trend={dashboard.netProfit >= 0 ? 'up' : 'down'}
                    trendValue=""
                    iconBg="linear-gradient(135deg, rgba(59,130,246,0.3), rgba(59,130,246,0.1))"
                    icon={<DollarSign size={20} color="#3b82f6" />}
                />
                <StatCard
                    label="Total Expenses"
                    value={formatCurrency(dashboard.totalExpenses)}
                    sub="All expense transactions"
                    trend="neutral"
                    trendValue=""
                    iconBg="linear-gradient(135deg, rgba(239,68,68,0.3), rgba(239,68,68,0.1))"
                    icon={<TrendingDown size={20} color="#ef4444" />}
                />
                <StatCard
                    label="Net Profit"
                    value={formatCurrency(dashboard.netProfit)}
                    sub="Revenue - Expenses"
                    trend={dashboard.netProfit >= 0 ? 'up' : 'down'}
                    trendValue=""
                    iconBg="linear-gradient(135deg, rgba(245,158,11,0.3), rgba(245,158,11,0.1))"
                    icon={<TrendingUp size={20} color="#f59e0b" />}
                />
                <StatCard
                    label="Pending Payments"
                    value={formatCurrency(dashboard.pendingPayments)}
                    sub="Unpaid invoices"
                    trend="neutral"
                    trendValue=""
                    iconBg="linear-gradient(135deg, rgba(6,182,212,0.3), rgba(6,182,212,0.1))"
                    icon={<Clock size={20} color="#06b6d4" />}
                />
            </div>

            {/* Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 18 }}>
                {/* Revenue Line Chart */}
                <div className="glass-card" style={{ padding: 24 }}>
                    <div style={{ marginBottom: 20 }}>
                        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>Revenue vs Expenses</h2>
                        <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Last 6 months (based on transactions)</p>
                    </div>
                    <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={dashboard.revenueChart} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                            <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
                            <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                            <Tooltip content={<CustomTooltip />} />
                            <Line
                                type="monotone"
                                dataKey="revenue"
                                name="Revenue"
                                stroke="#3b82f6"
                                strokeWidth={2.5}
                                dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }}
                                activeDot={{ r: 6, fill: '#60a5fa' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="expenses"
                                name="Expenses"
                                stroke="#ef4444"
                                strokeWidth={2.5}
                                strokeDasharray="6 3"
                                dot={{ r: 4, fill: '#ef4444', strokeWidth: 0 }}
                                activeDot={{ r: 6, fill: '#f87171' }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Expense Pie Chart */}
                <div className="glass-card" style={{ padding: 24 }}>
                    <div style={{ marginBottom: 16 }}>
                        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>Expense Breakdown</h2>
                        <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>By category</p>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie
                                data={dashboard.expensePie}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={88}
                                paddingAngle={3}
                                dataKey="value"
                            >
                                {dashboard.expensePie.map((entry, i) => (
                                    <Cell key={entry.name} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(v: any, name: any) => [`₹${Number(v).toLocaleString('en-IN')}`, name]}
                                contentStyle={{
                                    background: '#1e293b',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: 8,
                                    color: '#f1f5f9',
                                    fontSize: 13,
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    {/* Legend */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 8 }}>
                        {dashboard.expensePie.map(item => (
                            <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
                                    <span style={{ fontSize: 12, color: '#94a3b8' }}>{item.name}</span>
                                </div>
                                <span style={{ fontSize: 12, color: '#f1f5f9', fontWeight: 600 }}>
                                    ₹{item.value.toLocaleString('en-IN')}
                                </span>
                            </div>
                        ))}
                        {dashboard.expensePie.length === 0 && (
                            <p style={{ fontSize: 12, color: '#475569', marginTop: 8 }}>No expense data yet. Add expenses from Transactions or Expenses page.</p>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
