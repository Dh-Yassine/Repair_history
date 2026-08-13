import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarPlus, BellPlus } from 'lucide-react';
import { formatDate, formatKm, formatNumber } from '../lib/format';
import { api } from '../api';
import Card from './ui/Card';
import { useToast } from './ui/Toast';
import { useLanguage } from '../i18n/LanguageContext';
import type { ServiceReminder } from '../types';

/** Reminders due within this window are actionable now; further out, they're just informational. */
const SOON_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

function daysUntil(dueDate: string | null): number | null {
  if (!dueDate) return null;
  return Math.round((new Date(dueDate).getTime() - Date.now()) / DAY_MS);
}

function monthsFromDays(days: number): number {
  return Math.max(1, Math.round(days / 30.44));
}

/** `vehicleId` narrows the list to one vehicle; omit it to show the whole garage. */
export default function RemindersPanel({ vehicleId }: { vehicleId?: string } = {}) {
  const { t } = useLanguage();
  const toast = useToast();
  const [allReminders, setAllReminders] = useState<ServiceReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState<string | null>(null);

  const reminders = vehicleId ? allReminders.filter((r) => r.vehicleId === vehicleId) : allReminders;

  function localizeServiceType(type: string) {
    const known = [
      'Oil change',
      'Tire rotation',
      'Brake service',
      'Battery replacement',
      'Inspection',
      'Repair',
      'Other',
    ];
    const match = known.find((k) => k.toLowerCase() === type.trim().toLowerCase()) || type;
    const key = `events.types.${match}`;
    const translated = t(key);
    return translated === key ? match : translated;
  }

  function localizeMessage(message?: string | null) {
    if (!message) return '';
    // Translate common English reminder templates stored in DB
    const basedOn = message.match(/^Based on your last (.+?) on (.+?) at (.+?) km/i);
    if (basedOn) {
      return t('reminders.basedOnFull', {
        type: localizeServiceType(basedOn[1]),
        date: basedOn[2],
        km: basedOn[3],
      });
    }
    if (/^Based on your last /i.test(message)) {
      return t('reminders.basedOnGeneric');
    }
    return message;
  }

  async function load() {
    try {
      const { reminders: list } = await api.reminders();
      setAllReminders(list);
    } catch {
      setAllReminders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function complete(id: string) {
    await api.completeReminder(id);
    await load();
  }

  /** Has an early heads-up already been scheduled ~1 month before this reminder's due date? */
  function hasEarlyRequest(r: ServiceReminder) {
    if (!r.dueDate) return false;
    const target = new Date(r.dueDate).getTime() - 30 * DAY_MS;
    return allReminders.some(
      (other) =>
        other.id !== r.id &&
        other.vehicleId === r.vehicleId &&
        other.serviceType === r.serviceType &&
        other.dueDate &&
        Math.abs(new Date(other.dueDate).getTime() - target) < 2 * DAY_MS
    );
  }

  async function requestEarlyReminder(r: ServiceReminder) {
    if (!r.dueDate) return;
    setRequesting(r.id);
    try {
      const early = new Date(r.dueDate);
      early.setDate(early.getDate() - 30);
      await api.createReminder(r.vehicleId, {
        serviceType: r.serviceType,
        dueDate: early.toISOString().slice(0, 10),
        message: `Based on your last service.`,
      });
      await load();
      toast.success(t('reminders.notifyBeforeToast'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.failed'));
    } finally {
      setRequesting(null);
    }
  }

  if (loading) return <div className="ui-card ui-card--padded skeleton" style={{ height: 100, marginBottom: 16 }} />;

  const soon = reminders.filter((r) => {
    const days = daysUntil(r.dueDate);
    return days == null || days <= SOON_DAYS;
  });
  const later = reminders.filter((r) => {
    const days = daysUntil(r.dueDate);
    return days != null && days > SOON_DAYS;
  });

  if (reminders.length === 0) {
    return (
      <Card style={{ marginBottom: 16 }}>
        <h3 className="section-title" style={{ marginBottom: 8 }}>
          {t('reminders.title')}
        </h3>
        <p className="muted" style={{ fontSize: 13, margin: 0 }}>
          {t('reminders.empty')}
        </p>
        <Link to="/shops" className="btn btn-outline btn-sm" style={{ marginTop: 12 }}>
          <CalendarPlus size={14} /> {t('reminders.bookAppointment')}
        </Link>
      </Card>
    );
  }

  return (
    <>
      {soon.length > 0 && (
        <Card className="reminders-card" style={{ marginBottom: 16 }}>
          <h3 className="section-title" style={{ marginBottom: 12 }}>
            {t('reminders.title')}
          </h3>
          {soon.slice(0, 5).map((r) => (
            <div key={r.id} className="reminder-row">
              <div>
                <strong>{localizeServiceType(r.serviceType)}</strong>
                {!vehicleId && r.vehicle && (
                  <span className="mono muted" style={{ fontSize: 12, marginLeft: 8 }}>
                    {r.vehicle.nickname || `${r.vehicle.year} ${r.vehicle.make}`}
                  </span>
                )}
                <p className="mono muted" style={{ fontSize: 12, margin: '4px 0 0' }}>
                  {r.dueDate && t('reminders.due', { date: formatDate(r.dueDate) })}
                  {r.dueMileage != null && ` · ${formatKm(r.dueMileage)}`}
                </p>
                {(r.message || r.sourceDate) && (
                  <p className="muted" style={{ fontSize: 12, margin: '4px 0 0' }}>
                    {localizeMessage(r.message) ||
                      t('reminders.basedOn', {
                        date: formatDate(r.sourceDate),
                        km: r.sourceMileage != null ? formatNumber(Math.round(r.sourceMileage)) : '',
                      })}
                    {r.shop?.shopName && ` ${t('reminders.fromShop', { shop: r.shop.shopName })}`}
                  </p>
                )}
              </div>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => complete(r.id)}>
                {t('reminders.markDone')}
              </button>
            </div>
          ))}
          <Link to="/shops" className="btn btn-primary btn-sm" style={{ marginTop: 8 }}>
            <CalendarPlus size={14} /> {t('reminders.bookAppointment')}
          </Link>
        </Card>
      )}

      {later.length > 0 && (
        <Card className="reminders-card reminders-card--upcoming" style={{ marginBottom: 16 }}>
          <h3 className="section-title" style={{ marginBottom: 12 }}>
            {t('reminders.upcomingTitle')}
          </h3>
          {later.slice(0, 5).map((r) => {
            const days = daysUntil(r.dueDate)!;
            const months = monthsFromDays(days);
            const alreadyRequested = hasEarlyRequest(r);
            return (
              <div key={r.id} className="reminder-row">
                <div>
                  <strong>{localizeServiceType(r.serviceType)}</strong>
                  {!vehicleId && r.vehicle && (
                    <span className="mono muted" style={{ fontSize: 12, marginLeft: 8 }}>
                      {r.vehicle.nickname || `${r.vehicle.year} ${r.vehicle.make}`}
                    </span>
                  )}
                  <p className="muted" style={{ fontSize: 12, margin: '4px 0 0' }}>
                    {months === 1
                      ? t('reminders.upcomingInOne', { type: localizeServiceType(r.serviceType) })
                      : t('reminders.upcomingIn', { type: localizeServiceType(r.serviceType), n: months })}
                  </p>
                </div>
                {alreadyRequested ? (
                  <span className="mono muted" style={{ fontSize: 12 }}>
                    {t('reminders.notifyBeforeSet')}
                  </span>
                ) : (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => requestEarlyReminder(r)}
                    disabled={requesting === r.id}
                  >
                    <BellPlus size={14} /> {t('reminders.notifyBefore')}
                  </button>
                )}
              </div>
            );
          })}
        </Card>
      )}
    </>
  );
}
