import { FormEvent, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Camera, Loader2, Trash2 } from 'lucide-react';
import { api } from '../api';
import { POPULAR_CAR_MODELS, POPULAR_MAKES } from '../lib/carData';
import { useToast } from './ui/Toast';
import { useOverlayPanel } from '../hooks/useOverlayPanel';
import type { Vehicle } from '../types';

type Visibility = 'PUBLIC' | 'PRIVATE' | 'PARTNER_ONLY';

interface Props {
  vehicle: Vehicle | null;
  onClose: () => void;
  onSaved: (v: Vehicle) => void;
  onDeleted: (id: string) => void;
}

export default function EditVehicleModal({ vehicle, onClose, onSaved, onDeleted }: Props) {
  const toast = useToast();
  const open = vehicle !== null;

  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [mileage, setMileage] = useState('');
  const [vin, setVin] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('PRIVATE');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!vehicle) return;
    setMake(vehicle.make);
    setModel(vehicle.model);
    setYear(String(vehicle.year));
    setMileage(String(vehicle.mileage));
    setVin(vehicle.vin ?? '');
    setSerialNumber(vehicle.serialNumber ?? '');
    setVisibility((vehicle.visibility as Visibility) ?? 'PRIVATE');
    setPhoto(null);
    setPhotoPreview(null);
    setError('');
    setConfirmDelete(false);
  }, [vehicle]);

  useOverlayPanel(open, onClose);

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
      setError('Make and model are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const form = new FormData();
      form.append('make', make.trim());
      form.append('model', model.trim());
      form.append('year', year);
      form.append('mileage', mileage);
      if (vin.trim()) form.append('vin', vin.trim().toUpperCase());
      if (serialNumber.trim()) form.append('serialNumber', serialNumber.trim().toUpperCase());
      form.append('visibility', visibility);
      if (photo) form.append('photo', photo);
      const { vehicle: updated } = await api.updateVehicle(vehicle.id, form);
      onSaved(updated);
      toast.success('Vehicle updated');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update vehicle');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!vehicle) return;
    setDeleting(true);
    try {
      await api.deleteVehicle(vehicle.id);
      onDeleted(vehicle.id);
      toast.success('Vehicle deleted');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete vehicle');
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
        aria-label="Edit vehicle"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 className="display" style={{ fontSize: 26 }}>Edit vehicle</h2>
              <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                {vehicle.year} {vehicle.make} {vehicle.model}
              </p>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">
              <X size={16} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSave}>
          <div style={{ padding: 24 }}>
            <div className="grid-form-2">
              <div className="field">
                <label className="label">Make</label>
                <input
                  className="input"
                  list="ev-makes"
                  value={make}
                  onChange={(e) => { setMake(e.target.value); if (!POPULAR_CAR_MODELS[e.target.value]) setModel(''); }}
                  required
                />
                <datalist id="ev-makes">
                  {POPULAR_MAKES.map((n) => <option key={n} value={n} />)}
                </datalist>
              </div>
              <div className="field">
                <label className="label">Model</label>
                <input
                  className="input"
                  list="ev-models"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  required
                />
                <datalist id="ev-models">
                  {(POPULAR_CAR_MODELS[make] || []).map((n) => <option key={n} value={n} />)}
                </datalist>
              </div>
            </div>

            <div className="grid-form-2">
              <div className="field">
                <label className="label">Year</label>
                <input className="input input-mono" type="number" value={year} onChange={(e) => setYear(e.target.value)} required />
              </div>
              <div className="field">
                <label className="label">Mileage (km)</label>
                <input className="input input-mono" type="number" value={mileage} onChange={(e) => setMileage(e.target.value)} required />
              </div>
            </div>

            <div className="grid-form-2">
              <div className="field">
                <label className="label">VIN (optional)</label>
                <input className="input input-mono" value={vin} onChange={(e) => setVin(e.target.value.toUpperCase())} maxLength={17} style={{ textTransform: 'uppercase' }} />
              </div>
              <div className="field">
                <label className="label">N° série (optional)</label>
                <input className="input input-mono" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value.toUpperCase())} style={{ textTransform: 'uppercase' }} />
              </div>
            </div>

            <div className="field">
              <label className="label">Visibility</label>
              <select className="input" value={visibility} onChange={(e) => setVisibility(e.target.value as Visibility)}>
                <option value="PRIVATE">Private — link only</option>
                <option value="PUBLIC">Public listing — VIN visible</option>
                <option value="PARTNER_ONLY">Partner only — insurer / dealer</option>
              </select>
            </div>

            <div className="field">
              <label className="label">Update photo (optional)</label>
              <label className="upload-zone compact-upload" style={{ cursor: 'pointer' }}>
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8 }} />
                ) : vehicle.photoUrl ? (
                  <img src={vehicle.photoUrl} alt="Current" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, opacity: 0.6 }} />
                ) : (
                  <Camera size={20} />
                )}
                <span style={{ fontSize: 13 }}>{photo ? photo.name : 'Click to change photo'}</span>
                <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" style={{ display: 'none' }} onChange={(e) => onPickPhoto(e.target.files?.[0] ?? null)} />
              </label>
              {photo && (
                <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 6 }} onClick={() => onPickPhoto(null)}>
                  Remove new photo
                </button>
              )}
            </div>

            {error && <p className="error-msg">{error}</p>}

            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button type="submit" className="btn btn-solid" style={{ flex: 1 }} disabled={saving || deleting}>
                {saving ? <><Loader2 size={15} className="spinning" /> Saving…</> : 'Save changes'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving || deleting}>
                Cancel
              </button>
            </div>

            <div style={{ marginTop: 20, borderTop: '1px solid var(--color-border)', paddingTop: 18 }}>
              {!confirmDelete ? (
                <button type="button" className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(true)} disabled={deleting}>
                  <Trash2 size={14} /> Delete vehicle
                </button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <p className="muted" style={{ fontSize: 13, margin: 0 }}>This will permanently delete the vehicle and all its records.</p>
                  <button type="button" className="btn btn-danger btn-sm" onClick={handleDelete} disabled={deleting}>
                    {deleting ? <><Loader2 size={14} className="spinning" /> Deleting…</> : 'Yes, delete'}
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(false)}>
                    Cancel
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
