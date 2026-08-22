import { FormEvent, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Camera, Loader2, Trash2 } from 'lucide-react';
import { api } from '../api';
import { POPULAR_CAR_MODELS, POPULAR_MAKES } from '../lib/carData';
import { useLanguage } from '../i18n/LanguageContext';
import { useToast } from './ui/Toast';
import { useOverlayPanel } from '../hooks/useOverlayPanel';
import Portal from './ui/Portal';
import { vehiclePhotoSrc } from '../lib/vehiclePhoto';
import type { Vehicle } from '../types';

const VIN_MAX_LENGTH = 32;

interface Props {
  vehicle: Vehicle | null;
  onClose: () => void;
  onSaved: (v: Vehicle) => void;
  onDeleted: (id: string) => void;
}

export default function EditVehicleModal({ vehicle, onClose, onSaved, onDeleted }: Props) {
  const toast = useToast();
  const { t } = useLanguage();
  const open = vehicle !== null;

  const [nickname, setNickname] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [mileage, setMileage] = useState('');
  const [vin, setVin] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!vehicle) return;
    setNickname(vehicle.nickname ?? '');
    setMake(vehicle.make);
    setModel(vehicle.model);
    setYear(String(vehicle.year));
    setMileage(String(vehicle.mileage));
    setVin(vehicle.vin ?? '');
    setSerialNumber(vehicle.serialNumber ?? '');
    setPhoto(null);
    setPhotoPreview(null);
    setRemovePhoto(false);
    setError('');
    setConfirmDelete(false);
    setDeleting(false);
    setSaving(false);
  }, [vehicle]);

  useOverlayPanel(open, onClose);

  const vinLocked = Boolean(vehicle?.vin);

  function onPickPhoto(file: File | null) {
    setPhoto(file);
    if (file) setRemovePhoto(false);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    if (file && file.type.startsWith('image/')) {
      setPhotoPreview(URL.createObjectURL(file));
    } else {
      setPhotoPreview(null);
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!vehicle) return;
    if (!make.trim() || !model.trim()) {
      setError(t('editVehicle.makeModelRequired'));
      return;
    }
    const parsedMileage = Number(mileage);
    if (!Number.isFinite(parsedMileage) || parsedMileage < 0) {
      setError(t('editVehicle.mileageInvalid'));
      return;
    }
    if (vinLocked && !vin.trim()) {
      setError(t('editVehicle.vinNoClear'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      const form = new FormData();
      form.append('nickname', nickname.trim());
      form.append('make', make.trim());
      form.append('model', model.trim());
      form.append('year', year);
      form.append('mileage', mileage);
      if (vinLocked) {
        form.append('vin', (vin.trim() || vehicle.vin || '').toUpperCase());
      } else if (vin.trim()) {
        form.append('vin', vin.trim().toUpperCase());
      }
      if (serialNumber.trim()) form.append('serialNumber', serialNumber.trim().toUpperCase());
      if (photo) form.append('photo', photo);
      else if (removePhoto) form.append('removePhoto', 'true');
      const { vehicle: updated } = await api.updateVehicle(vehicle.id, form);
      onSaved(updated);
      toast.success(t('editVehicle.updated'));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('editVehicle.updateFailed'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!vehicle || deleting) return;
    setDeleting(true);
    try {
      const result = await api.deleteVehicle(vehicle.id);
      onDeleted(vehicle.id);
      const archived = result && typeof result === 'object' && 'archived' in result && result.archived;
      toast.success(archived ? t('editVehicle.deletedToast') : t('editVehicle.removedToast'));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('editVehicle.removeFailed'));
    } finally {
      setDeleting(false);
    }
  }

  if (!open || !vehicle) return null;

  const hasStoredPhoto = Boolean(vehicle.photoPath || vehicle.photoUrl);
  const showStoredPhoto = hasStoredPhoto && !removePhoto && !photoPreview;
  const currentPhotoSrc = vehiclePhotoSrc(vehicle);

  return (
    <Portal>
    <div className="overlay" onClick={onClose}>
      <motion.div
        className="modal modal-vehicle"
        role="dialog"
        aria-modal="true"
        aria-label={t('editVehicle.title')}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 className="display" style={{ fontSize: 26 }}>
                {t('editVehicle.title')}
              </h2>
              <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                {vehicle.year} {vehicle.make} {vehicle.model}
              </p>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label={t('common.close')}>
              <X size={16} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSave}>
          <div style={{ padding: 24 }}>
            <div className="field">
              <label className="label">
                {t('editVehicle.nickname')} ({t('common.optional')})
              </label>
              <input
                className="input"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={40}
              />
            </div>
            <div className="grid-form-2">
              <div className="field">
                <label className="label">{t('editVehicle.make')}</label>
                <input
                  className="input"
                  list="ev-makes"
                  value={make}
                  onChange={(e) => {
                    setMake(e.target.value);
                    if (!POPULAR_CAR_MODELS[e.target.value]) setModel('');
                  }}
                  required
                />
                <datalist id="ev-makes">
                  {POPULAR_MAKES.map((n) => (
                    <option key={n} value={n} />
                  ))}
                </datalist>
              </div>
              <div className="field">
                <label className="label">{t('editVehicle.model')}</label>
                <input
                  className="input"
                  list="ev-models"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  required
                />
                <datalist id="ev-models">
                  {(POPULAR_CAR_MODELS[make] || []).map((n) => (
                    <option key={n} value={n} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="grid-form-2">
              <div className="field">
                <label className="label">{t('editVehicle.year')}</label>
                <input className="input input-mono" type="number" value={year} onChange={(e) => setYear(e.target.value)} required />
              </div>
              <div className="field">
                <label className="label">{t('editVehicle.mileage')}</label>
                <input
                  className="input input-mono"
                  type="number"
                  min={0}
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="field">
              <label className="label">{vinLocked ? t('editVehicle.vinLocked') : t('editVehicle.vinOptional')}</label>
              <input
                className="input input-vin"
                value={vin}
                onChange={(e) => {
                  if (vinLocked) return;
                  setVin(e.target.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, ''));
                }}
                readOnly={vinLocked}
                maxLength={VIN_MAX_LENGTH}
                size={VIN_MAX_LENGTH}
                style={{ opacity: vinLocked ? 0.85 : 1 }}
                title={vinLocked ? t('editVehicle.vinNoClear') : undefined}
                autoComplete="off"
                spellCheck={false}
                inputMode="text"
              />
              {vinLocked && (
                <p className="mono muted" style={{ fontSize: 11, marginTop: 4 }}>
                  {t('editVehicle.vinNoClear')}
                </p>
              )}
            </div>
            <div className="field">
              <label className="label">
                {t('editVehicle.serial')} ({t('common.optional')})
              </label>
              <input
                className="input input-mono"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value.toUpperCase())}
                style={{ textTransform: 'uppercase' }}
              />
            </div>

            <div className="field">
              <label className="label">
                {t('editVehicle.updatePhoto')} ({t('common.optional')})
              </label>
              <label className="upload-zone compact-upload" style={{ cursor: 'pointer' }}>
                {photoPreview ? (
                  <img src={photoPreview} alt={t('common.preview')} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8 }} />
                ) : showStoredPhoto && currentPhotoSrc ? (
                  <img
                    src={currentPhotoSrc}
                    alt={t('editVehicle.currentPhotoAlt')}
                    style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, opacity: 0.6 }}
                  />
                ) : (
                  <Camera size={20} />
                )}
                <span style={{ fontSize: 13 }}>
                  {photo ? photo.name : removePhoto ? t('editVehicle.noPhoto') : t('editVehicle.changePhoto')}
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  style={{ display: 'none' }}
                  onChange={(e) => onPickPhoto(e.target.files?.[0] ?? null)}
                />
              </label>
              {photo && (
                <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 6 }} onClick={() => onPickPhoto(null)}>
                  {t('editVehicle.removeNew')}
                </button>
              )}
              {hasStoredPhoto && !photo && (
                <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                  {!removePhoto ? (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRemovePhoto(true)}>
                      {t('editVehicle.deletePhoto')}
                    </button>
                  ) : (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRemovePhoto(false)}>
                      {t('editVehicle.keepPhoto')}
                    </button>
                  )}
                </div>
              )}
            </div>

            {error && <p className="error-msg">{error}</p>}

            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button type="submit" className="btn btn-solid" style={{ flex: 1 }} disabled={saving || deleting}>
                {saving ? (
                  <>
                    <Loader2 size={15} className="spinning" /> {t('common.saving')}
                  </>
                ) : (
                  t('editVehicle.save')
                )}
              </button>
              <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving || deleting}>
                {t('common.cancel')}
              </button>
            </div>

            <div style={{ marginTop: 20, borderTop: '1px solid var(--color-border)', paddingTop: 18 }}>
              {!confirmDelete ? (
                <button type="button" className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(true)} disabled={deleting}>
                  <Trash2 size={14} /> {t('editVehicle.delete')}
                </button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <p className="muted" style={{ fontSize: 13, margin: 0 }}>
                    {t('editVehicle.deleteHint')}
                  </p>
                  <button type="button" className="btn btn-danger btn-sm" onClick={handleDelete} disabled={deleting}>
                    {deleting ? (
                      <>
                        <Loader2 size={14} className="spinning" /> {t('editVehicle.deleting')}
                      </>
                    ) : (
                      t('editVehicle.confirmDelete')
                    )}
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(false)}>
                    {t('common.cancel')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </form>
      </motion.div>
    </div>
    </Portal>
  );
}
