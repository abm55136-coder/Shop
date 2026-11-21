import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface Props {
  compact?: boolean;
  onOpenInstallGuide?: () => void;
}

export const PWAInstallButton: React.FC<Props> = ({ compact = false, onOpenInstallGuide }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  const handleClick = async () => {
    if (isInstallable) {
      await install();
      return;
    }
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }
    if (onOpenInstallGuide) {
      onOpenInstallGuide();
    } else {
      setShowIOSGuide(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-label="Install Sitara Cloth House App"
        className={
          compact
            ? 'inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 text-xs font-medium hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors whitespace-nowrap shrink-0'
            : 'inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0'
        }
      >
        {isInstallable ? <Download className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
        <span>{isInstallable ? 'Install App' : 'Get Mobile App'}</span>
      </button>

      {showIOSGuide && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Home Screen Installation Guide"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                Add to Phone Home Screen
              </h2>
              <button
                type="button"
                aria-label="Close installation guide"
                onClick={() => setShowIOSGuide(false)}
                className="p-2 rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {isIOS ? (
              <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                1. Tap the <strong>Share</strong> icon in Safari.<br />
                2. Scroll down and tap <strong>Add to Home Screen</strong>.<br />
                3. Open Sitara Cloth House directly from your home screen.
              </p>
            ) : (
              <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                1. Open Chrome menu (three dots) on Android.<br />
                2. Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.<br />
                3. Grants camera access for QR scanning and works offline.
              </p>
            )}
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 rounded-xl bg-emerald-800 text-white text-sm font-medium hover:bg-emerald-700"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
};
