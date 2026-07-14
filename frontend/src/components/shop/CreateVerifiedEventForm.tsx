import { FormEvent, useState } from 'react';
import { FileCheck2, ShieldCheck, UserRoundSearch, CheckCircle2, RotateCcw } from 'lucide-react';
import { api } from '../../api';
import Stepper from '../ui/Stepper';
import { useToast } from '../ui/Toast';
import type { Vehicle } from '../../types';

const EVENT_TYPES = ['Oil change', 'Tire rotation', 'Brake service', 'Battery replacement', 'Inspection', 'Repair', 'Other'];

type StepId = 'lookup' | 'create' | 'done';

const STEPS = [
  { id: 'lookup', label: 'Lookup', hint: 'Email, VIN, or serial' },
  { id: 'create', label: 'Details', hint: 'Type, mileage, cost' },
  { id: 'done', label: 'Done', hint: 'Verified on save' },
];

export default function CreateVerifiedEventForm({ onCreated }: { onCreated: () => void }) {
  const toast = useToast();
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
    try {
      const result = await api.shopLookupVehicle({ q: query.trim() });
      setVehicles(result.vehicles);
      setOwnerName(result.owner.fullName || '');
      setOwnerEmail(result.owner.email);
      setSelectedVehicleId(result.vehicles[0]?.id || '');
      if (result.vehicles.length === 0) {
        setLookupMsg(`Owner ${result.owner.fullName} found, but no matching vehicle. Ask the owner to add the vehicle first.`);
      } else {
        setStep('create');
      }
    } catch (err) {
      setVehicles([]);
      const msg = err instanceof Error ? err.message : 'Vehicle lookup failed';
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
      toast.success('Verified record created.');
      setStep('done');
      onCreated();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create verified record';
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
        {/* Step 1: Lookup */}
        <form
          className={`wizard-card ${step === 'lookup' ? 'active' : ''}`}
          onSubmit={lookup}
        >
          <div className="wizard-card-head">
            <span className="wizard-card-num">1</span>
            <div>
              <h3 className="display">Find the customer vehicle</h3>
              <p>One search box: the customer&apos;s email, or a full/partial VIN or serial number.</p>
            </div>
          </div>
          <div className="field">
            <label className="label">Customer email, VIN, or n° série</label>
            <input
              className="input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="customer@email.com or VF1RFB00…"
              required
            />
            <p className="mono subtle" style={{ fontSize: 11, marginTop: 4 }}>
              VIN and serial searches match partial input · email must be exact
            </p>
          </div>
          {lookupMsg && <p className="muted" style={{ fontSize: 13 }}>{lookupMsg}</p>}
          {error && step === 'lookup' && <p className="error-msg">{error}</p>}
          <button type="submit" className="btn btn-solid" style={{ marginTop: 4 }}>
            <UserRoundSearch size={16} /> Look up vehicle
          </button>
        </form>

        {/* Step 2: Create */}
        <form
          className={`wizard-card ${step === 'create' ? 'active' : step === 'lookup' ? 'locked' : ''}`}
          onSubmit={createRecord}
        >
          <div className="wizard-card-head">
            <span className="wizard-card-num">2</span>
            <div>
              <h3 className="display">Service details</h3>
              <p>
                <ShieldCheck size={13} style={{ verticalAlign: 'middle', color: 'var(--color-verified)' }} />{' '}
                Verified immediately on save — no review step. The owner is notified automatically.
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
                  {ownerName ? `${ownerName} · ` : ''}{selectedVehicle.vin || 'No VIN on file'}
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
              <label className="label">Service</label>
              <select className="input" value={eventType} onChange={(e) => setEventType(e.target.value)}>
                {EVENT_TYPES.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label">Date</label>
              <input className="input input-mono" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="field">
              <label className="label">Mileage (km)</label>
              <input className="input input-mono" type="number" value={mileage} onChange={(e) => setMileage(e.target.value)} required />
            </div>
            <div className="field">
              <label className="label">Cost</label>
              <input className="input input-mono" type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label className="label">Service notes</label>
            <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Parts used, observations…" />
          </div>
          <div className="field">
            <label className="label">Verification note (shown to buyer)</label>
            <input
              className="input"
              value={verificationNotes}
              onChange={(e) => setVerificationNotes(e.target.value)}
              placeholder="e.g. Performed at our certified service bay"
            />
          </div>
          <div className="field">
            <label className="label">Proof file (optional)</label>
            <label className="upload-zone compact-upload">
              <FileCheck2 size={22} />
              <span>{proof ? proof.name : 'Attach invoice, photo, or PDF proof'}</span>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={(e) => setProof(e.target.files?.[0] ?? null)} />
            </label>
          </div>
          {error && step === 'create' && <p className="error-msg">{error}</p>}
          <button
            type="submit"
            className="btn btn-solid"
            disabled={submitting || !ownerEmail || (!selectedVehicleId && vehicles.length > 0)}
          >
            <ShieldCheck size={16} /> {submitting ? 'Saving…' : 'Create record'}
          </button>
        </form>

        {/* Step 3: Done */}
        {step === 'done' && (
          <div className="wizard-card active" style={{ borderColor: 'rgba(34, 212, 122, 0.45)' }}>
            <div className="wizard-card-head">
              <span className="wizard-card-num" style={{ background: 'linear-gradient(135deg, var(--color-verified), #1aa05f)' }}>
                <CheckCircle2 size={18} color="#0a0b0d" />
              </span>
              <div>
                <h3 className="display">Verified record created</h3>
                <p>The owner has been notified and the record is now part of their permanent trust history.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-solid" onClick={resetAll}>
                <RotateCcw size={16} /> Add another
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
