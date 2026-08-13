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
  CartesianGrid,
} from 'recharts';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import PageTransition from '../components/layout/PageTransition';
import AnimatedNumber from '../components/ui/AnimatedNumber';
import Card from '../components/ui/Card';
import StampBadge from '../components/ui/StampBadge';
import ChartEmpty from '../components/ui/ChartEmpty';
import { useLanguage, useEventTypeLabel } from '../i18n/LanguageContext';
import { tokens } from '../styles/tokens';
import { formatDate, formatCurrency } from '../lib/format';
import type { OwnerAnalytics, ShopAnalytics, Vehicle } from '../types';

const chartTooltipStyle = {
  background: tokens.panel,
  border: `1px solid ${tokens.hairline}`,
  borderRadius: 12,
  fontFamily: 'IBM Plex Mono, monospace',
  fontSize: 12,
  color: tokens.text,
};

export default function AnalyticsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const labelEvent = useEventTypeLabel();
  const [owner, setOwner] = useState<OwnerAnalytics | null>(null);
  const [shop, setShop] = useState<ShopAnalytics | null>(null);
  const [monthly, setMonthly] = useState<Array<{ month: string; count: number }>>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'SHOP') {
      api
        .vehicles()
        .then(({ vehicles: v }) => setVehicles(v))
        .catch(() => setVehicles([]));
    }
  }, [user?.role]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        if (user?.role === 'SHOP') {
          const [{ analytics }, monthlyData] = await Promise.all([
            api.shopAnalytics(),
            api.shopMonthlyAnalytics().catch(() => ({ monthly: [] })),
          ]);
          setShop(analytics);
          setMonthly(monthlyData.monthly);
        } else {
          const { analytics } = await api.ownerAnalytics(vehicleFilter || undefined);
          setOwner(analytics);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user?.role, vehicleFilter]);

  if (loading) {
    return (
      <PageTransition>
        <div className="skeleton ui-card ui-card--padded" style={{ height: 300 }} />
      </PageTransition>
    );
  }

  if (user?.role === 'SHOP' && shop) {
    const monthlyPoints = monthly.filter((m) => m.count > 0).length >= 2 ? monthly : [];
    return (
      <PageTransition>
        <div className="grid-stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <div className="card-stat tone-verified">
            <div className="stat-value mono tone-verified">
              <AnimatedNumber value={shop.totalVerifications} />
            </div>
            <p className="stat-label">{t('analytics.totalVerifications')}</p>
          </div>
          <div className="card-stat tone-verified">
            <div className="stat-value mono tone-verified">
              <AnimatedNumber value={shop.verificationsLast30Days} />
            </div>
            <p className="stat-label">{t('analytics.last30')}</p>
          </div>
          <div className="card-stat tone-declared">
            <div className="stat-value mono tone-declared">
              <AnimatedNumber value={shop.pendingEvents} />
            </div>
            <p className="stat-label">{t('analytics.pending')}</p>
          </div>
        </div>
        <Card style={{ marginTop: 16 }}>
          <h2 className="section-title" style={{ marginBottom: 4 }}>
            {t('analytics.verifiedPerMonth')}
          </h2>
          <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
            {t('analytics.verifiedPerMonthDesc')}
          </p>
          {monthlyPoints.length < 2 ? (
            <ChartEmpty />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthly}>
                <CartesianGrid stroke={tokens.hairline} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" stroke={tokens.textMuted} tick={{ fill: tokens.textMuted, fontSize: 10 }} />
                <YAxis stroke={tokens.textMuted} tick={{ fill: tokens.textMuted, fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="count" fill={tokens.verified} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card style={{ marginTop: 16 }}>
          <h2 className="section-title" style={{ marginBottom: 12 }}>
            {t('analytics.recentWork')}
          </h2>
          {shop.recentVerifications.length === 0 ? (
            <p className="muted">{t('analytics.createVerified')}</p>
          ) : (
            shop.recentVerifications.map((item) => (
              <div key={`${item.eventType}-${item.verifiedAt}`} className="history-row">
                <span>{labelEvent(item.eventType)}</span>
                <span className="mono muted">{item.vehicle}</span>
                <StampBadge
                  variant="verified"
                  label={formatDate(item.verifiedAt)}
                  size="sm"
                />
              </div>
            ))
          )}
        </Card>
      </PageTransition>
    );
  }

  if (!owner) return null;

  const costData = Object.entries(owner.costByMonth).map(([month, cost]) => ({ month, cost }));
  const typeData = Object.entries(owner.eventsByType).map(([name, count]) => ({
    name: labelEvent(name),
    count,
  }));
  const verifiedN = owner.shopVerifiedCount ?? owner.verifiedCount;
  const declaredN = owner.selfReportedCount ?? 0;

  return (
    <PageTransition>
      {vehicles.length > 0 && (
        <div className="segmented segmented--scroll" style={{ marginBottom: 16 }}>
          <button type="button" className={vehicleFilter === '' ? 'active' : ''} onClick={() => setVehicleFilter('')}>
            {t('analytics.allVehicles')}
          </button>
          {vehicles.map((v) => (
            <button
              key={v.id}
              type="button"
              className={vehicleFilter === v.id ? 'active' : ''}
              onClick={() => setVehicleFilter(v.id)}
            >
              {v.nickname || `${v.year} ${v.make} ${v.model}`}
            </button>
          ))}
        </div>
      )}
      <div className="grid-stats">
        <div className="card-stat tone-neutral">
          <div className="stat-value mono">
            <AnimatedNumber value={owner.totalCost} decimals={2} /> €
          </div>
          <p className="stat-label">{t('analytics.totalCost')}</p>
        </div>
        <div className="card-stat tone-neutral">
          <div className="stat-value mono">
            <AnimatedNumber value={owner.serviceFrequency} />
          </div>
          <p className="stat-label">{t('analytics.totalEvents')}</p>
        </div>
        <div className="card-stat tone-verified">
          <div className="stat-value mono tone-verified">
            <AnimatedNumber value={Math.round(owner.conversionRate * 100)} />%
          </div>
          <p className="stat-label">{t('analytics.verifiedRate')}</p>
        </div>
        <div className="card-stat tone-neutral">
          <div className="stat-value mono">
            <AnimatedNumber value={owner.vehicleCount} />
          </div>
          <p className="stat-label">{t('analytics.vehicles')}</p>
        </div>
      </div>

      <div className="trust-summary-row" style={{ marginTop: 16 }}>
        <Card className="trust-mini trust-mini--verified" raised>
          <StampBadge variant="verified" label={t('analytics.shopCreated')} size="sm" />
          <strong className="mono tone-verified">{verifiedN}</strong>
        </Card>
        <Card className="trust-mini trust-mini--declared" raised>
          <StampBadge variant="declared" label={t('analytics.selfReported')} size="sm" />
          <strong className="mono tone-declared">{declaredN}</strong>
        </Card>
      </div>

      <div className="analytics-charts">
        <Card>
          <h3 className="section-title" style={{ marginBottom: 16 }}>
            {t('analytics.monthlySpend')}
          </h3>
          {costData.length < 2 ? (
            <ChartEmpty />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={costData}>
                <CartesianGrid stroke={tokens.hairline} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" stroke={tokens.textMuted} tick={{ fill: tokens.textMuted, fontSize: 11 }} />
                <YAxis
                  stroke={tokens.textMuted}
                  tick={{ fill: tokens.textMuted, fontSize: 11 }}
                  tickFormatter={(v) => formatCurrency(v).replace(/\u00a0/g, ' ')}
                />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  formatter={(value) => [formatCurrency(Number(value ?? 0)), t('analytics.monthlySpend')]}
                />
                <Line
                  type="monotone"
                  dataKey="cost"
                  stroke={tokens.declared}
                  strokeWidth={2}
                  dot={{ r: 3, fill: tokens.declared }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card>
          <h3 className="section-title" style={{ marginBottom: 16 }}>
            {t('analytics.byType')}
          </h3>
          {typeData.length < 2 ? (
            <ChartEmpty />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={typeData} margin={{ bottom: 24 }}>
                <CartesianGrid stroke={tokens.hairline} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke={tokens.textMuted}
                  tick={{ fill: tokens.textMuted, fontSize: 10 }}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                  height={50}
                />
                <YAxis stroke={tokens.textMuted} tick={{ fill: tokens.textMuted, fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="count" fill={tokens.verified} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </PageTransition>
  );
}
