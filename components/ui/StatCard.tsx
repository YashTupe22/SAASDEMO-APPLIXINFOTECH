'use client';

interface StatCardProps {
    label: string;
    value: string;
    sub?: string;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    iconBg: string;
    icon: React.ReactNode;
}

export default function StatCard({ label, value, sub, trend, trendValue, iconBg, icon }: StatCardProps) {
    return (
        <div
            className="glass-card stat-card"
            style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}
        >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                    <p style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
                    <p style={{ fontSize: 26, fontWeight: 800, color: '#f1f5f9', marginTop: 4, letterSpacing: '-0.5px' }}>{value}</p>
                    {sub && <p style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>{sub}</p>}
                </div>
                <div
                    style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: iconBg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                    }}
                >
                    {icon}
                </div>
            </div>
            {trendValue && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                        style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: trend === 'up' ? '#22c55e' : trend === 'down' ? '#ef4444' : '#94a3b8',
                        }}
                    >
                        {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '●'} {trendValue}
                    </span>
                    <span style={{ fontSize: 12, color: '#475569' }}>vs last month</span>
                </div>
            )}
        </div>
    );
}
