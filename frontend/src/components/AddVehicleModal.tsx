import { FormEvent, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, ScanLine, Check, X, Keyboard, Hash } from 'lucide-react';
import { api } from '../api';
import { POPULAR_CAR_MODELS, POPULAR_MAKES } from '../lib/carData';
import { useToast } from './ui/Toast';

type Mode = 'vin' | 'serial' | 'manual';

export default function AddVehicleModal({
  open,
  onClose,
  onSuccess,
  canAdd,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  canAdd: boolean;
}) {
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<Mode>('vin');
  const [vin, setVin] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [mileage, setMileage] = useState('0');
  const [nickname, setNickname] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [decoding, setDecoding] = useState(false);
  const [error, setError] = useState('');

  function reset() {
    setStep(1);
    setMode('vin');
    setVin('');
    setSerialNumber('');
    setMake('');
    setModel('');
    setYear(String(new Date().getFullYear()));
    setMileage('0');
    setNickname('');
    setPhoto(null);
    setError('');
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function decodeVin() {
    if (vin.length < 11) {
      setError('Enter at least 11 characters of the VIN');
      return;
    }
    setDecoding(true);
    setError('');
    try {
      const d = await api.decodeVin(vin);
      setMake(d.make);
      setModel(d.model);
      if (d.year) setYear(String(d.year));
      setVin(d.vin);
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not decode VIN');
    } finally {
      setDecoding(false);
    }
  }

  function continueWithIdentifier() {
    if (mode === 'serial') {
      if (!serialNumber.trim()) {
        setError('Enter the numéro de série from your carte grise');
        return;
      }
      if (!make.trim() || !model.trim()) {
        setError('Enter make and model — the serial number cannot be decoded automatically');
        return;
      }
    } else if (!make.trim() || !model.trim()) {
      setError('Enter both make and model to continue');
      return;
    }
    setError('');
    setStep(2);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const form = new FormData();
      if (vin) form.append('vin', vin);
      if (serialNumber) form.append('serialNumber', serialNumber);
      form.append('make', make);
      form.append('model', model);
      form.append('year', year);
      form.append('mileage', mileage);
      if (photo) form.append('photo', photo);
      await api.createVehicle(form);
      setStep(3);
      onSuccess();
      toast.success('Vehicle added to your garage');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add vehicle';
      setError(msg);
      toast.error(msg);
    }
  }

  const identifierLabel =
    mode === 'vin' ? 'Scan a VIN or enter details manually' : mode === 'serial' ? 'French numéro de série + vehicle details' : 'Enter vehicle details manually';

  if (!open) return null;

  return (
    <div className="overlay" onClick={handleClose}>
      <motion.div
        className="modal"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="steps">
                {[1, 2, 3].map((s) => (
                  <div key={s} className={`step-dot ${step >= s ? 'active' : ''}`} />
                ))}
              </div>
              <h2 className="display" style={{ fontSize: 28 }}>
                Add vehicle
              </h2>
              <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                {step === 1 && identifierLabel}
                {step === 2 && 'Add a photo and a few details'}
                {step === 3 && 'All set'}
              </p>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={handleClose} aria-label="Close">
              <X size={16} />
            </button>
          </div>
        </div>

        <div style={{ padding: 24 }}>
          {!canAdd ? (
            <div>
              <p className="error-msg">You've reached your free plan limit (3 vehicles).</p>
              <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
                Upgrade your plan to add more vehicles and unlock advanced sharing features.
              </p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="s1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="segmented" style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    <button
                      type="button"
                      className={mode === 'vin' ? 'active' : ''}
                      style={{ flex: '1 1 auto' }}
                      onClick={() => { setMode('vin'); setError(''); }}
                    >
                      <ScanLine size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                      VIN
                    </button>
                    <button
                      type="button"
                      className={mode === 'serial' ? 'active' : ''}
                      style={{ flex: '1 1 auto' }}
                      onClick={() => { setMode('serial'); setError(''); }}
                    >
                      <Hash size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                      N° série
                    </button>
                    <button
                      type="button"
                      className={mode === 'manual' ? 'active' : ''}
                      style={{ flex: '1 1 auto' }}
                      onClick={() => { setMode('manual'); setError(''); }}
                    >
                      <Keyboard size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                      Manual
                    </button>
                  </div>

                  {mode === 'vin' ? (
                    <>
                      <div className="field">
                        <label className="label">VIN (17 characters)</label>
                        <div style={{ position: 'relative' }}>
                          <input
                            className={`input input-mono ${decoding ? 'skeleton' : ''}`}
                            value={vin}
                            maxLength={17}
                            onChange={(e) => setVin(e.target.value.toUpperCase())}
                            placeholder="1HGBH41JXMN109186"
                            style={{ paddingRight: 40, textTransform: 'uppercase' }}
                          />
                          <ScanLine
                            size={18}
                            style={{ position: 'absolute', right: 12, top: 12, color: 'var(--color-text-muted)' }}
                          />
                        </div>
                        <p className="mono subtle" style={{ fontSize: 11, marginTop: 4 }}>
                          {vin.length} / 17 · International 17-character identifier
                        </p>
                      </div>
                      {error && <p className="error-msg">{error}</p>}
                      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                        <button type="button" className="btn btn-solid" onClick={decodeVin} disabled={decoding}>
                          {decoding ? 'Scanning…' : 'Decode VIN'}
                        </button>
                        <button type="button" className="btn btn-ghost" onClick={handleClose}>
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      {mode === 'serial' && (
                        <div className="field">
                          <label className="label">Numéro de série (carte grise)</label>
                          <input
                            className="input input-mono"
                            value={serialNumber}
                            onChange={(e) => setSerialNumber(e.target.value.toUpperCase())}
                            placeholder="e.g. VF1… or chassis number"
                            style={{ textTransform: 'uppercase' }}
                          />
                          <p className="mono subtle" style={{ fontSize: 11, marginTop: 4 }}>
                            French registration serial — use this when you don&apos;t have a 17-char VIN
                          </p>
                        </div>
                      )}
                      <div className="field">
                        <label className="label">Make</label>
                        <input
                          className="input"
                          list="popular-car-makes"
                          placeholder="Renault, Peugeot, Toyota…"
                          value={make}
                          onChange={(e) => {
                            setMake(e.target.value);
                            if (!POPULAR_CAR_MODELS[e.target.value]) setModel('');
                          }}
                        />
                        <datalist id="popular-car-makes">
                          {POPULAR_MAKES.map((name) => (
                            <option key={name} value={name} />
                          ))}
                        </datalist>
                      </div>
                      <div className="grid-form-2">
                        <div className="field">
                          <label className="label">Model</label>
                          <input
                            className="input"
                            list="popular-car-models"
                            placeholder="Clio, 208, Camry…"
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                          />
                          <datalist id="popular-car-models">
                            {(POPULAR_CAR_MODELS[make] || []).map((name) => (
                              <option key={name} value={name} />
                            ))}
                          </datalist>
                        </div>
                        <div className="field">
                          <label className="label">Year</label>
                          <input className="input input-mono" type="number" value={year} onChange={(e) => setYear(e.target.value)} />
                        </div>
                      </div>
                      {error && <p className="error-msg">{error}</p>}
                      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                        <button type="button" className="btn btn-solid" onClick={continueWithIdentifier}>
                          Continue
                        </button>
                        <button type="button" className="btn btn-ghost" onClick={handleClose}>
                          Cancel
                        </button>
                      </div>
                    </>
                  )}
                </motion.div>
              )}

              {step === 2 && (
                <motion.form key="s2" onSubmit={submit} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <p className="display" style={{ fontSize: 24, marginBottom: 4 }}>
                    {year} {make} {model}
                  </p>
                  {vin && (
                    <p className="mono muted" style={{ marginBottom: 4, fontSize: 12 }}>
                      VIN · {vin}
                    </p>
                  )}
                  {serialNumber && (
                    <p className="mono muted" style={{ marginBottom: 18, fontSize: 12 }}>
                      N° série · {serialNumber}
                    </p>
                  )}
                  {!vin && !serialNumber && <div style={{ marginBottom: 18 }} />}
                  <div className="field">
                    <label className="label">Nickname (optional)</label>
                    <input className="input" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Daily Driver" />
                  </div>
                  <div className="field">
                    <label className="label">Current mileage (km)</label>
                    <input className="input input-mono" type="number" value={mileage} onChange={(e) => setMileage(e.target.value)} required />
                  </div>
                  <div className="field">
                    <label className="label">Vehicle photo (optional)</label>
                    <label className="upload-zone compact-upload vehicle-upload-preview">
                      {photo ? (
                        <img src={URL.createObjectURL(photo)} alt="Vehicle preview" />
                      ) : (
                        <>
                          <Camera size={22} />
                          <span>Add a photo, or we use the default AutoHistory visual</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        style={{ display: 'none' }}
                        onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                      />
                    </label>
                    {photo && (
                      <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => setPhoto(null)}>
                        Remove photo
                      </button>
                    )}
                  </div>
                  {error && <p className="error-msg">{error}</p>}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>
                      Back
                    </button>
                    <button type="submit" className="btn btn-solid" style={{ flex: 1 }}>
                      Add vehicle
                    </button>
                  </div>
                </motion.form>
              )}

              {step === 3 && (
                <motion.div key="s3" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ textAlign: 'center' }}>
                  <div style={{ color: 'var(--color-verified)', marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
                    <Check size={48} />
                  </div>
                  <h3 className="display" style={{ fontSize: 24 }}>
                    Vehicle added
                  </h3>
                  <p className="muted" style={{ margin: '12px 0 24px' }}>
                    Visit a partner shop to add your first verified service record, or open the timeline to add a self-report.
                  </p>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button type="button" className="btn btn-solid" onClick={handleClose}>
                      Done
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </motion.div>
    </div>
  );
}
