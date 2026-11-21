import React, { useMemo, useState } from 'react';
import QRCode from 'qrcode';
import {
  AlertTriangle,
  History,
  Plus,
  Printer,
  QrCode,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import type {
  FabricCategory,
  Language,
  Product,
  ProductUnit,
  StockHistoryEntry,
} from '../types/shop';
import { TRANSLATIONS } from '../i18n/translations';
import { FABRIC_CATEGORIES, formatPKR } from '../utils/shopLogic';

interface Props {
  products: Product[];
  stockHistory: StockHistoryEntry[];
  language: Language;
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
}

export const InventoryView: React.FC<Props> = ({
  products,
  stockHistory,
  language,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
}) => {
  const t = TRANSLATIONS[language];
  const [subTab, setSubTab] = useState<'catalogue' | 'history'>('catalogue');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [showLowOnly, setShowLowOnly] = useState(false);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [qrModalProduct, setQrModalProduct] = useState<Product | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string>('');

  // Form states
  const [name, setName] = useState('');
  const [nameUrdu, setNameUrdu] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState<FabricCategory>('Lawn');
  const [unit, setUnit] = useState<ProductUnit>('Suit');
  const [purchaseRate, setPurchaseRate] = useState('');
  const [wholesaleRate, setWholesaleRate] = useState('');
  const [retailRate, setRetailRate] = useState('');
  const [stock, setStock] = useState('');
  const [minStock, setMinStock] = useState('5');
  const [supplierName, setSupplierName] = useState('');
  const [formError, setFormError] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (categoryFilter !== 'All' && p.category !== categoryFilter) return false;
      if (showLowOnly && p.stock > p.minStock) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.supplierName ?? '').toLowerCase().includes(q)
      );
    });
  }, [products, search, categoryFilter, showLowOnly]);

  const openAddModal = () => {
    setEditingProduct(null);
    setName('');
    setNameUrdu('');
    setSku(`SCH-${1001 + products.length}`);
    setCategory('Lawn');
    setUnit('Suit');
    setPurchaseRate('');
    setWholesaleRate('');
    setRetailRate('');
    setStock('10');
    setMinStock('5');
    setSupplierName('');
    setFormError('');
    setShowFormModal(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setNameUrdu(p.nameUrdu ?? '');
    setSku(p.sku);
    setCategory(p.category);
    setUnit(p.unit);
    setPurchaseRate(String(p.purchaseRate));
    setWholesaleRate(String(p.wholesaleRate));
    setRetailRate(String(p.retailRate));
    setStock(String(p.stock));
    setMinStock(String(p.minStock));
    setSupplierName(p.supplierName ?? '');
    setFormError('');
    setShowFormModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !sku.trim()) {
      setFormError('Product name and SKU code are required.');
      return;
    }
    const pRate = Number(purchaseRate);
    const wRate = Number(wholesaleRate);
    const rRate = Number(retailRate);
    const qty = Number(stock);
    const minQty = Number(minStock);
    if (
      !Number.isFinite(pRate) ||
      pRate < 0 ||
      !Number.isFinite(wRate) ||
      wRate < 0 ||
      !Number.isFinite(rRate) ||
      rRate < 0
    ) {
      setFormError('Please enter valid non-negative rates.');
      return;
    }

    const now = new Date().toISOString();
    if (editingProduct) {
      onUpdateProduct({
        ...editingProduct,
        name: name.trim(),
        nameUrdu: nameUrdu.trim() || undefined,
        sku: sku.trim(),
        qrCode: sku.trim(),
        category,
        unit,
        purchaseRate: pRate,
        wholesaleRate: wRate,
        retailRate: rRate,
        stock: Math.max(0, Number.isFinite(qty) ? qty : 0),
        minStock: Math.max(0, Number.isFinite(minQty) ? minQty : 5),
        supplierName: supplierName.trim() || undefined,
        updatedAt: now,
      });
    } else {
      onAddProduct({
        id: `prod-${Date.now()}`,
        sku: sku.trim(),
        qrCode: sku.trim(),
        name: name.trim(),
        nameUrdu: nameUrdu.trim() || undefined,
        category,
        unit,
        purchaseRate: pRate,
        wholesaleRate: wRate,
        retailRate: rRate,
        stock: Math.max(0, Number.isFinite(qty) ? qty : 0),
        minStock: Math.max(0, Number.isFinite(minQty) ? minQty : 5),
        supplierName: supplierName.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      });
    }
    setShowFormModal(false);
  };

  const openQrModal = async (product: Product) => {
    setQrModalProduct(product);
    try {
      const url = await QRCode.toDataURL(product.qrCode || product.sku, {
        width: 220,
        margin: 2,
      });
      setQrImageUrl(url);
    } catch {
      setQrImageUrl('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Fabric Visual Showcase Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 overflow-hidden flex items-center gap-4 p-3">
          <img
            src="/src/assets/images/fabric_lawn_cotton_1795234216832.jpg"
            alt="Summer Lawn and Cotton Unstitched Collection"
            referrerPolicy="no-referrer"
            className="w-24 h-20 object-cover rounded-xl shrink-0 bg-stone-200 dark:bg-stone-800"
          />
          <div>
            <p className="text-xs text-stone-500 dark:text-stone-400">Everyday &amp; Summer</p>
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              Lawn, Cotton, Khaddar &amp; Linen
            </h2>
            <p className="text-xs text-stone-600 dark:text-stone-400">
              {products.filter((p) => ['Lawn', 'Cotton', 'Khaddar', 'Linen'].includes(p.category)).length} active varieties in stock
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 overflow-hidden flex items-center gap-4 p-3">
          <img
            src="/src/assets/images/fabric_silk_velvet_1795234217764.jpg"
            alt="Formal Silk, Organza and Velvet Textile Collection"
            referrerPolicy="no-referrer"
            className="w-24 h-20 object-cover rounded-xl shrink-0 bg-stone-200 dark:bg-stone-800"
          />
          <div>
            <p className="text-xs text-stone-500 dark:text-stone-400">Bridal &amp; Formal</p>
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              Silk, Chiffon, Velvet &amp; Organza
            </h2>
            <p className="text-xs text-stone-600 dark:text-stone-400">
              {products.filter((p) => ['Silk', 'Chiffon', 'Velvet', 'Organza'].includes(p.category)).length} formal textile lines
            </p>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-stone-100 dark:bg-stone-800">
            <button
              type="button"
              onClick={() => setSubTab('catalogue')}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                subTab === 'catalogue'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-600 dark:text-stone-400'
              }`}
            >
              A–Z Cloth Catalogue ({products.length})
            </button>
            <button
              type="button"
              onClick={() => setSubTab('history')}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
                subTab === 'history'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-600 dark:text-stone-400'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Purchase &amp; Stock History
            </button>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-sm font-medium inline-flex items-center gap-2 transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            {t.addProduct}
          </button>
        </div>

        {subTab === 'catalogue' && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <label htmlFor="inventory-search" className="sr-only">
                Search products
              </label>
              <input
                id="inventory-search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by fabric name, SKU, or supplier..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm text-stone-900 dark:text-stone-100"
              />
            </div>

            <select
              aria-label="Filter by fabric category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm text-stone-900 dark:text-stone-100"
            >
              <option value="All">All Categories</option>
              {FABRIC_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setShowLowOnly((v) => !v)}
              className={`px-3 py-2 rounded-xl border text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
                showLowOnly
                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                  : 'border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Low Stock Only
            </button>
          </div>
        )}
      </div>

      {subTab === 'catalogue' ? (
        <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead>
              <tr className="border-b border-stone-200 dark:border-stone-800 text-xs text-stone-500 dark:text-stone-400">
                <th className="py-3 px-4 font-medium">SKU / Fabric</th>
                <th className="py-3 px-4 font-medium">Category · Supplier</th>
                <th className="py-3 px-4 font-medium text-right">Purchase</th>
                <th className="py-3 px-4 font-medium text-right">Wholesale</th>
                <th className="py-3 px-4 font-medium text-right">Retail</th>
                <th className="py-3 px-4 font-medium text-right">Stock</th>
                <th className="py-3 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800 text-sm">
              {filtered.map((p) => {
                const isLow = p.stock <= p.minStock;
                return (
                  <tr
                    key={p.id}
                    className="hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <p className="font-medium text-stone-900 dark:text-stone-100">{p.name}</p>
                      <p className="text-xs text-stone-500 dark:text-stone-400 font-mono-num">
                        {p.sku}
                        {p.nameUrdu ? ` · ${p.nameUrdu}` : ''}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-xs text-stone-600 dark:text-stone-300">
                      {p.category} · {p.supplierName || 'Direct'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-num text-stone-600 dark:text-stone-300">
                      {formatPKR(p.purchaseRate)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-num text-stone-800 dark:text-stone-200">
                      {formatPKR(p.wholesaleRate)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-num font-semibold text-stone-900 dark:text-stone-100">
                      {formatPKR(p.retailRate)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-num">
                      <span
                        className={
                          isLow
                            ? 'text-red-600 dark:text-red-400 font-semibold'
                            : 'text-emerald-700 dark:text-emerald-400 font-medium'
                        }
                      >
                        {p.stock} {p.unit}
                      </span>
                      {isLow && (
                        <span className="block text-[11px] text-red-600 dark:text-red-400">
                          Low (min {p.minStock})
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          aria-label={`Generate QR code for ${p.name}`}
                          onClick={() => openQrModal(p)}
                          className="p-2 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(p)}
                          className="px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 text-xs font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${p.name}`}
                          onClick={() => onDeleteProduct(p.id)}
                          className="p-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 divide-y divide-stone-100 dark:divide-stone-800">
          {stockHistory.length === 0 ? (
            <p className="p-6 text-sm text-stone-500 dark:text-stone-400 text-center">
              No stock movement history recorded yet.
            </p>
          ) : (
            stockHistory.map((h) => (
              <div key={h.id} className="p-4 flex items-center justify-between gap-4 text-sm">
                <div>
                  <p className="font-medium text-stone-900 dark:text-stone-100">{h.productName}</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {h.reason} · {h.reference || 'Manual'} ·{' '}
                    {new Date(h.date).toLocaleString('en-PK')}
                  </p>
                </div>
                <span
                  className={`font-mono-num font-semibold ${
                    h.change >= 0
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-amber-700 dark:text-amber-400'
                  }`}
                >
                  {h.change >= 0 ? `+${h.change}` : h.change}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add/Edit Product Modal */}
      {showFormModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={editingProduct ? 'Edit Cloth Product' : 'Add Cloth Product'}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
        >
          <form
            onSubmit={handleSave}
            className="w-full max-w-lg rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 space-y-4 my-auto"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                {editingProduct ? 'Edit Fabric SKU' : 'Add New Cloth Product'}
              </h2>
              <button
                type="button"
                aria-label="Close product modal"
                onClick={() => setShowFormModal(false)}
                className="p-2 rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">
                  Product Name (English)
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sapphire Summer Lawn 3-Piece"
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">
                  Urdu Name (Optional)
                </label>
                <input
                  type="text"
                  value={nameUrdu}
                  onChange={(e) => setNameUrdu(e.target.value)}
                  placeholder="سفائر لان"
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">
                  SKU / QR Code
                </label>
                <input
                  type="text"
                  required
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm font-mono-num"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">
                  Fabric Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as FabricCategory)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm"
                >
                  {FABRIC_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">
                  Unit
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as ProductUnit)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm"
                >
                  {(['Suit', 'Meter', 'Yard', 'Piece'] as ProductUnit[]).map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">
                  Purchase Rate (PKR)
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={purchaseRate}
                  onChange={(e) => setPurchaseRate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm font-mono-num"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">
                  Wholesale Rate (PKR)
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={wholesaleRate}
                  onChange={(e) => setWholesaleRate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm font-mono-num"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">
                  Retail Rate (PKR)
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={retailRate}
                  onChange={(e) => setRetailRate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm font-mono-num"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">
                  Opening / Current Stock
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm font-mono-num"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">
                  Min Stock Alert
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={minStock}
                  onChange={(e) => setMinStock(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm font-mono-num"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">
                  Supplier Name
                </label>
                <input
                  type="text"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="e.g. Faisalabad Looms"
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm"
                />
              </div>
            </div>

            {formError && <p className="text-xs text-red-600">{formError}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-sm font-medium"
              >
                Save Product
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Product QR Label Modal */}
      {qrModalProduct && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Product QR Label"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <div className="w-full max-w-xs rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                Product QR Tag
              </h2>
              <button
                type="button"
                aria-label="Close QR tag modal"
                onClick={() => setQrModalProduct(null)}
                className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div
              id="qr-label-print"
              className="p-4 rounded-xl bg-white text-stone-900 border border-stone-300 text-center space-y-2"
            >
              <p className="text-xs font-bold uppercase tracking-wide">Sitara Cloth House</p>
              {qrImageUrl && (
                <img
                  src={qrImageUrl}
                  alt={`QR Code for ${qrModalProduct.sku}`}
                  className="w-40 h-40 mx-auto"
                />
              )}
              <p className="text-xs font-semibold">{qrModalProduct.name}</p>
              <p className="text-xs font-mono-num">
                {qrModalProduct.sku} · {formatPKR(qrModalProduct.retailRate)}
              </p>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="w-full py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-sm font-medium inline-flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Print QR Sticker
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
