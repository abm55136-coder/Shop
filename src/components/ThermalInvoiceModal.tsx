import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { MessageCircle, Printer, X } from 'lucide-react';
import type { Invoice, ShopProfile, ThermalPaperWidth } from '../types/shop';
import {
  buildWhatsAppUrl,
  formatInvoiceWhatsAppMessage,
  formatPKR,
} from '../utils/shopLogic';

interface Props {
  invoice: Invoice | null;
  profile: ShopProfile;
  onClose: () => void;
}

export const ThermalInvoiceModal: React.FC<Props> = ({ invoice, profile, onClose }) => {
  const [paperWidth, setPaperWidth] = useState<ThermalPaperWidth>('80mm');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    if (!invoice) return;
    const payload = JSON.stringify({
      shop: profile.shopName,
      inv: invoice.invoiceNumber,
      total: invoice.netTotal,
      paid: invoice.paidAmount,
      due: invoice.balanceDue,
      date: invoice.createdAt.slice(0, 10),
    });
    QRCode.toDataURL(payload, { width: 128, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
  }, [invoice, profile.shopName]);

  if (!invoice) return null;

  const waUrl = buildWhatsAppUrl(
    invoice.partyPhone || profile.phone,
    formatInvoiceWhatsAppMessage(invoice, profile.shopName, profile.phone)
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Thermal Invoice Preview"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-5 space-y-4 my-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
              Thermal Receipt · {invoice.invoiceNumber}
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Select 58mm or 80mm roll width to print or share via WhatsApp
            </p>
          </div>
          <button
            type="button"
            aria-label="Close invoice preview"
            onClick={onClose}
            className="p-2 rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 p-1 rounded-xl bg-stone-100 dark:bg-stone-800">
          <button
            type="button"
            onClick={() => setPaperWidth('58mm')}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
              paperWidth === '58mm'
                ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm'
                : 'text-stone-600 dark:text-stone-400'
            }`}
          >
            58mm Thermal Roll
          </button>
          <button
            type="button"
            onClick={() => setPaperWidth('80mm')}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
              paperWidth === '80mm'
                ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm'
                : 'text-stone-600 dark:text-stone-400'
            }`}
          >
            80mm Thermal Roll
          </button>
        </div>

        <div className="flex justify-center bg-stone-100 dark:bg-stone-950 p-4 rounded-xl max-h-[55vh] overflow-y-auto">
          <div
            id="thermal-receipt-print"
            style={{ width: paperWidth === '58mm' ? '220px' : '302px' }}
            className="bg-white text-stone-900 p-4 border border-stone-300 font-mono-num text-[11px] leading-snug space-y-2.5"
          >
            <div className="text-center border-b border-dashed border-stone-400 pb-2">
              <p className="font-bold text-sm tracking-tight uppercase">{profile.shopName}</p>
              <p className="text-[10px] text-stone-700">{profile.address}</p>
              <p className="text-[10px] text-stone-700">
                Ph: {profile.phone} · {profile.email}
              </p>
            </div>

            <div className="text-[10px] space-y-0.5 border-b border-dashed border-stone-400 pb-2">
              <div className="flex justify-between">
                <span>Bill #:</span>
                <span className="font-semibold">{invoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{new Date(invoice.createdAt).toLocaleString('en-PK')}</span>
              </div>
              <div className="flex justify-between">
                <span>Customer:</span>
                <span className="font-semibold truncate max-w-[140px]">{invoice.partyName}</span>
              </div>
              {invoice.salesmanName && (
                <div className="flex justify-between">
                  <span>Salesman:</span>
                  <span>{invoice.salesmanName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Mode:</span>
                <span className="uppercase">
                  {invoice.type} / {invoice.priceMode}
                </span>
              </div>
            </div>

            <table className="w-full text-[10px] border-b border-dashed border-stone-400 pb-2">
              <thead>
                <tr className="border-b border-stone-300 text-left">
                  <th className="py-1">Item</th>
                  <th className="py-1 text-right">Qty</th>
                  <th className="py-1 text-right">Rate</th>
                  <th className="py-1 text-right">Amt</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, idx) => (
                  <tr key={`${item.productId}-${idx}`}>
                    <td className="py-1 pr-1 max-w-[110px] truncate">{item.name}</td>
                    <td className="py-1 text-right">{item.quantity}</td>
                    <td className="py-1 text-right">{item.rate}</td>
                    <td className="py-1 text-right font-semibold">{item.lineTotal}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="space-y-1 text-[11px] border-b border-dashed border-stone-400 pb-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatPKR(invoice.subtotal)}</span>
              </div>
              {invoice.discount > 0 && (
                <div className="flex justify-between">
                  <span>Discount</span>
                  <span>-{formatPKR(invoice.discount)}</span>
                </div>
              )}
              {invoice.previousBalance !== 0 && (
                <div className="flex justify-between">
                  <span>Prev Balance</span>
                  <span>{formatPKR(invoice.previousBalance)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-xs pt-1 border-t border-stone-300">
                <span>NET TOTAL</span>
                <span>{formatPKR(invoice.netTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Cash Paid</span>
                <span>{formatPKR(invoice.paidAmount)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Balance Due</span>
                <span>{formatPKR(invoice.balanceDue)}</span>
              </div>
            </div>

            <div className="text-center pt-1 space-y-1.5">
              {qrDataUrl && (
                <img
                  src={qrDataUrl}
                  alt={`QR verification code for ${invoice.invoiceNumber}`}
                  className="w-24 h-24 mx-auto"
                />
              )}
              <p className="text-[10px] text-stone-700">
                Scan QR to verify digital receipt
              </p>
              <p className="text-[10px] font-medium">Thank you for visiting Sitara Cloth House</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print {paperWidth}
          </button>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl border border-emerald-700 dark:border-emerald-600 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            WhatsApp Receipt
          </a>
        </div>
      </div>
    </div>
  );
};
