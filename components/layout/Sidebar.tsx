'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    LayoutDashboard,
    Users,
    FileText,
    ArrowLeftRight,
    Wallet,
    Boxes,
    Settings,
    LogOut,
    Zap,
    X,
} from 'lucide-react';
import clsx from 'clsx';
import { useAppStore } from '@/lib/appStore';

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/attendance', label: 'Attendance', icon: Users },
    { href: '/invoices', label: 'Invoices', icon: FileText },
    { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
    { href: '/inventory', label: 'Inventory', icon: Boxes },
    { href: '/expenses', label: 'Expenses', icon: Wallet },
    { href: '/settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { logout } = useAppStore();

    return (
        <aside className={clsx('sidebar', isOpen && 'sidebar--open')}>
            {/* Close button — visible on mobile */}
            <button
                className="sidebar-close-btn"
                onClick={onClose}
                aria-label="Close menu"
            >
                <X size={20} />
            </button>

            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36, paddingLeft: 6 }}>
                <div
                    style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 0 18px rgba(59,130,246,0.5)',
                        flexShrink: 0,
                    }}
                >
                    <Zap size={18} color="white" />
                </div>
                <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', lineHeight: 1.2 }}>Applix</div>
                    <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.2 }}>Infotech Services</div>
                </div>
            </div>

            {/* Nav */}
            <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontSize: 11, color: '#475569', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 8px', marginBottom: 6 }}>
                    Main Menu
                </div>
                {navItems.map(({ href, label, icon: Icon }) => {
                    const active = pathname === href || pathname.startsWith(href + '/');
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={clsx('nav-link', active && 'active')}
                            onClick={onClose}
                        >
                            <Icon size={17} />
                            {label}
                        </Link>
                    );
                })}
            </nav>

            {/* Logout */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>
                <button
                    type="button"
                    className="nav-link"
                    onClick={() => {
                        logout();
                        router.replace('/');
                        onClose();
                    }}
                    style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left' }}
                >
                    <LogOut size={17} />
                    Logout
                </button>
            </div>
        </aside>
    );
}
