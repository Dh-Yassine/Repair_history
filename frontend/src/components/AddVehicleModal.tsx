import { FormEvent, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, ScanLine, Check, X, Keyboard, Hash, Loader2 } from 'lucide-react';
import { api } from '../api';
import { POPULAR_CAR_MODELS, POPULAR_MAKES } from '../lib/carData';
import { useLanguage } from '../i18n/LanguageContext';
import { useToast } from './ui/Toast';
import { useOverlayPanel } from '../hooks/useOverlayPanel';

type Mode = 'vin' | 'serial' | 'manual';

/** Allow longer than ISO 17 so pastes / atypical IDs are not cut off mid-typing */
const VIN_MAX_LENGTH = 32;

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
  const { t } = useLanguage();
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const submittingRef = useRef(false);

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
    setSaving(false);
    submittingRef.current = false;
    setError('');
  }

  function handleClose() {
    reset();
    onClose();
  }

  useOverlayPanel(open, handleClose);

  const [decodeFailed, setDecodeFailed] = useState(false);

  async function decodeVin() {
    if (vin.length < 11) {
      setError(t('addVehicle.vinShort'));
      return;
    }
    setDecoding(true);
    setError('');
    setDecodeFailed(false);
    try {
      const d = await api.decodeVin(vin);
      setMake(d.make);
      setModel(d.model);
      if (d.year) setYear(String(d.year));
      setVin(d.vin);
      setStep(2);
    } catch {
      setDecodeFailed(true);
      setError(t('addVehicle.vinFail'));
    } finally {
      setDecoding(false);
    }
  }

  function continueWithIdentifier() {
    if (mode === 'serial') {
      if (!serialNumber.trim()) {
        setError(t('addVehicle.needSerial'));
        return;
      }
      if (!make.trim() || !model.trim()) {
        setError(t('addVehicle.needMakeModelSerial'));
        return;
      }
    } else if (!make.trim() || !model.trim()) {
      setError(t('addVehicle.needBoth'));
      return;
    }
    setError('');
    setStep(2);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving || submittingRef.current) return;
    submittingRef.current = true;
    setSaving(true);
    setError('');
    try {
      const form = new FormData();
      if (vin) form.append('vin', vin);
      if (serialNumber) form.append('serialNumber', serialNumber);
      if (nickname.trim()) form.append('nickname', nickname.trim());
      form.append('make', make);
      form.append('model', model);
      form.append('year', year);
      form.append('mileage', mileage);
      if (photo) form.append('photo', photo);
      await api.createVehicle(form);
      setStep(3);
      onSuccess();
      toast.success(t('addVehicle.added'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('addVehicle.failed');
      setError(msg);
      toast.error(msg);
      submittingRef.current = false;
      setSaving(false);
    }
  }

  const identifierLabel =
    mode === 'vin'
      ? t('addVehicle.scanVinOrManual')
      : mode === 'serial'
        ? t('addVehicle.plateLead')
        : t('addVehicle.manual');

  if (!open) return null;

  return (
    <div className="overlay" onClick={handleClose}>
      <motion.div
        className="modal modal-vehicle"
        role="dialog"
        aria-modal="true"
        aria-label={t('addVehicle.title')}
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
                {t('addVehicle.title')}
              </h2>
              <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                {step === 1 && identifierLabel}
                {step === 2 && t('addVehicle.photoDetails')}
                {step === 3 && t('addVehicle.added')}
              </p>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={handleClose} aria-label={t('common.close')}>
              <X size={16} />
            </button>
          </div>
        </div>

        <div style={{ padding: 24 }}>
          {!canAdd ? (
            <div>
              <p className="error-msg">{t('addVehicle.freeLimitShort')}</p>
              <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
                {t('addVehicle.upgradeDesc')}
              </p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="s1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {mode === 'vin' ? (
                    <>
                      <div className="field">
                        <label className="label">{t('addVehicle.vin')}</label>
                        <div style={{ position: 'relative' }}>
                          <input
                            className={`input input-vin ${decoding ? 'skeleton' : ''}`}
                            value={vin}
                            maxLength={VIN_MAX_LENGTH}
                            size={VIN_MAX_LENGTH}
                            onChange={(e) => setVin(e.target.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, ''))}
                            placeholder="1HGBH41JXMN109186"
                            style={{ paddingRight: 44 }}
                            autoComplete="off"
                            spellCheck={false}
                            inputMode="text"
                          />
                          <ScanLine
                            size={18}
                            style={{ position: 'absolute', right: 12, top: 12, color: 'var(--color-text-muted)' }}
                          />
                        </div>
                        <p className="mono subtle" style={{ fontSize: 11, marginTop: 4 }}>
                          {t('addVehicle.vinHint', { n: vin.length, max: VIN_MAX_LENGTH })}
                        </p>
                      </div>
                      {error && <p className="error-msg">{error}</p>}
                      <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                        <button type="button" className="btn btn-solid" onClick={decodeVin} disabled={decoding}>
                          {decoding ? t('addVehicle.decoding') : t('addVehicle.decode')}
                        </button>
                        {decodeFailed && (
                          <button
                            type="button"
                            className="btn btn-outline"
                            onClick={() => {
                              setMode('manual');
                              setError('');
                              setDecodeFailed(false);
                            }}
                          >
                            <Keyboard size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                            {t('addVehicle.enterManually')}
                          </button>
                        )}
                        <button type="button" className="btn btn-ghost" onClick={handleClose}>
                          {t('common.cancel')}
                        </button>
                      </div>

                      <div className="add-vehicle-no-vin-panel">
                        <p className="add-vehicle-no-vin-panel__title">{t('addVehicle.noVin')}</p>
                        <div className="field field-plate-primary" style={{ marginBottom: 14 }}>
                          <label className="label label-plate">{t('addVehicle.serial')}</label>
                          <input
                            className="input input-plate input-mono"
                            value={serialNumber}
                            onChange={(e) => setSerialNumber(e.target.value.toUpperCase())}
                            placeholder="AB-123-CD"
                            autoComplete="off"
                            spellCheck={false}
                          />
                          <p className="mono subtle" style={{ fontSize: 11, marginTop: 6, textAlign: 'center' }}>
                            {t('addVehicle.serialHint')}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ width: '100%' }}
                          onClick={() => {
                            setMode('serial');
                            setError('');
                            setDecodeFailed(false);
                          }}
                        >
                          <Hash size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                          {t('addVehicle.continueWithPlate')}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      {mode === 'manual' && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ marginBottom: 14 }}
                          onClick={() => {
                            setMode('serial');
                            setError('');
                          }}
                        >
                          <Hash size={13} style={{ verticalAlign: 'middle', marginRight: 5 }} />
                          {t('addVehicle.backPlate')}
                        </button>
                      )}
                      {mode === 'serial' && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ marginBottom: 14 }}
                          onClick={() => {
                            setMode('vin');
                            setError('');
                          }}
                        >
                          <ScanLine size={13} style={{ verticalAlign: 'middle', marginRight: 5 }} />
                          {t('addVehicle.backVin')}
                        </button>
                      )}
                      {mode === 'serial' && (
                        <div className="field field-plate-primary">
                          <label className="label label-plate">{t('addVehicle.serial')}</label>
                          <input
                            className="input input-plate input-mono"
                            value={serialNumber}
                            onChange={(e) => setSerialNumber(e.target.value.toUpperCase())}
                            placeholder="AB-123-CD"
                            autoComplete="off"
                            spellCheck={false}
                          />
                          <p className="mono subtle" style={{ fontSize: 11, marginTop: 6, textAlign: 'center' }}>
                            {t('addVehicle.serialHint')}
                          </p>
                        </div>
                      )}
                      <div className="field">
                        <label className="label">{t('addVehicle.make')}</label>
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
                          <label className="label">{t('addVehicle.model')}</label>
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
                          <label className="label">{t('addVehicle.year')}</label>
                          <input className="input input-mono" type="number" value={year} onChange={(e) => setYear(e.target.value)} />
                        </div>
                      </div>
                      {error && <p className="error-msg">{error}</p>}
                      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                        <button type="button" className="btn btn-solid" onClick={continueWithIdentifier}>
                          {t('common.continue')}
                        </button>
                        <button type="button" className="btn btn-ghost" onClick={handleClose}>
                          {t('common.cancel')}
                        </button>
                      </div>
                      <div className="add-vehicle-alt-links">
                        {mode === 'serial' && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                              setMode('manual');
                              setError('');
                            }}
                          >
                            <Keyboard size={13} style={{ verticalAlign: 'middle', marginRight: 5 }} />
                            {t('addVehicle.enterManually')}
                          </button>
                        )}
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
                      {t('editVehicle.serial')} · {serialNumber}
                    </p>
                  )}
                  {!vin && !serialNumber && <div style={{ marginBottom: 18 }} />}
                  <div className="field">
                    <label className="label">
                      {t('addVehicle.nickname')} ({t('common.optional')})
                    </label>
                    <input className="input" value={nickname} onChange={(e) => setNickname(e.target.value)} />
                  </div>
                  <div className="field">
                    <label className="label">{t('addVehicle.mileage')}</label>
                    <input className="input input-mono" type="number" value={mileage} onChange={(e) => setMileage(e.target.value)} required />
                  </div>
                  <div className="field">
                    <label className="label">
                      {t('addVehicle.photo')} ({t('common.optional')})
                    </label>
                    <label className="upload-zone compact-upload vehicle-upload-preview">
                      {photo ? (
                        <img src={URL.createObjectURL(photo)} alt={t('addVehicle.preview')} />
                      ) : (
                        <>
                          <Camera size={22} />
                          <span>{t('addVehicle.optionalPhoto')}</span>
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
                        {t('addVehicle.removePhoto')}
                      </button>
                    )}
                  </div>
                  {error && <p className="error-msg">{error}</p>}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>
                      {t('common.back')}
                    </button>
                    <button type="submit" className="btn btn-solid" style={{ flex: 1 }} disabled={saving}>
                      {saving ? (
                        <>
                          <Loader2 size={15} className="spinning" /> {t('common.saving')}
                        </>
                      ) : (
                        t('addVehicle.title')
                      )}
                    </button>
                  </div>
                </motion.form>
              )}

              {step === 3 && (
                <motion.div
                  key="s3"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  style={{ textAlign: 'center' }}
                >
                  <div style={{ color: 'var(--color-verified)', marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
                    <Check size={48} />
                  </div>
                  <h3 className="display" style={{ fontSize: 24 }}>
                    {t('addVehicle.added')}
                  </h3>
                  <p className="muted" style={{ margin: '12px 0 24px' }}>
                    {t('addVehicle.addedDesc')}
                  </p>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button type="button" className="btn btn-solid" onClick={handleClose}>
                      {t('common.done')}
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
