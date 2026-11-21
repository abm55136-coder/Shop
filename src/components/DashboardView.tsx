import React from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Bot,
  BookOpen,
  Package,
  QrCode,
  Receipt,
  Wallet,
} from 'lucide-react';
import type { Language, ShopState } from '../types/shop';
import { TRANSLATIONS } from '../i18n/translations';
import {
  computeFinancialReport,
  formatPKR,
  getLowStockProducts,
} from '../utils/shopLogic';

interface Props {
  state: ShopState;
  language: Language;
  onNavigate: (tab: 'billing' | 'inventory' | 'khata' | 'reports' | 'ai' | 'settings') => void;
  onOpenScanner: () => void;
  onViewInvoice: (invoiceId: string) => void;
}

export const DashboardView: React.FC<Props> = ({
  state,
  language,
  onNavigate,
  onOpenScanner,
  onViewInvoice,
}) => {
  const t = TRANSLATIONS[language];
  const dailyReport = computeFinancialReport({
    invoices: state.invoices,
    expenses: state.expenses,
    parties: state.parties,
    period: 'daily',
  });
  const monthlyReport = computeFinancialReport({
    invoices: state.invoices,
    expenses: state.expenses,
    parties: state.parties,
    period: 'monthly',
  });
  const lowStock = getLowStockProducts(state.products);

  // Build 6-category revenue vs cost bar summary for clean visual chart
  const categoryTotals = state.products.reduce(
    (acc, p) => {
      const value = p.stock * p.retailRate;
      acc[p.category] = (acc[p.category] ?? 0) + value;
      return acc;
    },
    {} as Record<string, number>
  );
  const topCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const maxCatVal = Math.max(1, ...topCategories.map((c) => c[1]));

  return (
    <div className="space-y-6">
      {/* Executive Showroom Split Banner */}
      <section className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch">
        <div className="lg:col-span-7 p-5 sm:p-6 lg:p-8 flex flex-col justify-between gap-5">
          <div className="space-y-2">
            <p className="text-xs font-medium text-emerald-800 dark:text-emerald-400" dir="ltr">
              {state.profile.shopName} · {state.profile.phone} · {state.profile.email}
            </p>
            <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-stone-900 dark:text-stone-100 leading-tight [text-wrap:balance]">
              {language === 'ur'
                ? 'ستارہ کلاتھ ہاؤس — مکمل سمارٹ بزنس مینجمنٹ'
                : 'Complete Textile Billing, Khata & Inventory Control'}
            </h1>
            <p className="text-sm text-stone-600 dark:text-stone-400 max-w-xl leading-relaxed">
              {language === 'ur'
                ? 'موبائل بلنگ، پرچون اور ہول سیل ریٹس، کیو آر کوڈ اسکینر، ڈیجیٹل کھاتہ، اخراجات اور اے آئی بزنس مینیجر ایک ہی جگہ۔'
                : 'Fast retail and wholesale invoicing with 58mm/80mm thermal QR receipts, live fabric stock tracking, customer Khata, and AI-assisted business insights.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => onNavigate('billing')}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-sm font-medium inline-flex items-center gap-2 transition-colors whitespace-nowrap"
            >
              <Receipt className="w-4 h-4" />
              {t.newBill}
            </button>
            <button
              type="button"
              onClick={onOpenScanner}
              className="min-h-[44px] px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-100 text-sm font-medium inline-flex items-center gap-2 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors whitespace-nowrap"
            >
              <QrCode className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              {t.scanQR}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('ai')}
              className="min-h-[44px] px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 text-sm font-medium inline-flex items-center gap-2 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors whitespace-nowrap"
            >
              <Bot className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              {t.navAI}
            </button>
          </div>
        </div>

        <div className="lg:col-span-5 h-44 sm:h-52 lg:h-auto lg:min-h-[260px] bg-stone-200 dark:bg-stone-800 relative">
          <img
            src="/src/assets/images/sitara_showroom_clean_1795234443332.jpg"
            alt="Sitara Cloth House Showroom Interior"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent flex items-end p-4 sm:p-5">
            <p className="text-xs text-stone-100 font-medium">
              {state.products.length} Active Fabric SKUs · {state.parties.length} Khata Accounts
            </p>
          </div>
        </div>
      </section>

      {/* 4-Column KPI Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4" aria-label="Key Financial Metrics">
        <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 sm:p-5 space-y-1.5">
          <p className="text-xs font-medium text-stone-500 dark:text-stone-400">{t.todaySales}</p>
          <p className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100 font-mono-num" dir="ltr">
            {formatPKR(dailyReport.totalSales)}
          </p>
          <p className="text-xs text-stone-500 dark:text-stone-400 font-mono-num" dir="ltr">
            Month: {formatPKR(monthlyReport.totalSales)}
          </p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 sm:p-5 space-y-1.5">
          <p className="text-xs font-medium text-stone-500 dark:text-stone-400">{t.netProfit}</p>
          <p
            dir="ltr"
            className={`text-xl sm:text-2xl font-bold font-mono-num ${
              monthlyReport.netProfit >= 0
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {formatPKR(monthlyReport.netProfit)}
          </p>
          <p className="text-xs text-stone-500 dark:text-stone-400 font-mono-num" dir="ltr">
            Gross: {formatPKR(monthlyReport.grossProfit)}
          </p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 sm:p-5 space-y-1.5">
          <p className="text-xs font-medium text-stone-500 dark:text-stone-400">
            {t.outstandingKhata}
          </p>
          <p className="text-xl sm:text-2xl font-bold text-amber-700 dark:text-amber-400 font-mono-num" dir="ltr">
            {formatPKR(monthlyReport.outstandingReceivables)}
          </p>
          <p className="text-xs text-stone-500 dark:text-stone-400 font-mono-num" dir="ltr">
            Cash Rec: {formatPKR(monthlyReport.cashReceived)}
          </p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 sm:p-5 space-y-1.5">
          <p className="text-xs font-medium text-stone-500 dark:text-stone-400">
            {t.lowStockAlerts}
          </p>
          <p className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100 font-mono-num">
            {lowStock.length}
          </p>
          <button
            type="button"
            onClick={() => onNavigate('inventory')}
            className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
          >
            Inspect Stock <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* Main Content Split: Recent Invoices + Low Stock / Category Valuation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
              {t.recentInvoices}
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('billing')}
              className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              Create New Bill
            </button>
          </div>

          {state.invoices.length === 0 ? (
            <p className="text-sm text-stone-500 dark:text-stone-400 py-6 text-center">
              No invoices recorded yet. Start by creating a retail or wholesale bill.
            </p>
          ) : (
            <div className="divide-y divide-stone-100 dark:divide-stone-800">
              {state.invoices.slice(0, 5).map((inv) => (
                <div
                  key={inv.id}
                  className="py-3 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">
                      {inv.partyName}
                    </p>
                    <p className="text-xs text-stone-500 dark:text-stone-400 font-mono-num">
                      {inv.invoiceNumber} · {inv.priceMode} · {inv.items.length} items
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-stone-900 dark:text-stone-100 font-mono-num">
                        {formatPKR(inv.netTotal)}
                      </p>
                      <p className="text-xs text-stone-500 dark:text-stone-400 font-mono-num">
                        Due: {formatPKR(inv.balanceDue)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onViewInvoice(inv.id)}
                      className="px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 text-xs font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
                    >
                      Receipt
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="lg:col-span-5 space-y-6">
          {/* Inventory Valuation by Fabric Type */}
          <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
                Stock Value by Fabric
              </h2>
              <span className="text-xs text-stone-500 dark:text-stone-400">Retail Value</span>
            </div>
            <div className="space-y-3">
              {topCategories.map(([cat, val]) => {
                const pct = Math.max(8, Math.round((val / maxCatVal) * 100));
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-stone-700 dark:text-stone-300">{cat}</span>
                      <span className="font-mono-num text-stone-900 dark:text-stone-100">
                        {formatPKR(val)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-700 dark:bg-emerald-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Low Stock Alerts */}
          <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100 inline-flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Low Stock Watchlist
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('inventory')}
                className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
              >
                Restock
              </button>
            </div>
            {lowStock.length === 0 ? (
              <p className="text-xs text-stone-500 dark:text-stone-400">
                All fabric varieties are above minimum stock levels.
              </p>
            ) : (
              <div className="divide-y divide-stone-100 dark:divide-stone-800">
                {lowStock.slice(0, 4).map((p) => (
                  <div key={p.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-stone-800 dark:text-stone-200 truncate">
                      {p.name}
                    </span>
                    <span className="font-mono-num text-red-600 dark:text-red-400 shrink-0">
                      {p.stock} / min {p.minStock} {p.unit}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Quick Module Launch Strip */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => onNavigate('inventory')}
          className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-left hover:border-emerald-700 dark:hover:border-emerald-600 transition-colors space-y-1.5"
        >
          <Package className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
          <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">{t.navInventory}</p>
          <p className="text-xs text-stone-500 dark:text-stone-400">A-Z Fabrics &amp; QR Tags</p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('khata')}
          className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-left hover:border-emerald-700 dark:hover:border-emerald-600 transition-colors space-y-1.5"
        >
          <BookOpen className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
          <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">{t.navKhata}</p>
          <p className="text-xs text-stone-500 dark:text-stone-400">Customer &amp; Receipt OCR</p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('reports')}
          className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-left hover:border-emerald-700 dark:hover:border-emerald-600 transition-colors space-y-1.5"
        >
          <Wallet className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
          <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">{t.navReports}</p>
          <p className="text-xs text-stone-500 dark:text-stone-400">Profit, Bills &amp; Payroll</p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('ai')}
          className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-left hover:border-emerald-700 dark:hover:border-emerald-600 transition-colors space-y-1.5"
        >
          <Bot className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
          <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">{t.navAI}</p>
          <p className="text-xs text-stone-500 dark:text-stone-400">Voice Bill &amp; Urdu AI</p>
        </button>
      </section>
    </div>
  );
};
