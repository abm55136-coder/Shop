import React, { useMemo, useState } from 'react';
import {
  Minus,
  Plus,
  QrCode,
  Receipt,
  Search,
  Trash2,
} from 'lucide-react';
import type {
  Invoice,
  InvoiceType,
  Language,
  Party,
  PriceMode,
  Product,
  Salesman,
} from '../types/shop';
import { TRANSLATIONS } from '../i18n/translations';
import {
  calculateInvoiceTotals,
  FABRIC_CATEGORIES,
  formatPKR,
  getRateForMode,
  type CartDraftItem,
} from '../utils/shopLogic';

interface Props {
  products: Product[];
  parties: Party[];
  salesmen: Salesman[];
  invoices: Invoice[];
  language: Language;
  cart: CartDraftItem[];
  onChangeCart: (next: CartDraftItem[]) => void;
  onOpenScanner: () => void;
  onCompleteInvoice: (invoice: Invoice) => void;
  onViewInvoice: (invoice: Invoice) => void;
}

export const BillingView: React.FC<Props> = ({
  products,
  parties,
  salesmen,
  invoices,
  language,
  cart,
  onChangeCart,
  onOpenScanner,
  onCompleteInvoice,
  onViewInvoice,
}) => {
  const t = TRANSLATIONS[language];
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('All');
  const [invoiceType, setInvoiceType] = useState<InvoiceType>('sale');
  const [priceMode, setPriceMode] = useState<PriceMode>('retail');
  const [selectedPartyId, setSelectedPartyId] = useState<string>('');
  const [walkInName, setWalkInName] = useState<string>('');
  const [selectedSalesmanId, setSelectedSalesmanId] = useState<string>('');
  const [discountInput, setDiscountInput] = useState<string>('0');
  const [paidInput, setPaidInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const catMatch = category === 'All' || p.category === category;
      if (!catMatch) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.nameUrdu ?? '').toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.qrCode.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });
  }, [products, category, search]);

  const relevantParties = useMemo(() => {
    const targetType = invoiceType === 'purchase' ? 'supplier' : 'customer';
    return parties.filter((p) => p.type === targetType);
  }, [parties, invoiceType]);

  const selectedParty = parties.find((p) => p.id === selectedPartyId);
  const previousBalance = selectedParty ? selectedParty.balance : 0;
  const discount = Math.max(0, Number(discountInput) || 0);

  const previewCalc = calculateInvoiceTotals({
    draftItems: cart,
    priceMode,
    type: invoiceType,
    discount,
    previousBalance,
    paidAmount: paidInput === '' ? 0 : Number(paidInput) || 0,
  });

  const effectivePaid =
    paidInput === '' ? Math.max(0, previewCalc.netTotal) : Math.max(0, Number(paidInput) || 0);

  const finalCalc = calculateInvoiceTotals({
    draftItems: cart,
    priceMode,
    type: invoiceType,
    discount,
    previousBalance,
    paidAmount: effectivePaid,
  });

  const addProductToCart = (product: Product) => {
    setErrorMsg('');
    const existing = cart.find((c) => c.product.id === product.id);
    if (existing) {
      onChangeCart(
        cart.map((c) =>
          c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c
        )
      );
    } else {
      onChangeCart([...cart, { product, quantity: 1 }]);
    }
  };

  const updateQty = (productId: string, delta: number) => {
    const next = cart
      .map((c) =>
        c.product.id === productId ? { ...c, quantity: c.quantity + delta } : c
      )
      .filter((c) => c.quantity > 0);
    onChangeCart(next);
  };

  const handleCheckout = () => {
    if (finalCalc.items.length === 0) {
      setErrorMsg('Add at least one cloth item to generate an invoice.');
      return;
    }

    const salesman = salesmen.find((s) => s.id === selectedSalesmanId);
    const partyName =
      selectedParty?.name ||
      walkInName.trim() ||
      (invoiceType === 'purchase' ? 'Cash Supplier' : 'Walk-in Cash Customer');

    const nextSeq = 101 + invoices.length;
    const invoice: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: `SCH-2026-${nextSeq}`,
      type: invoiceType,
      priceMode,
      partyId: selectedParty?.id,
      partyName,
      partyPhone: selectedParty?.phone,
      salesmanId: salesman?.id,
      salesmanName: salesman?.name,
      items: finalCalc.items,
      subtotal: finalCalc.subtotal,
      discount: finalCalc.discount,
      previousBalance: finalCalc.previousBalance,
      netTotal: finalCalc.netTotal,
      paidAmount: finalCalc.paidAmount,
      balanceDue: finalCalc.balanceDue,
      profit: finalCalc.profit,
      status: invoiceType === 'return' ? 'returned' : 'completed',
      createdAt: new Date().toISOString(),
    };

    onCompleteInvoice(invoice);
    onChangeCart([]);
    setDiscountInput('0');
    setPaidInput('');
    setWalkInName('');
    setErrorMsg('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left 7 Cols: Product Catalogue & Controls */}
      <section className="lg:col-span-7 space-y-4">
        <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 space-y-3">
          {/* Mode Switchers */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-stone-100 dark:bg-stone-800">
              {(['sale', 'purchase', 'return'] as InvoiceType[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setInvoiceType(mode);
                    setSelectedPartyId('');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                    invoiceType === mode
                      ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm'
                      : 'text-stone-600 dark:text-stone-400'
                  }`}
                >
                  {mode === 'sale' ? t.sale : mode === 'purchase' ? t.purchase : t.returnLabel}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 p-1 rounded-xl bg-stone-100 dark:bg-stone-800">
              {(['retail', 'wholesale'] as PriceMode[]).map((pm) => (
                <button
                  key={pm}
                  type="button"
                  onClick={() => setPriceMode(pm)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    priceMode === pm
                      ? 'bg-emerald-800 text-white shadow-sm'
                      : 'text-stone-600 dark:text-stone-400'
                  }`}
                >
                  {pm === 'retail' ? t.retail : t.wholesale}
                </button>
              ))}
            </div>
          </div>

          {/* Search & QR Scan */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <label htmlFor="pos-product-search" className="sr-only">
                Search cloth inventory
              </label>
              <input
                id="pos-product-search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full pl-10 pr-4 py-2.5 min-h-[44px] rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>
            <button
              type="button"
              onClick={onOpenScanner}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-medium inline-flex items-center gap-2 hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
            >
              <QrCode className="w-4 h-4" />
              {t.scanQR}
            </button>
          </div>

          {/* Category Filter Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {['All', ...FABRIC_CATEGORIES].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                  category === cat
                    ? 'bg-emerald-800 text-white'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                }`}
              >
                {cat === 'All' ? t.allCategories : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredProducts.map((product) => {
            const activeRate = getRateForMode(product, priceMode, invoiceType);
            const inCartQty = cart.find((c) => c.product.id === product.id)?.quantity ?? 0;
            const isLow = product.stock <= product.minStock;
            return (
              <button
                key={product.id}
                type="button"
                onClick={() => addProductToCart(product)}
                aria-label={`Add ${product.name} to bill`}
                className="text-left rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-emerald-700 dark:hover:border-emerald-500 p-4 transition-colors flex flex-col justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono-num text-stone-500 dark:text-stone-400">
                      {product.sku} · {product.category}
                    </span>
                    {inCartQty > 0 && (
                      <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 font-mono-num">
                        In Bill: {inCartQty}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-stone-900 dark:text-stone-100 leading-snug">
                    {product.name}
                  </p>
                  {product.nameUrdu && (
                    <p className="text-xs text-stone-500 dark:text-stone-400 font-urdu">
                      {product.nameUrdu}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-stone-100 dark:border-stone-800">
                  <span className="text-base font-bold text-stone-900 dark:text-stone-100 font-mono-num">
                    {formatPKR(activeRate)}
                    <span className="text-xs font-normal text-stone-500">/{product.unit}</span>
                  </span>
                  <span
                    className={`text-xs font-mono-num ${
                      isLow
                        ? 'text-red-600 dark:text-red-400 font-medium'
                        : 'text-stone-500 dark:text-stone-400'
                    }`}
                  >
                    Stock: {product.stock}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Right 5 Cols: Active Bill & Checkout */}
      <aside className="lg:col-span-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-5 space-y-4 lg:sticky lg:top-20">
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
          <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100 inline-flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            Active Bill ({cart.reduce((s, c) => s + c.quantity, 0)} items)
          </h2>
          {cart.length > 0 && (
            <button
              type="button"
              onClick={() => onChangeCart([])}
              className="text-xs text-red-600 dark:text-red-400 hover:underline"
            >
              Clear Bill
            </button>
          )}
        </div>

        {/* Party & Salesman Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="bill-party-select"
              className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1"
            >
              {invoiceType === 'purchase' ? 'Supplier' : 'Customer (Khata)'}
            </label>
            <select
              id="bill-party-select"
              value={selectedPartyId}
              onChange={(e) => setSelectedPartyId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs text-stone-900 dark:text-stone-100"
            >
              <option value="">{t.walkInCustomer}</option>
              {relevantParties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({formatPKR(p.balance)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="bill-salesman-select"
              className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1"
            >
              Salesman
            </label>
            <select
              id="bill-salesman-select"
              value={selectedSalesmanId}
              onChange={(e) => setSelectedSalesmanId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs text-stone-900 dark:text-stone-100"
            >
              <option value="">{t.selectSalesman}</option>
              {salesmen
                .filter((s) => s.active)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.commissionRate}%)
                  </option>
                ))}
            </select>
          </div>
        </div>

        {!selectedPartyId && (
          <div>
            <label
              htmlFor="walkin-customer-name"
              className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1"
            >
              Customer Name (Optional)
            </label>
            <input
              id="walkin-customer-name"
              type="text"
              value={walkInName}
              onChange={(e) => setWalkInName(e.target.value)}
              placeholder="e.g. Tariq Mahmood"
              className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs text-stone-900 dark:text-stone-100"
            />
          </div>
        )}

        {/* Cart Items */}
        {cart.length === 0 ? (
          <div className="py-8 text-center text-xs text-stone-500 dark:text-stone-400 border border-dashed border-stone-200 dark:border-stone-800 rounded-xl">
            {t.emptyCart}
          </div>
        ) : (
          <div className="divide-y divide-stone-100 dark:divide-stone-800 max-h-60 overflow-y-auto pr-1">
            {cart.map((c) => {
              const rate = getRateForMode(c.product, priceMode, invoiceType);
              return (
                <div key={c.product.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-stone-900 dark:text-stone-100 truncate">
                      {c.product.name}
                    </p>
                    <p className="text-xs text-stone-500 dark:text-stone-400 font-mono-num">
                      {formatPKR(rate)} × {c.quantity} = {formatPKR(rate * c.quantity)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      aria-label={`Decrease quantity of ${c.product.name}`}
                      onClick={() => updateQty(c.product.id, -1)}
                      className="w-8 h-8 rounded-lg border border-stone-200 dark:border-stone-700 flex items-center justify-center text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-7 text-center text-xs font-mono-num font-semibold">
                      {c.quantity}
                    </span>
                    <button
                      type="button"
                      aria-label={`Increase quantity of ${c.product.name}`}
                      onClick={() => updateQty(c.product.id, 1)}
                      className="w-8 h-8 rounded-lg border border-stone-200 dark:border-stone-700 flex items-center justify-center text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove ${c.product.name}`}
                      onClick={() => updateQty(c.product.id, -c.quantity)}
                      className="w-8 h-8 rounded-lg text-red-600 dark:text-red-400 flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Totals & Payment Inputs */}
        <div className="space-y-2.5 pt-3 border-t border-stone-200 dark:border-stone-800 text-xs">
          <div className="flex justify-between text-stone-600 dark:text-stone-400">
            <span>{t.subtotal}</span>
            <span className="font-mono-num font-semibold text-stone-900 dark:text-stone-100">
              {formatPKR(finalCalc.subtotal)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <label htmlFor="bill-discount" className="text-stone-600 dark:text-stone-400">
              {t.discount} (PKR)
            </label>
            <input
              id="bill-discount"
              type="number"
              min={0}
              value={discountInput}
              onChange={(e) => setDiscountInput(e.target.value)}
              className="w-28 px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-right font-mono-num text-stone-900 dark:text-stone-100"
            />
          </div>

          {previousBalance !== 0 && (
            <div className="flex justify-between text-amber-700 dark:text-amber-400">
              <span>{t.previousBalance}</span>
              <span className="font-mono-num font-semibold">{formatPKR(previousBalance)}</span>
            </div>
          )}

          <div className="flex justify-between text-sm font-bold text-stone-900 dark:text-stone-100 pt-2 border-t border-stone-100 dark:border-stone-800">
            <span>{t.netTotal}</span>
            <span className="font-mono-num">{formatPKR(finalCalc.netTotal)}</span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <label htmlFor="bill-paid" className="text-stone-600 dark:text-stone-400">
              {t.paidAmount} (PKR)
            </label>
            <input
              id="bill-paid"
              type="number"
              min={0}
              value={paidInput}
              onChange={(e) => setPaidInput(e.target.value)}
              placeholder={String(Math.max(0, previewCalc.netTotal))}
              className="w-28 px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-right font-mono-num text-stone-900 dark:text-stone-100"
            />
          </div>

          <div className="flex justify-between text-xs font-semibold">
            <span className="text-stone-600 dark:text-stone-400">{t.balanceDue}</span>
            <span
              className={`font-mono-num ${
                finalCalc.balanceDue > 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-emerald-700 dark:text-emerald-400'
              }`}
            >
              {formatPKR(finalCalc.balanceDue)}
            </span>
          </div>
        </div>

        {errorMsg && (
          <p className="text-xs text-red-600 dark:text-red-400" role="alert">
            {errorMsg}
          </p>
        )}

        <button
          type="button"
          onClick={handleCheckout}
          className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
        >
          {t.completeInvoice}
        </button>

        {invoices.length > 0 && (
          <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs">
            <span className="text-stone-500 dark:text-stone-400 truncate">
              Last: {invoices[0].invoiceNumber}
            </span>
            <button
              type="button"
              onClick={() => onViewInvoice(invoices[0])}
              className="font-medium text-emerald-700 dark:text-emerald-400 hover:underline shrink-0"
            >
              Reprint / WhatsApp
            </button>
          </div>
        )}
      </aside>
    </div>
  );
};
