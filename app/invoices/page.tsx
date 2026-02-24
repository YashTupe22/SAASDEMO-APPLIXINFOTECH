'use client';

import { useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import Badge from '@/components/ui/Badge';
import type { Invoice, InvoiceItem } from '@/lib/mockData';
import { Plus, X, Eye, Check, FileText } from 'lucide-react';
import { useAppStore } from '@/lib/appStore';

function getTotal(items: InvoiceItem[]) {
    return items.reduce((sum, i) => sum + i.qty * i.price, 0);
}

export default function InvoicesPage() {
    const { data, addInvoice, toggleInvoiceStatus } = useAppStore();
    const invoices = data.invoices;
    const [showForm, setShowForm] = useState(false);
    const [preview, setPreview] = useState<Invoice | null>(null);

    // Form state
    const [client, setClient] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState('');
    const [items, setItems] = useState<InvoiceItem[]>([{ description: '', qty: 1, price: 0 }]);

    const addItem = () => setItems(prev => [...prev, { description: '', qty: 1, price: 0 }]);
    const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));
    const updateItem = (i: number, field: keyof InvoiceItem, val: string | number) =>
        setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

    const createInvoice = () => {
        if (!client.trim()) return;
        addInvoice({
            client: client.trim(),
            date,
            dueDate: dueDate || date,
            items: items.filter(it => it.description.trim()),
        });
        setClient(''); setDate(new Date().toISOString().split('T')[0]); setDueDate('');
        setItems([{ description: '', qty: 1, price: 0 }]);
        setShowForm(false);
    };

    const totalRevenue = invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + getTotal(i.items), 0);
    const totalPending = invoices.filter(i => i.status === 'Pending').reduce((s, i) => s + getTotal(i.items), 0);

    return (
        <AppLayout title="Invoices" subtitle="Manage client invoices and payment status">
            {/* Summary bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
                {[
                    { label: 'Total Invoices', value: invoices.length, color: '#60a5fa' },
                    { label: 'Paid', value: `₹${totalRevenue.toLocaleString('en-IN')}`, color: '#22c55e' },
                    { label: 'Pending', value: `₹${totalPending.toLocaleString('en-IN')}`, color: '#f59e0b' },
                ].map(s => (
                    <div key={s.label} className="glass-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{s.label}</p>
                            <p style={{ fontSize: 20, fontWeight: 800, color: s.color, marginTop: 4 }}>{s.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Action */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 18 }}>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="glow-btn"
                    style={{ padding: '10px 20px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 7 }}
                >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Plus size={15} /> Create Invoice
                    </span>
                </button>
            </div>

            {/* Create Invoice Form */}
            {showForm && (
                <div className="glass-card animate-fade-in" style={{ padding: 24, marginBottom: 22 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>New Invoice</h2>
                        <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={18} /></button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 18 }}>
                        <div>
                            <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6 }}>Client Name *</label>
                            <input className="dark-input" placeholder="Client / company" value={client} onChange={e => setClient(e.target.value)} style={{ padding: '10px 12px', fontSize: 14 }} />
                        </div>
                        <div>
                            <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6 }}>Invoice Date</label>
                            <input className="dark-input" type="date" value={date} onChange={e => setDate(e.target.value)} style={{ padding: '10px 12px', fontSize: 14, colorScheme: 'dark' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6 }}>Due Date</label>
                            <input className="dark-input" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={{ padding: '10px 12px', fontSize: 14, colorScheme: 'dark' }} />
                        </div>
                    </div>

                    {/* Items */}
                    <div style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', gap: 8, fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 8, padding: '0 4px' }}>
                            <span style={{ flex: 3 }}>Description</span>
                            <span style={{ width: 70, textAlign: 'center' }}>Qty</span>
                            <span style={{ width: 120, textAlign: 'center' }}>Price (₹)</span>
                            <span style={{ width: 100, textAlign: 'right' }}>Total</span>
                            <span style={{ width: 32 }} />
                        </div>
                        {items.map((item, i) => (
                            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                                <input className="dark-input" style={{ flex: 3, padding: '9px 12px', fontSize: 13 }} placeholder="Service description" value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} />
                                <input className="dark-input" style={{ width: 70, padding: '9px 10px', fontSize: 13, textAlign: 'center' }} type="number" min="1" value={item.qty} onChange={e => updateItem(i, 'qty', Number(e.target.value))} />
                                <input className="dark-input" style={{ width: 120, padding: '9px 12px', fontSize: 13 }} type="number" min="0" value={item.price} onChange={e => updateItem(i, 'price', Number(e.target.value))} />
                                <span style={{ width: 100, textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>
                                    ₹{(item.qty * item.price).toLocaleString('en-IN')}
                                </span>
                                <button onClick={() => removeItem(i)} style={{ width: 32, background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
                            </div>
                        ))}
                        <button onClick={addItem} style={{ padding: '8px 14px', borderRadius: 8, background: 'rgba(59,130,246,0.1)', border: '1px dashed rgba(59,130,246,0.3)', color: '#60a5fa', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Plus size={13} /> Add Item
                        </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 16 }}>
                        <div>
                            <p style={{ fontSize: 12, color: '#64748b' }}>Total Amount</p>
                            <p style={{ fontSize: 22, fontWeight: 800, color: '#60a5fa' }}>₹{getTotal(items).toLocaleString('en-IN')}</p>
                        </div>
                        <button className="glow-btn" onClick={createInvoice} style={{ padding: '11px 28px', fontSize: 14 }}>
                            <span>Save Invoice</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Invoices list */}
            <div className="glass-card" style={{ padding: 24 }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Invoice #</th>
                            <th>Client</th>
                            <th>Date</th>
                            <th>Due Date</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoices.map(inv => (
                            <tr key={inv.id}>
                                <td style={{ fontWeight: 600, color: '#60a5fa' }}>{inv.invoiceNo}</td>
                                <td style={{ color: '#f1f5f9', fontWeight: 500 }}>{inv.client}</td>
                                <td style={{ color: '#94a3b8' }}>{new Date(inv.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                                <td style={{ color: '#94a3b8' }}>{new Date(inv.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                                <td style={{ fontWeight: 700, color: '#f1f5f9' }}>₹{getTotal(inv.items).toLocaleString('en-IN')}</td>
                                <td>
                                    <Badge variant={inv.status === 'Paid' ? 'success' : 'warning'}>{inv.status}</Badge>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button
                                            onClick={() => setPreview(inv)}
                                            style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}
                                        >
                                            <Eye size={12} /> View
                                        </button>
                                        <button
                                            onClick={() => toggleInvoiceStatus(inv.id)}
                                            style={{
                                                padding: '6px 10px',
                                                borderRadius: 8,
                                                fontSize: 12,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 5,
                                                background: inv.status === 'Paid' ? 'rgba(245,158,11,0.1)' : 'rgba(34,197,94,0.1)',
                                                border: inv.status === 'Paid' ? '1px solid rgba(245,158,11,0.2)' : '1px solid rgba(34,197,94,0.2)',
                                                color: inv.status === 'Paid' ? '#f59e0b' : '#22c55e',
                                            }}
                                        >
                                            <Check size={12} /> {inv.status === 'Paid' ? 'Mark Pending' : 'Mark Paid'}
                                        </button>
                                        <Link
                                            href={`/invoices/${inv.id}`}
                                            style={{
                                                padding: '6px 10px',
                                                borderRadius: 8,
                                                fontSize: 12,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 5,
                                                background: 'rgba(15,23,42,0.96)',
                                                border: '1px solid rgba(148,163,184,0.5)',
                                                color: '#0f172a',
                                                textDecoration: 'none',
                                                backgroundImage: 'linear-gradient(135deg,#e5e7eb,#cbd5f5)',
                                            }}
                                        >
                                            GST
                                        </Link>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Preview Modal */}
            {preview && (
                <div className="modal-overlay" onClick={() => setPreview(null)}>
                    <div
                        className="glass-card animate-fade-in"
                        style={{ width: '100%', maxWidth: 560, padding: 32, position: 'relative' }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <button onClick={() => setPreview(null)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                            <X size={20} />
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                            <div style={{ width: 42, height: 42, borderRadius: 10, background: 'linear-gradient(135deg, #3b82f6, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <FileText size={20} color="white" />
                            </div>
                            <div>
                                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#f1f5f9' }}>{preview.invoiceNo}</h2>
                                <p style={{ fontSize: 12, color: '#64748b' }}>Synplix</p>
                            </div>
                            <div style={{ marginLeft: 'auto' }}>
                                <Badge variant={preview.status === 'Paid' ? 'success' : 'warning'}>{preview.status}</Badge>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 22 }}>
                            <div>
                                <p style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>BILLED TO</p>
                                <p style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>{preview.client}</p>
                            </div>
                            <div>
                                <p style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>DATES</p>
                                <p style={{ fontSize: 13, color: '#94a3b8' }}>Issued: {new Date(preview.date).toLocaleDateString('en-IN')}</p>
                                <p style={{ fontSize: 13, color: '#94a3b8' }}>Due: {new Date(preview.dueDate).toLocaleDateString('en-IN')}</p>
                            </div>
                        </div>

                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 18, marginBottom: 16 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 100px 100px', gap: 8, fontSize: 11, color: '#64748b', fontWeight: 600, padding: '0 4px 8px' }}>
                                <span>Description</span><span style={{ textAlign: 'center' }}>Qty</span><span style={{ textAlign: 'right' }}>Price</span><span style={{ textAlign: 'right' }}>Total</span>
                            </div>
                            {preview.items.map((item, i) => (
                                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 100px 100px', gap: 8, padding: '10px 4px', borderTop: '1px solid rgba(255,255,255,0.04)', fontSize: 14 }}>
                                    <span style={{ color: '#f1f5f9' }}>{item.description}</span>
                                    <span style={{ textAlign: 'center', color: '#94a3b8' }}>{item.qty}</span>
                                    <span style={{ textAlign: 'right', color: '#94a3b8' }}>₹{item.price.toLocaleString('en-IN')}</span>
                                    <span style={{ textAlign: 'right', fontWeight: 600, color: '#f1f5f9' }}>₹{(item.qty * item.price).toLocaleString('en-IN')}</span>
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16 }}>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ fontSize: 13, color: '#64748b' }}>Total Amount</p>
                                <p style={{ fontSize: 28, fontWeight: 800, color: '#60a5fa', marginTop: 4 }}>₹{getTotal(preview.items).toLocaleString('en-IN')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
