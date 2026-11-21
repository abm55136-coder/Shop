import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import {
  Cloud,
  Download,
  Fingerprint,
  Lock,
  LogIn,
  LogOut,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Upload,
} from 'lucide-react';
import type { Language, ShopProfile, ShopState, ThemeMode } from '../types/shop';
import { TRANSLATIONS } from '../i18n/translations';
import { buildWhatsAppUrl } from '../utils/shopLogic';
import { PWAInstallButton } from './PWAInstallButton';

interface Props {
  state: ShopState;
  language: Language;
  theme: ThemeMode;
  firebaseUser: User | null;
  onChangeLanguage: (lang: Language) => void;
  onChangeTheme: (theme: ThemeMode) => void;
  onUpdateProfile: (next: ShopProfile) => void;
  onRestoreFullState: (next: ShopState) => void;
  onGoogleSignIn: () => Promise<void>;
  onGoogleSignOut: () => Promise<void>;
  onCloudBackup: () => Promise<void>;
  onCloudRestore: () => Promise<void>;
  onLockNow: () => void;
}

export const SettingsCloudView: React.FC<Props> = ({
  state,
  language,
  theme,
  firebaseUser,
  onChangeLanguage,
  onChangeTheme,
  onUpdateProfile,
  onRestoreFullState,
  onGoogleSignIn,
  onGoogleSignOut,
  onCloudBackup,
  onCloudRestore,
  onLockNow,
}) => {
  const t = TRANSLATIONS[language];
  const [syncMessage, setSyncMessage] = useState('');
  const [syncBusy, setSyncBusy] = useState(false);
  const [pinInput, setPinInput] = useState(state.profile.pinHash || '1234');
  const [permStatus, setPermStatus] = useState('');

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sitara-cloth-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setSyncMessage('Backup JSON saved to device storage.');
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as ShopState;
        if (parsed && Array.isArray(parsed.products) && Array.isArray(parsed.invoices)) {
          onRestoreFullState(parsed);
          setSyncMessage('Business records restored from backup file.');
        } else {
          setSyncMessage('Invalid backup file structure.');
        }
      } catch {
        setSyncMessage('Could not parse backup file.');
      }
    };
    reader.readAsText(file);
  };

  const runCloudAction = async (fn: () => Promise<void>, successText: string) => {
    setSyncBusy(true);
    setSyncMessage('');
    try {
      await fn();
      setSyncMessage(successText);
    } catch (err) {
      setSyncMessage(err instanceof Error ? err.message : 'Cloud operation failed.');
    } finally {
      setSyncBusy(false);
    }
  };

  const handleCheckCameraMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((tr) => tr.stop());
      setPermStatus('Camera permission granted for mobile QR scanning.');
    } catch {
      setPermStatus('Camera access unavailable or blocked in this preview; manual QR input remains active.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      {/* Cloud Backup & Sync + Phone Storage */}
      <section className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100 inline-flex items-center gap-2">
            <Cloud className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
            {t.cloudBackupTitle}
          </h2>
          {state.profile.lastBackupAt && (
            <span className="text-xs text-stone-500 dark:text-stone-400 font-mono-num">
              Synced {new Date(state.profile.lastBackupAt).toLocaleTimeString('en-PK')}
            </span>
          )}
        </div>

        <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/70 space-y-3">
          {firebaseUser ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                  {firebaseUser.displayName || 'Authorized Shop Owner'}
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {firebaseUser.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => runCloudAction(onGoogleSignOut, 'Signed out from cloud sync.')}
                className="px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 text-xs font-medium inline-flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-stone-600 dark:text-stone-300 max-w-xs">
                Sign in with Google to synchronize products, Khata, invoices, and expenses across devices.
              </p>
              <button
                type="button"
                disabled={syncBusy}
                onClick={() => runCloudAction(onGoogleSignIn, 'Signed in to Firebase Cloud Sync.')}
                className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-medium inline-flex items-center gap-1.5"
              >
                <LogIn className="w-4 h-4" />
                Connect Google Cloud
              </button>
            </div>
          )}

          {firebaseUser && (
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                disabled={syncBusy}
                onClick={() =>
                  runCloudAction(onCloudBackup, 'All shop records backed up to Firestore Cloud.')
                }
                className="flex-1 min-h-[40px] px-3 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-medium inline-flex items-center justify-center gap-1.5"
              >
                <Cloud className="w-4 h-4" />
                Backup Now
              </button>
              <button
                type="button"
                disabled={syncBusy}
                onClick={() =>
                  runCloudAction(onCloudRestore, 'Shop records restored from Cloud.')
                }
                className="flex-1 min-h-[40px] px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-medium inline-flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-4 h-4" />
                Restore from Cloud
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={handleExportJson}
            className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-medium inline-flex items-center justify-center gap-2 hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <Download className="w-4 h-4" />
            Save Backup to Phone
          </button>
          <label className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-medium inline-flex items-center justify-center gap-2 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer">
            <Upload className="w-4 h-4" />
            Restore Local File
            <input type="file" accept="application/json" onChange={handleImportJson} className="sr-only" />
          </label>
        </div>

        {syncMessage && (
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
            {syncMessage}
          </p>
        )}
      </section>

      {/* Advanced Security & Privacy */}
      <section className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100 inline-flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
            {t.securityTitle}
          </h2>
          {state.profile.pinEnabled && (
            <button
              type="button"
              onClick={onLockNow}
              className="px-3 py-1.5 rounded-lg bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-medium inline-flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              Lock Now
            </button>
          )}
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-stone-900 dark:text-stone-100">PIN Lock Screen</p>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Protect private profit reports and financial records
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={state.profile.pinEnabled}
              onClick={() =>
                onUpdateProfile({
                  ...state.profile,
                  pinEnabled: !state.profile.pinEnabled,
                  pinHash: pinInput || '1234',
                })
              }
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                state.profile.pinEnabled
                  ? 'bg-emerald-800 text-white'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
              }`}
            >
              {state.profile.pinEnabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="set-shop-pin" className="text-xs text-stone-600 dark:text-stone-400">
              Shop PIN:
            </label>
            <input
              id="set-shop-pin"
              type="password"
              inputMode="numeric"
              maxLength={8}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              className="w-28 px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm font-mono-num"
            />
            <button
              type="button"
              onClick={() =>
                onUpdateProfile({ ...state.profile, pinHash: pinInput || '1234' })
              }
              className="px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 text-xs font-medium"
            >
              Update PIN
            </button>
          </div>

          <div className="flex items-center justify-between gap-4 pt-2 border-t border-stone-100 dark:border-stone-800">
            <div className="inline-flex items-center gap-2">
              <Fingerprint className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <div>
                <p className="font-medium text-stone-900 dark:text-stone-100">
                  Fingerprint Security
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Supported Android &amp; biometric devices
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={state.profile.biometricEnabled}
              onClick={() =>
                onUpdateProfile({
                  ...state.profile,
                  biometricEnabled: !state.profile.biometricEnabled,
                })
              }
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                state.profile.biometricEnabled
                  ? 'bg-emerald-800 text-white'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
              }`}
            >
              {state.profile.biometricEnabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>
        </div>
      </section>

      {/* Multi-Language, Light/Dark Theme & WhatsApp Contact */}
      <section className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-5 space-y-4">
        <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
          Language, Display &amp; WhatsApp Business
        </h2>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mb-1.5">{t.languageLabel}</p>
            <div className="flex gap-1 p-1 rounded-xl bg-stone-100 dark:bg-stone-800">
              <button
                type="button"
                onClick={() => onChangeLanguage('en')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium ${
                  language === 'en' ? 'bg-white dark:bg-stone-900 shadow-sm' : 'text-stone-500'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => onChangeLanguage('ur')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium ${
                  language === 'ur' ? 'bg-white dark:bg-stone-900 shadow-sm' : 'text-stone-500'
                }`}
              >
                اردو
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mb-1.5">{t.themeLabel}</p>
            <div className="flex gap-1 p-1 rounded-xl bg-stone-100 dark:bg-stone-800">
              <button
                type="button"
                onClick={() => onChangeTheme('light')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium ${
                  theme === 'light' ? 'bg-white dark:bg-stone-900 shadow-sm' : 'text-stone-500'
                }`}
              >
                {t.lightMode}
              </button>
              <button
                type="button"
                onClick={() => onChangeTheme('dark')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium ${
                  theme === 'dark' ? 'bg-white dark:bg-stone-900 shadow-sm' : 'text-stone-500'
                }`}
              >
                {t.darkMode}
              </button>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-stone-900 dark:text-stone-100">
              Official Shop Contact
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400 font-mono-num">
              {state.profile.phone} · {state.profile.email}
            </p>
          </div>
          <a
            href={buildWhatsAppUrl(
              state.profile.phone,
              'Assalam-o-Alaikum Sitara Cloth House! Connecting via Smart Billing App.'
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 rounded-xl border border-emerald-700 text-emerald-800 dark:text-emerald-300 text-xs font-medium inline-flex items-center gap-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
          >
            <MessageCircle className="w-4 h-4" />
            WhatsApp Support
          </a>
        </div>
      </section>

      {/* Easy Android & Mobile App Installation */}
      <section className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-5 space-y-4">
        <div className="flex items-center gap-3">
          <img
            src="/src/assets/images/app_icon_emblem_1795234217236.jpg"
            alt="Sitara Cloth House App Icon"
            referrerPolicy="no-referrer"
            className="w-12 h-12 rounded-xl object-cover shrink-0 border border-stone-200 dark:border-stone-700"
          />
          <div>
            <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
              {t.installAppTitle}
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Home-screen icon, offline billing cache &amp; camera QR permissions
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <PWAInstallButton />
          <button
            type="button"
            onClick={handleCheckCameraMic}
            className="min-h-[44px] px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-medium inline-flex items-center gap-2 hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <Smartphone className="w-4 h-4" />
            Verify Camera Permission
          </button>
        </div>

        {permStatus && (
          <p className="text-xs text-stone-600 dark:text-stone-300">{permStatus}</p>
        )}
      </section>
    </div>
  );
};
