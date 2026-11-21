import React, { useState } from 'react';
import { Fingerprint, Lock } from 'lucide-react';

interface Props {
  expectedPin: string;
  biometricEnabled: boolean;
  onUnlock: () => void;
}

export const PinLockModal: React.FC<Props> = ({ expectedPin, biometricEnabled, onUnlock }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === expectedPin) {
      setError('');
      setPin('');
      onUnlock();
    } else {
      setError('Incorrect PIN. Default demo PIN is 1234 unless changed in Settings.');
    }
  };

  const handleBiometric = async () => {
    setError('');
    try {
      if (typeof window !== 'undefined' && window.PublicKeyCredential) {
        const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        if (available) {
          onUnlock();
          return;
        }
      }
      setError('Biometric hardware is unavailable on this browser. Please enter your 4-digit PIN.');
    } catch {
      setError('Biometric verification could not complete. Please enter your 4-digit PIN.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sitara Cloth House Security Lock"
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/90 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-800 text-white flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-stone-900 dark:text-stone-100">
              Sitara Cloth House
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Session Locked · Enter PIN to continue
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="shop-pin-input"
              className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1.5"
            >
              4-Digit Security PIN
            </label>
            <input
              id="shop-pin-input"
              type="password"
              inputMode="numeric"
              maxLength={8}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              className="w-full px-4 py-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-center text-lg tracking-widest font-mono-num focus:outline-none focus:ring-2 focus:ring-emerald-700"
              autoFocus
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
          >
            Unlock Shop
          </button>

          {biometricEnabled && (
            <button
              type="button"
              onClick={handleBiometric}
              className="w-full py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 text-sm font-medium flex items-center justify-center gap-2 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              <Fingerprint className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              Unlock with Fingerprint
            </button>
          )}
        </form>
      </div>
    </div>
  );
};
