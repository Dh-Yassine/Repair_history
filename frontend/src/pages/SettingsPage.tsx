import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Bell, CreditCard, KeyRound, UserRound } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { isSupabaseAuthEnabled, supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import PageTransition from '../components/layout/PageTransition';
import type { VehicleLimits } from '../types';

export default function SettingsPage() {
  const { user, refreshUser, logout } = useAuth();
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
      toast.error('Name cannot be empty');
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
      toast.success('Profile saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save profile');
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword(e: FormEvent) {
    e.preventDefault();
    setPasswordError('');
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
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
      toast.success('Password updated');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Password change failed');
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
      toast.error(err instanceof Error ? err.message : 'Could not save preferences');
    }
  }

  async function deleteAccount() {
    setDeleteError('');
    if (deleteConfirm !== 'DELETE') {
      setDeleteError('Type DELETE in capitals to confirm.');
      return;
    }
    setDeleting(true);
    try {
      const result = await api.deleteAccount();
      const msg =
        result && 'message' in (result as object) && (result as { message?: string }).message
          ? (result as { message: string }).message
          : 'Your account has been deleted.';
      toast.success(msg);
      logout();
      navigate('/', { replace: true });
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Account deletion failed');
      setDeleting(false);
    }
  }

  const plan = user?.subscriptionType ?? 'free';

  return (
    <PageTransition>
      <h1 className="display" style={{ fontSize: 40, marginBottom: 8 }}>
        Settings
      </h1>
      <p className="muted" style={{ marginBottom: 24 }}>
        Profile, security, notifications, and plan for {user?.email}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 640 }}>
        <section className="card">
          <h2 className="display" style={{ fontSize: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserRound size={18} /> Profile
          </h2>
          <form onSubmit={saveProfile} style={{ marginTop: 16 }}>
            <div className="field">
              <label className="label" htmlFor="settings-name">Full name</label>
              <input
                id="settings-name"
                className="input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="settings-phone">Phone</label>
              <input
                id="settings-phone"
                className="input"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Optional"
              />
            </div>
            {isShop && (
              <>
                <div className="field">
                  <label className="label" htmlFor="settings-shopname">Shop name</label>
                  <input
                    id="settings-shopname"
                    className="input"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label className="label" htmlFor="settings-address">Address</label>
                  <input
                    id="settings-address"
                    className="input"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street, city"
                  />
                </div>
              </>
            )}
            <div className="field">
              <label className="label">Email</label>
              <input className="input" value={user?.email ?? ''} disabled />
              <p className="mono subtle" style={{ fontSize: 11, marginTop: 4 }}>
                Email is your sign-in identifier and cannot be changed here.
              </p>
            </div>
            <button type="submit" className="btn btn-solid" disabled={savingProfile}>
              {savingProfile ? 'Saving…' : 'Save profile'}
            </button>
          </form>
        </section>

        <section className="card">
          <h2 className="display" style={{ fontSize: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <KeyRound size={18} /> Password
          </h2>
          <form onSubmit={savePassword} style={{ marginTop: 16 }}>
            {!supabaseAuth && (
              <div className="field">
                <label className="label" htmlFor="settings-current-pass">Current password</label>
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
                <label className="label" htmlFor="settings-new-pass">New password</label>
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
                <label className="label" htmlFor="settings-confirm-pass">Confirm new password</label>
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
              {savingPassword ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </section>

        <section className="card">
          <h2 className="display" style={{ fontSize: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell size={18} /> Notifications
          </h2>
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={(e) => saveNotifications({ email: e.target.checked })}
              />
              <span>
                Email notifications
                <span className="muted" style={{ display: 'block', fontSize: 13 }}>
                  Service reminders and verification updates by email
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
                In-app notifications
                <span className="muted" style={{ display: 'block', fontSize: 13 }}>
                  Alerts in the notification bell inside the app
                </span>
              </span>
            </label>
          </div>
        </section>

        <section className="card">
          <h2 className="display" style={{ fontSize: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CreditCard size={18} /> Plan
          </h2>
          <div style={{ marginTop: 16 }}>
            <p>
              Current plan: <span className="tag">{plan === 'free' ? 'Free' : plan}</span>
            </p>
            {isOwner && limits && (
              <p className="muted" style={{ marginTop: 8, fontSize: 14 }}>
                {limits.count} of {limits.max} vehicles used
                {limits.count >= limits.max && plan === 'free' && ' — you have reached the free limit'}
              </p>
            )}
            <p className="muted" style={{ marginTop: 8, fontSize: 13 }}>
              The free plan includes {isOwner ? 'up to 3 vehicles, service logging, and share links' : 'all current features'}.
            </p>
            <a
              className="btn btn-outline btn-sm"
              style={{ marginTop: 12, display: 'inline-flex' }}
              href={`mailto:upgrade@autohistory.app?subject=Plan upgrade request&body=Account: ${user?.email}`}
            >
              Contact us about a larger plan
            </a>
          </div>
        </section>

        <section className="card" style={{ borderColor: 'var(--color-danger, #b3261e)' }}>
          <h2
            className="display"
            style={{ fontSize: 20, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-danger, #b3261e)' }}
          >
            <AlertTriangle size={18} /> Delete account
          </h2>
          <p className="muted" style={{ marginTop: 12, fontSize: 14 }}>
            If any of your vehicles has shared or shop-verified history, your personal details are
            anonymized and the shared timelines stay available to buyers who already have the link.
            Otherwise the account and its data are removed entirely. This cannot be undone.
          </p>
          <div className="field" style={{ marginTop: 16 }}>
            <label className="label" htmlFor="settings-delete-confirm">Type DELETE to confirm</label>
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
            {deleting ? 'Deleting…' : 'Delete my account'}
          </button>
        </section>
      </div>
    </PageTransition>
  );
}
