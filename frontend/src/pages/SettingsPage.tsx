import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Bell, CreditCard, KeyRound, UserRound } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { isSupabaseAuthEnabled, supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import PageTransition from '../components/layout/PageTransition';
import { useLanguage } from '../i18n/LanguageContext';
import type { VehicleLimits } from '../types';

export default function SettingsPage() {
  const { user, refreshUser, logout } = useAuth();
  const { t } = useLanguage();
  const toast = useToast();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [shopName, setShopName] = useState(user?.shopName ?? '');
  const [address, setAddress] = useState(user?.address ?? '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const [emailNotifications, setEmailNotifications] = useState(user?.emailNotifications ?? true);
  const [inAppNotifications, setInAppNotifications] = useState(user?.inAppNotifications ?? true);

  const [limits, setLimits] = useState<VehicleLimits | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const isShop = user?.role === 'SHOP';
  const isOwner = user?.role === 'OWNER';
  const supabaseAuth = isSupabaseAuthEnabled();

  useEffect(() => {
    if (!isOwner) return;
    api
      .vehicles()
      .then((d) => setLimits(d.limits))
      .catch(() => setLimits(null));
  }, [isOwner]);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error(t('settings.nameRequired'));
      return;
    }
    setSavingProfile(true);
    try {
      await api.updateProfile({
        fullName: fullName.trim(),
        phone: phone.trim(),
        ...(isShop ? { shopName: shopName.trim(), address: address.trim() } : {}),
      });
      await refreshUser();
      toast.success(t('settings.profileSaved'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('settings.saveProfileFailed'));
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword(e: FormEvent) {
    e.preventDefault();
    setPasswordError('');
    if (newPassword.length < 6) {
      setPasswordError(t('settings.passwordTooShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t('settings.passwordMismatch'));
      return;
    }
    setSavingPassword(true);
    try {
      if (supabaseAuth && supabase) {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw new Error(error.message);
      } else {
        await api.changePassword({ currentPassword, newPassword });
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success(t('settings.passwordUpdated'));
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : t('settings.passwordChangeFailed'));
    } finally {
      setSavingPassword(false);
    }
  }

  async function saveNotifications(next: { email?: boolean; inApp?: boolean }) {
    const nextEmail = next.email ?? emailNotifications;
    const nextInApp = next.inApp ?? inAppNotifications;
    setEmailNotifications(nextEmail);
    setInAppNotifications(nextInApp);
    try {
      await api.updateProfile({ emailNotifications: nextEmail, inAppNotifications: nextInApp });
      await refreshUser();
    } catch (err) {
      // revert on failure
      setEmailNotifications(emailNotifications);
      setInAppNotifications(inAppNotifications);
      toast.error(err instanceof Error ? err.message : t('settings.notifsSaveFailed'));
    }
  }

  async function deleteAccount() {
    setDeleteError('');
    if (deleteConfirm !== 'DELETE') {
      setDeleteError(t('settings.typeDelete'));
      return;
    }
    setDeleting(true);
    try {
      const result = await api.deleteAccount();
      const msg =
        result && 'message' in (result as object) && (result as { message?: string }).message
          ? (result as { message: string }).message
          : t('settings.accountDeleted');
      toast.success(msg);
      logout();
      navigate('/', { replace: true });
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : t('settings.deleteFailed'));
      setDeleting(false);
    }
  }

  const plan = user?.subscriptionType ?? 'free';

  return (
    <PageTransition>
      <h1 className="display" style={{ fontSize: 40, marginBottom: 8 }}>
        {t('settings.title')}
      </h1>
      <p className="muted" style={{ marginBottom: 24 }}>
        {t('settings.lead')} · {user?.email}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 640 }}>
        <section className="card">
          <h2 className="display" style={{ fontSize: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserRound size={18} /> {t('settings.profile')}
          </h2>
          <form onSubmit={saveProfile} style={{ marginTop: 16 }}>
            <div className="field">
              <label className="label" htmlFor="settings-name">{t('settings.fullName')}</label>
              <input
                id="settings-name"
                className="input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="settings-phone">{t('settings.phone')}</label>
              <input
                id="settings-phone"
                className="input"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t('common.optional')}
              />
            </div>
            {isShop && (
              <>
                <div className="field">
                  <label className="label" htmlFor="settings-shopname">{t('settings.shopName')}</label>
                  <input
                    id="settings-shopname"
                    className="input"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label className="label" htmlFor="settings-address">{t('settings.address')}</label>
                  <input
                    id="settings-address"
                    className="input"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder={t('settings.addressHint')}
                  />
                </div>
              </>
            )}
            <div className="field">
              <label className="label">{t('auth.email')}</label>
              <input className="input" value={user?.email ?? ''} disabled />
              <p className="mono subtle" style={{ fontSize: 11, marginTop: 4 }}>
                {t('settings.emailHint')}
              </p>
            </div>
            <button type="submit" className="btn btn-solid" disabled={savingProfile}>
              {savingProfile ? t('common.saving') : t('settings.saveProfile')}
            </button>
          </form>
        </section>

        <section className="card">
          <h2 className="display" style={{ fontSize: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <KeyRound size={18} /> {t('settings.password')}
          </h2>
          <form onSubmit={savePassword} style={{ marginTop: 16 }}>
            {!supabaseAuth && (
              <div className="field">
                <label className="label" htmlFor="settings-current-pass">{t('settings.currentPassword')}</label>
                <input
                  id="settings-current-pass"
                  className="input"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="grid-form-2">
              <div className="field">
                <label className="label" htmlFor="settings-new-pass">{t('settings.newPassword')}</label>
                <input
                  id="settings-new-pass"
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label className="label" htmlFor="settings-confirm-pass">{t('settings.confirmPassword')}</label>
                <input
                  id="settings-confirm-pass"
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            {passwordError && <p className="error-msg">{passwordError}</p>}
            <button type="submit" className="btn btn-solid" disabled={savingPassword}>
              {savingPassword ? t('settings.updating') : t('settings.updatePassword')}
            </button>
          </form>
        </section>

        <section className="card">
          <h2 className="display" style={{ fontSize: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell size={18} /> {t('settings.notifications')}
          </h2>
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={(e) => saveNotifications({ email: e.target.checked })}
              />
              <span>
                {t('settings.emailNotifs')}
                <span className="muted" style={{ display: 'block', fontSize: 13 }}>
                  {t('settings.emailNotifsHint')}
                </span>
              </span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={inAppNotifications}
                onChange={(e) => saveNotifications({ inApp: e.target.checked })}
              />
              <span>
                {t('settings.inAppNotifs')}
                <span className="muted" style={{ display: 'block', fontSize: 13 }}>
                  {t('settings.inAppNotifsHint')}
                </span>
              </span>
            </label>
          </div>
        </section>

        <section className="card">
          <h2 className="display" style={{ fontSize: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CreditCard size={18} /> {t('settings.plan')}
          </h2>
          <div style={{ marginTop: 16 }}>
            <p>
              {t('settings.currentPlan')} <span className="tag">{plan === 'free' ? t('common.free') : plan}</span>
            </p>
            {isOwner && limits && (
              <p className="muted" style={{ marginTop: 8, fontSize: 14 }}>
                {t('settings.vehiclesUsed', { n: limits.count, max: limits.max })}
                {limits.count >= limits.max && plan === 'free' && ` ${t('settings.atLimit')}`}
              </p>
            )}
            <p className="muted" style={{ marginTop: 8, fontSize: 13 }}>
              {isOwner ? t('settings.freeIncludes') : t('settings.allFeaturesIncluded')}
            </p>
            <a
              className="btn btn-outline btn-sm"
              style={{ marginTop: 12, display: 'inline-flex' }}
              href={`mailto:upgrade@autohistory.app?subject=Plan upgrade request&body=Account: ${user?.email}`}
            >
              {t('settings.contactLarger')}
            </a>
          </div>
        </section>

        <section className="card" style={{ borderColor: 'var(--color-danger, #b3261e)' }}>
          <h2
            className="display"
            style={{ fontSize: 20, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-danger, #b3261e)' }}
          >
            <AlertTriangle size={18} /> {t('settings.deleteAccount')}
          </h2>
          <p className="muted" style={{ marginTop: 12, fontSize: 14 }}>
            {t('settings.deleteInfo')}
          </p>
          <div className="field" style={{ marginTop: 16 }}>
            <label className="label" htmlFor="settings-delete-confirm">{t('settings.typeDelete')}</label>
            <input
              id="settings-delete-confirm"
              className="input input-mono"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="DELETE"
            />
          </div>
          {deleteError && <p className="error-msg">{deleteError}</p>}
          <button
            type="button"
            className="btn btn-outline"
            style={{ color: 'var(--color-danger, #b3261e)', borderColor: 'var(--color-danger, #b3261e)' }}
            disabled={deleting || deleteConfirm !== 'DELETE'}
            onClick={deleteAccount}
          >
            {deleting ? t('settings.deleting') : t('settings.deleteMyAccount')}
          </button>
        </section>
      </div>
    </PageTransition>
  );
}
