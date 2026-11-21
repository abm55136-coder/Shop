import React, { useMemo, useState } from 'react';
import {
  Camera,
  MessageCircle,
  Plus,
  Sparkles,
  Trash2,
  UserPlus,
} from 'lucide-react';
import type { KhataEntry, Language, Party, ShopProfile } from '../types/shop';
import { TRANSLATIONS } from '../i18n/translations';
import { buildWhatsAppUrl, formatPKR } from '../utils/shopLogic';

interface Props {
  parties: Party[];
  khataEntries: KhataEntry[];
  profile: ShopProfile;
  language: Language;
  onAddParty: (party: Party) => void;
  onAddKhataEntry: (entry: KhataEntry) => void;
  onDeleteKhataEntry: (id: string) => void;
}

export const KhataView: React.FC<Props> = ({
  parties,
  khataEntries,
  profile,
  language,
  onAddParty,
  onAddKhataEntry,
  onDeleteKhataEntry,
}) => {
  const t = TRANSLATIONS[language];
  const [ledgerTab, setLedgerTab] = useState<'customer' | 'supplier' | 'cashbook'>('customer');
  const [selectedPartyId, setSelectedPartyId] = useState<string>('');
  const [entryType, setEntryType] = useState<'credit' | 'debit'>('credit');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [receiptPreview, setReceiptPreview] = useState<string>('');
  const [detectedAmount, setDetectedAmount] = useState<number | undefined>(undefined);
  const [ocrStatus, setOcrStatus] = useState<string>('');
  const [scanningReceipt, setScanningReceipt] = useState(false);

  // Add party inline form
  const [showAddParty, setShowAddParty] = useState(false);
  const [newPartyName, setNewPartyName] = useState('');
  const [newPartyPhone, setNewPartyPhone] = useState('');
  const [newPartyAddress, setNewPartyAddress] = useState('');
  const [newPartyBalance, setNewPartyBalance] = useState('0');
  const [formError, setFormError] = useState('');

  const filteredParties = useMemo(
    () => parties.filter((p) => p.type === (ledgerTab === 'supplier' ? 'supplier' : 'customer')),
    [parties, ledgerTab]
  );

  const visibleEntries = useMemo(() => {
    if (ledgerTab === 'cashbook') return khataEntries;
    if (selectedPartyId) {
      return khataEntries.filter((e) => e.partyId === selectedPartyId);
    }
    return khataEntries.filter((e) => e.partyType === ledgerTab);
  }, [khataEntries, ledgerTab, selectedPartyId]);

  const handleCreateParty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartyName.trim()) return;
    const now = new Date().toISOString();
    const party: Party = {
      id: `party-${Date.now()}`,
      type: ledgerTab === 'supplier' ? 'supplier' : 'customer',
      name: newPartyName.trim(),
      phone: newPartyPhone.trim(),
      address: newPartyAddress.trim() || undefined,
      balance: Number(newPartyBalance) || 0,
      createdAt: now,
      updatedAt: now,
    };
    onAddParty(party);
    setSelectedPartyId(party.id);
    setNewPartyName('');
    setNewPartyPhone('');
    setNewPartyAddress('');
    setNewPartyBalance('0');
    setShowAddParty(false);
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanningReceipt(true);
    setOcrStatus('Reading bill image with Smart AI...');

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      setReceiptPreview(dataUrl);
      const base64 = dataUrl.split(',')[1];
      if (!base64) {
        setScanningReceipt(false);
        setOcrStatus('Could not decode image file.');
        return;
      }
      try {
        const res = await fetch('/api/ai/parse-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, mimeType: file.type || 'image/jpeg' }),
        });
        const data = await res.json();
        if (!res.ok) {
          setOcrStatus(data.error || 'Receipt scan unavailable; enter amount manually.');
        } else {
          if (typeof data.detectedAmount === 'number' && data.detectedAmount > 0) {
            setAmount(String(data.detectedAmount));
            setDetectedAmount(data.detectedAmount);
          }
          if (data.note && !note) {
            setNote(data.note);
          }
          setOcrStatus(
            `Detected ${formatPKR(data.detectedAmount || 0)}${data.partyName ? ` · ${data.partyName}` : ''}`
          );
        }
      } catch {
        setOcrStatus('Receipt photo attached. Enter amount if auto-detect is offline.');
      } finally {
        setScanningReceipt(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmt = Number(amount);
    if (!Number.isFinite(numericAmt) || numericAmt <= 0) {
      setFormError('Enter a valid amount greater than 0.');
      return;
    }

    const party = parties.find((p) => p.id === selectedPartyId);
    const partyId = ledgerTab === 'cashbook' ? 'cashbook' : party?.id || 'general';
    const partyName =
      ledgerTab === 'cashbook' ? 'Daily Cash Counter' : party?.name || 'General Account';

    onAddKhataEntry({
      id: `kh-${Date.now()}`,
      partyId,
      partyName,
      partyType: ledgerTab,
      entryType,
      amount: numericAmt,
      note: note.trim() || (entryType === 'credit' ? 'Payment received' : 'Udhaar / Bill added'),
      receiptImageDataUrl: receiptPreview || undefined,
      detectedAmount,
      date,
      createdAt: new Date().toISOString(),
    });

    setAmount('');
    setNote('');
    setReceiptPreview('');
    setDetectedAmount(undefined);
    setOcrStatus('');
    setFormError('');
  };

  return (
    <div className="space-y-6">
      {/* Top Tab Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-stone-100 dark:bg-stone-800">
          {(
            [
              ['customer', t.customerKhata],
              ['supplier', t.supplierKhata],
              ['cashbook', t.cashBook],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setLedgerTab(key);
                setSelectedPartyId('');
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                ledgerTab === key
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-600 dark:text-stone-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {ledgerTab !== 'cashbook' && (
          <button
            type="button"
            onClick={() => setShowAddParty((v) => !v)}
            className="min-h-[40px] px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-medium text-stone-800 dark:text-stone-100 inline-flex items-center gap-1.5 hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <UserPlus className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            New {ledgerTab === 'supplier' ? 'Supplier' : 'Customer'}
          </button>
        )}
      </div>

      {/* Add Party Form */}
      {showAddParty && ledgerTab !== 'cashbook' && (
        <form
          onSubmit={handleCreateParty}
          className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-5 grid grid-cols-1 sm:grid-cols-4 gap-3"
        >
          <input
            type="text"
            required
            value={newPartyName}
            onChange={(e) => setNewPartyName(e.target.value)}
            placeholder={ledgerTab === 'supplier' ? 'Supplier Name' : 'Customer Name'}
            className="px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm"
          />
          <input
            type="tel"
            value={newPartyPhone}
            onChange={(e) => setNewPartyPhone(e.target.value)}
            placeholder="WhatsApp Phone (03xx...)"
            className="px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm font-mono-num"
          />
          <input
            type="number"
            value={newPartyBalance}
            onChange={(e) => setNewPartyBalance(e.target.value)}
            placeholder="Opening Balance"
            className="px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm font-mono-num"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-sm font-medium"
          >
            Save Account
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Accounts List or Cash Book Summary */}
        {ledgerTab !== 'cashbook' && (
          <section className="lg:col-span-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              {ledgerTab === 'supplier' ? 'Suppliers' : 'Customers'} ({filteredParties.length})
            </h2>
            <div className="divide-y divide-stone-100 dark:divide-stone-800">
              {filteredParties.map((party) => {
                const isSelected = selectedPartyId === party.id;
                const reminderMsg = `Assalam-o-Alaikum ${party.name}, reminder from ${profile.shopName} (${profile.phone}): Your current Khata balance is ${formatPKR(party.balance)}. Thank you!`;
                return (
                  <div
                    key={party.id}
                    className={`py-3 px-2 rounded-xl transition-colors ${
                      isSelected ? 'bg-emerald-50/70 dark:bg-emerald-950/30' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedPartyId(isSelected ? '' : party.id)}
                        className="text-left flex-1 min-w-0"
                      >
                        <p className="text-sm font-semibold text-stone-900 dark:text-stone-100 truncate">
                          {party.name}
                        </p>
                        <p className="text-xs text-stone-500 dark:text-stone-400 font-mono-num">
                          {party.phone || 'No phone'}
                        </p>
                      </button>
                      <div className="text-right shrink-0">
                        <p
                          className={`text-sm font-bold font-mono-num ${
                            party.balance > 0
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-emerald-700 dark:text-emerald-400'
                          }`}
                        >
                          {formatPKR(party.balance)}
                        </p>
                        {party.phone && party.balance > 0 && (
                          <a
                            href={buildWhatsAppUrl(party.phone, reminderMsg)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
                          >
                            <MessageCircle className="w-3 h-3" />
                            Remind
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Right: Entry Form + Bill OCR + Ledger Feed */}
        <section
          className={`${
            ledgerTab === 'cashbook' ? 'lg:col-span-12' : 'lg:col-span-7'
          } space-y-6`}
        >
          <form
            onSubmit={handleAddEntry}
            className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-5 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
                Record Credit / Debit Entry
              </h2>

              <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-emerald-700 dark:border-emerald-600 text-xs font-medium text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40">
                <Camera className="w-4 h-4" />
                <span>{scanningReceipt ? 'Scanning...' : t.uploadBillPhoto}</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleReceiptUpload}
                  className="sr-only"
                />
              </label>
            </div>

            {ocrStatus && (
              <p className="text-xs text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                {ocrStatus}
              </p>
            )}

            {receiptPreview && (
              <div className="flex items-center gap-3 p-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                <img
                  src={receiptPreview}
                  alt="Uploaded Khata Bill Receipt"
                  className="w-16 h-16 object-cover rounded-lg"
                />
                <div className="text-xs text-stone-600 dark:text-stone-300">
                  <p className="font-medium">Bill Receipt Attached</p>
                  {detectedAmount !== undefined && (
                    <p className="font-mono-num">AI Detected: {formatPKR(detectedAmount)}</p>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {ledgerTab !== 'cashbook' && (
                <div>
                  <label
                    htmlFor="khata-party-select"
                    className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1"
                  >
                    Account
                  </label>
                  <select
                    id="khata-party-select"
                    value={selectedPartyId}
                    onChange={(e) => setSelectedPartyId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm"
                  >
                    <option value="">Select {ledgerTab}...</option>
                    {filteredParties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label
                  htmlFor="khata-entry-type"
                  className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1"
                >
                  Entry Type
                </label>
                <select
                  id="khata-entry-type"
                  value={entryType}
                  onChange={(e) => setEntryType(e.target.value as 'credit' | 'debit')}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm"
                >
                  <option value="credit">Credit / Cash Received (جمع)</option>
                  <option value="debit">Debit / Udhaar Given (بنام)</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="khata-amount"
                  className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1"
                >
                  Amount (PKR)
                </label>
                <input
                  id="khata-amount"
                  type="number"
                  required
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm font-mono-num"
                />
              </div>

              <div>
                <label
                  htmlFor="khata-date"
                  className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1"
                >
                  Date
                </label>
                <input
                  id="khata-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm font-mono-num"
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="khata-note"
                  className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1"
                >
                  Note / Bill Reference
                </label>
                <input
                  id="khata-note"
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Cash received or cloth bill detail"
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm"
                />
              </div>
            </div>

            {formError && <p className="text-xs text-red-600">{formError}</p>}

            <button
              type="submit"
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-sm font-medium inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Save Khata Entry
            </button>
          </form>

          {/* Ledger History */}
          <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 divide-y divide-stone-100 dark:divide-stone-800">
            <div className="p-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                Ledger Entries ({visibleEntries.length})
              </h3>
            </div>
            {visibleEntries.length === 0 ? (
              <p className="p-6 text-xs text-stone-500 dark:text-stone-400 text-center">
                No entries found for this view.
              </p>
            ) : (
              visibleEntries.map((entry) => (
                <div key={entry.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {entry.receiptImageDataUrl && (
                      <img
                        src={entry.receiptImageDataUrl}
                        alt="Receipt thumbnail"
                        className="w-10 h-10 rounded-lg object-cover border border-stone-200 dark:border-stone-700 shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">
                        {entry.partyName}
                      </p>
                      <p className="text-xs text-stone-500 dark:text-stone-400 truncate">
                        {entry.date} · {entry.note}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`text-sm font-bold font-mono-num ${
                        entry.entryType === 'credit'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {entry.entryType === 'credit' ? '+' : '-'}
                      {formatPKR(entry.amount)}
                    </span>
                    <button
                      type="button"
                      aria-label={`Delete Khata entry for ${entry.partyName}`}
                      onClick={() => onDeleteKhataEntry(entry.id)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
