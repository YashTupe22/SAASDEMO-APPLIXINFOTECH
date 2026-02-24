'use client';

import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import Badge from '@/components/ui/Badge';
import type { Employee } from '@/lib/mockData';
import { X, Check, UserPlus } from 'lucide-react';
import { useAppStore } from '@/lib/appStore';

const TODAY = new Date().toISOString().split('T')[0];

function getMonthDays(year: number, month: number): string[] {
    const days: string[] = [];
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
        const m = String(month + 1).padStart(2, '0');
        const day = String(d).padStart(2, '0');
        days.push(`${year}-${m}-${day}`);
    }
    return days;
}

export default function AttendancePage() {
    const { data, updateEmployees } = useAppStore();
    const employees = data.employees as Employee[];
    const [showAddForm, setShowAddForm] = useState(false);
    const [newName, setNewName] = useState('');
    const [newRole, setNewRole] = useState('');

    const year = new Date().getFullYear();
    const month = new Date().getMonth();
    const monthDays = getMonthDays(year, month);
    const workDays = monthDays.filter(d => {
        const day = new Date(d).getDay();
        return day !== 0 && day !== 6;
    });
    const today = TODAY;

    const toggle = (empId: string, date: string) => {
        updateEmployees(prev =>
            prev.map(e => {
                if (e.id !== empId) return e;
                const current = e.attendance[date];
                const next = current === 'present' ? 'absent' : 'present';
                return { ...e, attendance: { ...e.attendance, [date]: next } };
            })
        );
    };

    const markAll = (status: 'present' | 'absent') => {
        updateEmployees(prev =>
            prev.map(e => ({
                ...e,
                attendance: { ...e.attendance, [today]: status },
            }))
        );
    };

    const addEmployee = () => {
        if (!newName.trim()) return;
        const id = 'e' + Date.now();
        updateEmployees(prev => [
            ...prev,
            {
                id,
                name: newName.trim(),
                role: newRole.trim() || 'Team Member',
                avatar: newName.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
                attendance: {},
            },
        ]);
        setNewName('');
        setNewRole('');
        setShowAddForm(false);
    };

    const getStats = (emp: Employee) => {
        const present = workDays.filter(d => emp.attendance[d] === 'present').length;
        const absent = workDays.filter(d => emp.attendance[d] === 'absent').length;
        const pct = workDays.length ? Math.round((present / workDays.length) * 100) : 0;
        return { present, absent, pct };
    };

    const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    return (
        <AppLayout title="Attendance" subtitle={`${MONTH_NAMES[month]} ${year} — ${workDays.length} working days`}>
            {/* Header actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button
                        onClick={() => markAll('present')}
                        style={{
                            padding: '8px 16px',
                            borderRadius: 10,
                            background: 'rgba(34,197,94,0.15)',
                            border: '1px solid rgba(34,197,94,0.25)',
                            color: '#22c55e',
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                        }}
                    >
                        <Check size={14} /> Mark All Present Today
                    </button>
                    <button
                        onClick={() => markAll('absent')}
                        style={{
                            padding: '8px 16px',
                            borderRadius: 10,
                            background: 'rgba(239,68,68,0.1)',
                            border: '1px solid rgba(239,68,68,0.2)',
                            color: '#ef4444',
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                        }}
                    >
                        <X size={14} /> Mark All Absent Today
                    </button>
                </div>
                <button
                    onClick={() => setShowAddForm(true)}
                    className="glow-btn"
                    style={{ padding: '9px 18px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 7 }}
                >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <UserPlus size={14} /> Add Employee
                    </span>
                </button>
            </div>

            {/* Add employee form */}
            {showAddForm && (
                <div className="glass-card animate-fade-in" style={{ padding: 20, marginBottom: 20, display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6 }}>Full Name *</label>
                        <input
                            className="dark-input"
                            placeholder="Employee name"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            style={{ padding: '10px 12px', fontSize: 14 }}
                            onKeyDown={e => e.key === 'Enter' && addEmployee()}
                        />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6 }}>Role</label>
                        <input
                            className="dark-input"
                            placeholder="e.g. Developer"
                            value={newRole}
                            onChange={e => setNewRole(e.target.value)}
                            style={{ padding: '10px 12px', fontSize: 14 }}
                            onKeyDown={e => e.key === 'Enter' && addEmployee()}
                        />
                    </div>
                    <button className="glow-btn" onClick={addEmployee} style={{ padding: '10px 20px', fontSize: 14 }}>
                        <span>Add</span>
                    </button>
                    <button
                        onClick={() => setShowAddForm(false)}
                        style={{ padding: '10px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', cursor: 'pointer', fontSize: 14 }}
                    >
                        Cancel
                    </button>
                </div>
            )}

            {/* Today's attendance cards */}
            <div style={{ marginBottom: 28 }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
                    Today — {new Date(today).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
                    {employees.map(emp => {
                        const status = emp.attendance[today] ?? null;
                        return (
                            <div
                                key={emp.id}
                                className="glass-card"
                                style={{
                                    padding: '16px 18px',
                                    borderColor: status === 'present' ? 'rgba(34,197,94,0.3)' : status === 'absent' ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.1)',
                                    transition: 'border-color 0.2s',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                                    <div
                                        style={{
                                            width: 38,
                                            height: 38,
                                            borderRadius: 10,
                                            background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: 13,
                                            fontWeight: 700,
                                            color: 'white',
                                        }}
                                    >
                                        {emp.avatar}
                                    </div>
                                    <div>
                                        <p style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>{emp.name}</p>
                                        <p style={{ fontSize: 12, color: '#64748b' }}>{emp.role}</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button
                                        onClick={() => toggle(emp.id, today)}
                                        style={{
                                            flex: 1,
                                            padding: '7px 0',
                                            borderRadius: 8,
                                            fontSize: 12,
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            background: status === 'present' ? 'rgba(34,197,94,0.25)' : 'rgba(34,197,94,0.07)',
                                            border: status === 'present' ? '1px solid rgba(34,197,94,0.5)' : '1px solid rgba(34,197,94,0.15)',
                                            color: '#22c55e',
                                        }}
                                    >
                                        ✓ Present
                                    </button>
                                    <button
                                        onClick={() => toggle(emp.id, today)}
                                        style={{
                                            flex: 1,
                                            padding: '7px 0',
                                            borderRadius: 8,
                                            fontSize: 12,
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            background: status === 'absent' ? 'rgba(239,68,68,0.25)' : 'rgba(239,68,68,0.07)',
                                            border: status === 'absent' ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(239,68,68,0.15)',
                                            color: '#ef4444',
                                        }}
                                    >
                                        ✕ Absent
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Monthly Summary Table */}
            <div className="glass-card" style={{ padding: 24 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', marginBottom: 18 }}>Monthly Summary</h2>
                <div className="table-scroll">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Role</th>
                                <th>Present</th>
                                <th>Absent</th>
                                <th>Working Days</th>
                                <th>Attendance %</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {employees.map(emp => {
                                const { present, absent, pct } = getStats(emp);
                                return (
                                    <tr key={emp.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div
                                                    style={{
                                                        width: 30,
                                                        height: 30,
                                                        borderRadius: 8,
                                                        background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: 11,
                                                        fontWeight: 700,
                                                        color: 'white',
                                                    }}
                                                >
                                                    {emp.avatar}
                                                </div>
                                                <span style={{ fontWeight: 600, color: '#f1f5f9' }}>{emp.name}</span>
                                            </div>
                                        </td>
                                        <td style={{ color: '#64748b' }}>{emp.role}</td>
                                        <td style={{ color: '#22c55e', fontWeight: 600 }}>{present}</td>
                                        <td style={{ color: '#ef4444', fontWeight: 600 }}>{absent}</td>
                                        <td style={{ color: '#94a3b8' }}>{workDays.length}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                                                    <div
                                                        style={{
                                                            width: `${pct}%`,
                                                            height: '100%',
                                                            borderRadius: 3,
                                                            background: pct >= 80 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#ef4444',
                                                            transition: 'width 0.4s ease',
                                                        }}
                                                    />
                                                </div>
                                                <span style={{ fontSize: 13, fontWeight: 600, minWidth: 36 }}>{pct}%</span>
                                            </div>
                                        </td>
                                        <td>
                                            <Badge variant={pct >= 80 ? 'success' : pct >= 60 ? 'warning' : 'danger'}>
                                                {pct >= 80 ? 'Good' : pct >= 60 ? 'Average' : 'Poor'}
                                            </Badge>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </AppLayout>
    );
}
