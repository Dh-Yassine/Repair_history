import { FormEvent, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Camera, Loader2, Trash2 } from 'lucide-react';
import { api } from '../api';
import { POPULAR_CAR_MODELS, POPULAR_MAKES } from '../lib/carData';
import { useLanguage } from '../i18n/LanguageContext';
import { useToast } from './ui/Toast';
import { useOverlayPanel } from '../hooks/useOverlayPanel';
import type { Vehicle } from '../types';

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
    setError('');
    setConfirmDelete(false);
  }, [vehicle]);

  useOverlayPanel(open, onClose);

  const vinLocked = Boolean(vehicle?.vin);

  function onPickPhoto(file: File | null) {
    setPhoto(file);
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
    if (!vehicle) return;
    setDeleting(true);
    try {
      const result = await api.deleteVehicle(vehicle.id);
      onDeleted(vehicle.id);
      const archived = result && typeof result === 'object' && 'archived' in result && result.archived;
      toast.success(archived ? t('editVehicle.archivedToast') : t('editVehicle.removedToast'));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('editVehicle.removeFailed'));
      setDeleting(false);
    }
  }

  if (!open || !vehicle) return null;

  return (
    <div className="overlay" onClick={onClose}>
      <motion.div
        className="modal"
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

            <div className="grid-form-2">
              <div className="field">
                <label className="label">{vinLocked ? t('editVehicle.vinLocked') : t('editVehicle.vinOptional')}</label>
                <input
                  className="input input-mono"
                  value={vin}
                  onChange={(e) => {
                    if (vinLocked) return;
                    setVin(e.target.value.toUpperCase());
                  }}
                  readOnly={vinLocked}
                  maxLength={17}
                  style={{ textTransform: 'uppercase', opacity: vinLocked ? 0.85 : 1 }}
                  title={vinLocked ? t('editVehicle.vinNoClear') : undefined}
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
            </div>

            <div className="field">
              <label className="label">
                {t('editVehicle.updatePhoto')} ({t('common.optional')})
              </label>
              <label className="upload-zone compact-upload" style={{ cursor: 'pointer' }}>
                {photoPreview ? (
                  <img src={photoPreview} alt={t('common.preview')} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8 }} />
                ) : vehicle.photoUrl ? (
                  <img
                    src={vehicle.photoUrl}
                    alt={t('editVehicle.currentPhotoAlt')}
                    style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, opacity: 0.6 }}
                  />
                ) : (
                  <Camera size={20} />
                )}
                <span style={{ fontSize: 13 }}>{photo ? photo.name : t('editVehicle.changePhoto')}</span>
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
                  <Trash2 size={14} /> {t('editVehicle.archive')}
                </button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <p className="muted" style={{ fontSize: 13, margin: 0 }}>
                    {t('editVehicle.archiveHint')}
                  </p>
                  <button type="button" className="btn btn-danger btn-sm" onClick={handleDelete} disabled={deleting}>
                    {deleting ? (
                      <>
                        <Loader2 size={14} className="spinning" /> {t('editVehicle.archiving')}
                      </>
                    ) : (
                      t('editVehicle.confirmArchive')
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
  );
}
