'use client';

import { Bell, Search, Menu } from 'lucide-react';

interface TopBarProps {
    title: string;
    subtitle?: string;
    onMenuToggle: () => void;
}

export default function TopBar({ title, subtitle, onMenuToggle }: TopBarProps) {
    return (
        <header
            style={{
                height: 68,
                background: 'rgba(255, 255, 255, 0.05)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(16px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 20px',
                position: 'sticky',
                top: 0,
                zIndex: 30,
                gap: 12,
            }}
        >
            {/* Left: hamburger + title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                {/* Hamburger — shown on mobile */}
                <button
                    className="menu-toggle-btn"
                    onClick={onMenuToggle}
                    aria-label="Toggle menu"
                >
                    <Menu size={20} />
                </button>

                <div style={{ minWidth: 0 }}>
                    <h1 style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</h1>
                    {subtitle && <p style={{ fontSize: 12, color: '#64748b', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subtitle}</p>}
                </div>
            </div>

            {/* Right: search + notif + avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                {/* Search bar — hidden on small mobile */}
                <div
                    className="topbar-search"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 10,
                        padding: '7px 12px',
                    }}
                >
                    <Search size={14} color="#64748b" />
                    <input
                        placeholder="Search…"
                        style={{
                            background: 'none',
                            border: 'none',
                            outline: 'none',
                            color: '#f1f5f9',
                            fontSize: 13,
                            width: 120,
                        }}
                    />
                </div>

                {/* Notification bell */}
                <button
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        position: 'relative',
                        color: '#94a3b8',
                        flexShrink: 0,
                    }}
                >
                    <Bell size={16} />
                    <span
                        style={{
                            position: 'absolute',
                            top: 7,
                            right: 7,
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            background: '#3b82f6',
                            boxShadow: '0 0 6px rgba(59,130,246,0.8)',
                        }}
                    />
                </button>

                {/* Avatar */}
                <div
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: 13,
                        color: 'white',
                        cursor: 'pointer',
                        boxShadow: '0 0 12px rgba(59,130,246,0.3)',
                        flexShrink: 0,
                    }}
                >
                    AI
                </div>
            </div>
        </header>
    );
}
