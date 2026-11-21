import React, { useEffect, useRef, useState } from 'react';
import { Camera, QrCode, Search, X } from 'lucide-react';
import type { Product } from '../types/shop';

interface Props {
  isOpen: boolean;
  products: Product[];
  onClose: () => void;
  onMatchProduct: (product: Product) => void;
}

export const QrScannerModal: React.FC<Props> = ({ isOpen, products, onClose, onMatchProduct }) => {
  const [manualCode, setManualCode] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setCameraActive(false);
      return;
    }

    let cancelled = false;
    const startCamera = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (cancelled) return;
        const container = document.getElementById('sitara-qr-reader');
        if (!container) return;
        const scanner = new Html5Qrcode('sitara-qr-reader');
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText) => {
            const matched = products.find(
              (p) =>
                p.qrCode.toLowerCase() === decodedText.trim().toLowerCase() ||
                p.sku.toLowerCase() === decodedText.trim().toLowerCase()
            );
            if (matched) {
              onMatchProduct(matched);
              setStatusMessage(`Scanned: ${matched.name}`);
            } else {
              setStatusMessage(`No matching fabric found for code "${decodedText}"`);
            }
          },
          () => {
            // ignore frame decode errors
          }
        );
        if (!cancelled) setCameraActive(true);
      } catch {
        if (!cancelled) {
          setCameraActive(false);
          setStatusMessage(
            'Live camera unavailable in this browser session. Enter SKU/QR code below or select a quick tag.'
          );
        }
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s) {
        s.stop()
          .then(() => s.clear())
          .catch(() => {});
      }
    };
  }, [isOpen, products, onMatchProduct]);

  if (!isOpen) return null;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = manualCode.trim().toLowerCase();
    if (!query) return;
    const found = products.find(
      (p) =>
        p.qrCode.toLowerCase() === query ||
        p.sku.toLowerCase() === query ||
        p.name.toLowerCase().includes(query)
    );
    if (found) {
      onMatchProduct(found);
      setManualCode('');
      setStatusMessage(`Added ${found.name} to bill.`);
    } else {
      setStatusMessage(`No fabric matched "${manualCode}".`);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="QR Code Product Scanner"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <QrCode className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
            <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
              Scan Fabric QR Code
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close QR Scanner"
            onClick={onClose}
            className="p-2 rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="rounded-xl overflow-hidden bg-stone-950 border border-stone-800 min-h-[200px] flex flex-col items-center justify-center relative">
          <div id="sitara-qr-reader" className="w-full" />
          {!cameraActive && (
            <div className="p-6 text-center space-y-2">
              <Camera className="w-8 h-8 text-stone-400 mx-auto" />
              <p className="text-xs text-stone-300">
                Camera QR viewfinder activates on devices with camera permission.
              </p>
            </div>
          )}
        </div>

        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <label htmlFor="manual-qr-input" className="sr-only">
            Enter QR code or SKU
          </label>
          <input
            id="manual-qr-input"
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Type QR / SKU (e.g. SCH-1001)"
            className="flex-1 px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-700"
          />
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-sm font-medium inline-flex items-center gap-1.5"
          >
            <Search className="w-4 h-4" />
            Find
          </button>
        </form>

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-stone-500 dark:text-stone-400">
            Quick Tap Product QR Tags:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {products.slice(0, 5).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onMatchProduct(p);
                  setStatusMessage(`Scanned ${p.sku} · ${p.name}`);
                }}
                className="px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 text-xs font-mono-num text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              >
                {p.sku}
              </button>
            ))}
          </div>
        </div>

        {statusMessage && (
          <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
            {statusMessage}
          </p>
        )}
      </div>
    </div>
  );
};
