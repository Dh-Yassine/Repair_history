import { FormEvent, useMemo, useState } from 'react';
import { FileCheck2, ShieldCheck, UserRoundSearch, CheckCircle2, RotateCcw } from 'lucide-react';
import { api } from '../../api';
import { useLanguage, useEventTypeLabel } from '../../i18n/LanguageContext';
import Stepper from '../ui/Stepper';
import { useToast } from '../ui/Toast';
import type { Vehicle } from '../../types';

const EVENT_TYPES = ['Oil change', 'Tire rotation', 'Brake service', 'Battery replacement', 'Inspection', 'Repair', 'Other'];

type StepId = 'lookup' | 'create' | 'done';

export default function CreateVerifiedEventForm({ onCreated }: { onCreated: () => void }) {
  const toast = useToast();
  const { t } = useLanguage();
  const labelEvent = useEventTypeLabel();
  const [step, setStep] = useState<StepId>('lookup');
  const [query, setQuery] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [eventType, setEventType] = useState(EVENT_TYPES[0]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [mileage, setMileage] = useState('');
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');
  const [verificationNotes, setVerificationNotes] = useState('');
  const [proof, setProof] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lookupMsg, setLookupMsg] = useState('');

  const STEPS = useMemo(
    () => [
      { id: 'lookup', label: t('shop.lookup'), hint: t('shop.hintLookup') },
      { id: 'create', label: t('shop.details'), hint: t('shop.hintDetails') },
      { id: 'done', label: t('common.done'), hint: t('shop.hintDone') },
    ],
    [t]
  );

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);

  function resetAll() {
    setStep('lookup');
    setQuery('');
    setOwnerEmail('');
    setOwnerName('');
    setVehicles([]);
    setSelectedVehicleId('');
    setMileage('');
    setCost('');
    setNotes('');
    setVerificationNotes('');
    setProof(null);
    setError('');
    setLookupMsg('');
  }

  async function lookup(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLookupMsg('');
    const q = query.trim().replace(/\u00a0/g, ' ');
    if (!q) {
      setError(t('shop.lookupFailed'));
      return;
    }
    try {
      const result = await api.shopLookupVehicle(
        q.includes('@') ? { q, ownerEmail: q.toLowerCase() } : { q }
      );
      setVehicles(result.vehicles);
      setOwnerName(result.owner.fullName || '');
      setOwnerEmail(result.owner.email);
      setSelectedVehicleId(result.vehicles[0]?.id || '');
      if (result.vehicles.length === 0) {
        setLookupMsg(
          t('shop.ownerFoundNoVehicleFull', { name: result.owner.fullName || result.owner.email })
        );
      } else {
        setStep('create');
      }
    } catch (err) {
      setVehicles([]);
      const msg = err instanceof Error ? err.message : t('shop.lookupFailed');
      setError(msg);
      toast.error(msg);
    }
  }

  async function createRecord(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.shopCreateEvent(
        {
          ownerEmail,
          vehicleId: selectedVehicleId || undefined,
          eventType,
          date,
          mileage,
          cost,
          notes,
          verificationNotes,
        },
        proof ?? undefined
      );
      toast.success(t('shop.verifiedCreated'));
      setStep('done');
      onCreated();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('shop.createFailed');
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <Stepper steps={STEPS} current={step} />

      <div className="wizard">
        <form className={`wizard-card ${step === 'lookup' ? 'active' : ''}`} onSubmit={lookup}>
          <div className="wizard-card-head">
            <span className="wizard-card-num">1</span>
            <div>
              <h3 className="display">{t('shop.findCustomer')}</h3>
              <p>{t('shop.findCustomerDesc')}</p>
            </div>
          </div>
          <div className="field">
            <label className="label">{t('shop.lookupPlaceholder')}</label>
            <input
              className="input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="customer@email.com or VF1RFB00…"
              required
            />
            <p className="mono subtle" style={{ fontSize: 11, marginTop: 4 }}>
              {t('shop.lookupHint')}
            </p>
          </div>
          {lookupMsg && <p className="muted" style={{ fontSize: 13 }}>{lookupMsg}</p>}
          {error && step === 'lookup' && <p className="error-msg">{error}</p>}
          <button type="submit" className="btn btn-solid" style={{ marginTop: 4 }}>
            <UserRoundSearch size={16} /> {t('shop.lookUp')}
          </button>
        </form>

        <form
          className={`wizard-card ${step === 'create' ? 'active' : step === 'lookup' ? 'locked' : ''}`}
          onSubmit={createRecord}
        >
          <div className="wizard-card-head">
            <span className="wizard-card-num">2</span>
            <div>
              <h3 className="display">{t('shop.serviceDetails')}</h3>
              <p>
                <ShieldCheck size={13} style={{ verticalAlign: 'middle', color: 'var(--color-verified)' }} />{' '}
                {t('shop.verifiedOnSaveDesc')}
              </p>
            </div>
          </div>

          {selectedVehicle && (
            <div className="vehicle-match-card" style={{ marginBottom: 14 }}>
              <ShieldCheck size={20} color="var(--color-verified)" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong>
                  {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
                </strong>
                <span>
                  {ownerName ? `${ownerName} · ` : ''}
                  {selectedVehicle.vin || t('shop.noVin')}
                </span>
              </div>
              {vehicles.length > 1 && (
                <select
                  className="input"
                  style={{ maxWidth: 200 }}
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                >
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div className="grid-form-2">
            <div className="field">
              <label className="label">{t('shop.service')}</label>
              <select className="input" value={eventType} onChange={(e) => setEventType(e.target.value)}>
                {EVENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {labelEvent(type)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label">{t('shop.date')}</label>
              <input className="input input-mono" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="field">
              <label className="label">{t('shop.mileage')}</label>
              <input className="input input-mono" type="number" value={mileage} onChange={(e) => setMileage(e.target.value)} required />
            </div>
            <div className="field">
              <label className="label">{t('shop.cost')}</label>
              <input className="input input-mono" type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label className="label">{t('shop.serviceNotes')}</label>
            <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="field">
            <label className="label">{t('shop.verificationNoteFull')}</label>
            <input className="input" value={verificationNotes} onChange={(e) => setVerificationNotes(e.target.value)} />
          </div>
          <div className="field">
            <label className="label">
              {t('shop.proofFile')} ({t('common.optional')})
            </label>
            <label className="upload-zone compact-upload">
              <FileCheck2 size={22} />
              <span>{proof ? proof.name : t('shop.attachInvoice')}</span>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={(e) => setProof(e.target.files?.[0] ?? null)} />
            </label>
          </div>
          {error && step === 'create' && <p className="error-msg">{error}</p>}
          <button
            type="submit"
            className="btn btn-solid"
            disabled={submitting || !ownerEmail || (!selectedVehicleId && vehicles.length > 0)}
          >
            <ShieldCheck size={16} /> {submitting ? t('common.saving') : t('shop.createRecord')}
          </button>
        </form>

        {step === 'done' && (
          <div className="wizard-card active" style={{ borderColor: 'rgba(34, 212, 122, 0.45)' }}>
            <div className="wizard-card-head">
              <span className="wizard-card-num" style={{ background: 'linear-gradient(135deg, var(--color-verified), #1aa05f)' }}>
                <CheckCircle2 size={18} color="#0a0b0d" />
              </span>
              <div>
                <h3 className="display">{t('shop.verifiedCreated')}</h3>
                <p>{t('shop.verifiedCreatedDesc')}</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-solid" onClick={resetAll}>
                <RotateCcw size={16} /> {t('shop.addAnother')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
