import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import PageTransition from '../components/layout/PageTransition';
import AnimatedNumber from '../components/ui/AnimatedNumber';
import type { OwnerAnalytics, ShopAnalytics } from '../types';

const chartTooltipStyle = {
  background: '#1a1d24',
  border: '1px solid #252932',
  borderRadius: 4,
  fontFamily: 'DM Mono, monospace',
  fontSize: 12,
};

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [owner, setOwner] = useState<OwnerAnalytics | null>(null);
  const [shop, setShop] = useState<ShopAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        if (user?.role === 'SHOP') {
          const { analytics } = await api.shopAnalytics();
          setShop(analytics);
        } else {
          const { analytics } = await api.ownerAnalytics();
          setOwner(analytics);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user?.role]);

  if (loading) {
    return (
      <PageTransition>
        <div className="skeleton card" style={{ height: 300 }} />
      </PageTransition>
    );
  }

  if (user?.role === 'SHOP' && shop) {
    return (
      <PageTransition>
        <div className="hero-panel page-hero compact">
          <div className="hero-copy">
            <p className="section-eyebrow">Shop performance</p>
            <h1 className="display page-title">Shop analytics</h1>
            <p className="muted" style={{ marginTop: 10, maxWidth: 540 }}>
              Track verifications, throughput, and the customer trust you create.
            </p>
          </div>
        </div>
        <div className="grid-stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <div className="card-stat">
            <div style={{ fontSize: 28 }}>
              <AnimatedNumber value={shop.totalVerifications} />
            </div>
            <p className="muted">Total verifications</p>
          </div>
          <div className="card-stat">
            <div style={{ fontSize: 28 }}>
              <AnimatedNumber value={shop.verificationsLast30Days} />
            </div>
            <p className="muted">Last 30 days</p>
          </div>
          <div className="card-stat">
            <div style={{ fontSize: 28 }}>
              <AnimatedNumber value={shop.pendingEvents} />
            </div>
            <p className="muted">Pending</p>
          </div>
        </div>
        <div className="card" style={{ marginTop: 16 }}>
          <h2 className="display" style={{ fontSize: 22, marginBottom: 12 }}>
            Recent verified work
          </h2>
          {shop.recentVerifications.length === 0 ? (
            <p className="muted">Create verified service records to build your activity feed.</p>
          ) : (
            shop.recentVerifications.map((item) => (
              <div key={`${item.eventType}-${item.verifiedAt}`} className="history-row">
                <span>{item.eventType}</span>
                <span className="mono muted">{item.vehicle}</span>
                <span className="tag tag-verified">{new Date(item.verifiedAt).toLocaleDateString()}</span>
              </div>
            ))
          )}
        </div>
      </PageTransition>
    );
  }

  if (!owner) return null;

  const costData = Object.entries(owner.costByMonth).map(([month, cost]) => ({ month, cost }));
  const typeData = Object.entries(owner.eventsByType).map(([name, count]) => ({ name, count }));

  return (
    <PageTransition>
      <div className="hero-panel page-hero compact">
        <div className="hero-copy">
          <p className="section-eyebrow">Trust insights</p>
          <h1 className="display page-title">Analytics</h1>
          <p className="muted" style={{ marginTop: 10, maxWidth: 540 }}>
            See how your trust score is built — verified versus self-reported records, average spend, and service mix.
          </p>
        </div>
      </div>
      <div className="grid-stats">
        <div className="card-stat">
          <div style={{ fontSize: 28 }}>
            $<AnimatedNumber value={owner.averageServiceCost} decimals={2} />
          </div>
          <p className="muted">Avg service cost</p>
        </div>
        <div className="card-stat">
          <div style={{ fontSize: 28 }}>
            <AnimatedNumber value={owner.serviceFrequency} />
          </div>
          <p className="muted">Total events</p>
        </div>
        <div className="card-stat">
          <div style={{ fontSize: 28 }}>
            <AnimatedNumber value={Math.round(owner.conversionRate * 100)} />%
          </div>
          <p className="muted">Verified rate</p>
        </div>
        <div className="card-stat">
          <div style={{ fontSize: 28 }}>
            <AnimatedNumber value={owner.vehicleCount} />
          </div>
          <p className="muted">Vehicles</p>
        </div>
      </div>

      <div className="trust-summary-row" style={{ marginTop: 16 }}>
        <div className="card trust-mini">
          <span className="mono muted">Shop-created verified</span>
          <strong>{owner.shopVerifiedCount ?? owner.verifiedCount}</strong>
        </div>
        <div className="card trust-mini">
          <span className="mono muted">Self-reported records</span>
          <strong>{owner.selfReportedCount ?? 0}</strong>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
        <div className="card">
          <h3 className="display" style={{ fontSize: 18, marginBottom: 16 }}>
            Monthly spend
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={costData}>
              <XAxis dataKey="month" stroke="#3d4350" tick={{ fill: '#6b7280', fontSize: 11 }} />
              <YAxis stroke="#3d4350" tick={{ fill: '#6b7280', fontSize: 11 }} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Line type="monotone" dataKey="cost" stroke="#e8ff47" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3 className="display" style={{ fontSize: 18, marginBottom: 16 }}>
            By service type
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={typeData}>
              <XAxis dataKey="name" stroke="#3d4350" tick={{ fill: '#6b7280', fontSize: 10 }} />
              <YAxis stroke="#3d4350" tick={{ fill: '#6b7280', fontSize: 11 }} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="count" fill="#b8cc35" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </PageTransition>
  );
}
