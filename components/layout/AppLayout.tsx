'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useAppStore } from '@/lib/appStore';

interface AppLayoutProps {
    children: React.ReactNode;
    title: string;
    subtitle?: string;
}

export default function AppLayout({ children, title, subtitle }: AppLayoutProps) {
    const { ready, currentUser } = useAppStore();
    const router = useRouter();

    useEffect(() => {
        if (!ready) return;
        if (!currentUser) {
            router.replace('/');
        }
    }, [ready, currentUser, router]);

    if (!ready) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--navy)' }}>
                <p style={{ color: '#64748b', fontSize: 14 }}>Loading workspace…</p>
            </div>
        );
    }

    if (!currentUser) return null;

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <TopBar title={title} subtitle={subtitle} />
                <main
                    style={{
                        flex: 1,
                        padding: '28px',
                        overflowY: 'auto',
                        background: 'radial-gradient(ellipse at 20% 10%, rgba(59,130,246,0.07) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(6,182,212,0.05) 0%, transparent 60%), var(--navy)',
                    }}
                >
                    {children}
                </main>
            </div>
        </div>
    );
}
