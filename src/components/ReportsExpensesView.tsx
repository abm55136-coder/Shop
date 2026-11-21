import React, { useState } from 'react';
import { Plus, Trash2, Users } from 'lucide-react';
import type {
  Expense,
  ExpenseCategory,
  Invoice,
  Language,
  Party,
  Salesman,
} from '../types/shop';
import { TRANSLATIONS } from '../i18n/translations';
import {
  computeFinancialReport,
  computeSalesmanPay,
  EXPENSE_CATEGORIES,
  formatPKR,
} from '../utils/shopLogic';

interface Props {
  invoices: Invoice[];
  expenses: Expense[];
  parties: Party[];
  salesmen: Salesman[];
  language: Language;
  onAddExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
  onAddSalesman: (salesman: Salesman) => void;
  onUpdateSalesman: (salesman: Salesman) => void;
  onDeleteSalesman: (id: string) => void;
}

export const ReportsExpensesView: React.FC<Props> = ({
  invoices,
  expenses,
  parties,
  salesmen,
  language,
  onAddExpense,
  onDeleteExpense,
  onAddSalesman,
  onUpdateSalesman,
  onDeleteSalesman,
}) => {
  const t = TRANSLATIONS[language];
  const [activeTab, setActiveTab] = useState<'reports' | 'expenses' | 'salesmen'>('reports');
  const [period, setPeriod] = useState<'daily' | 'monthly' | 'yearly' | 'all'>('monthly');

  // Expense form
  const [expCategory, setExpCategory] = useState<ExpenseCategory>('Tea');
  const [expTitle, setExpTitle] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expDate, setExpDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expNote, setExpNote] = useState('');

  // Salesman form
  const [smName, setSmName] = useState('');
  const [smPhone, setSmPhone] = useState('');
  const [smSalary, setSmSalary] = useState('25000');
  const [smCommission, setSmCommission] = useState('2');

  const report = computeFinancialReport({
    invoices,
    expenses,
    parties,
    period,
  });

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(expAmount);
    if (!Number.isFinite(amt) || amt <= 0) return;
    onAddExpense({
      id: `exp-${Date.now()}`,
      category: expCategory,
      title: expTitle.trim() || expCategory,
      amount: amt,
      date: expDate,
      note: expNote.trim() || undefined,
      createdAt: new Date().toISOString(),
    });
    setExpTitle('');
    setExpAmount('');
    setExpNote('');
  };

  const handleSaveSalesman = (e: React.FormEvent) => {
    e.preventDefault();
    if (!smName.trim()) return;
    const now = new Date().toISOString();
    onAddSalesman({
      id: `sal-${Date.now()}`,
      name: smName.trim(),
      phone: smPhone.trim(),
      fixedSalary: Math.max(0, Number(smSalary) || 0),
      commissionRate: Math.min(100, Math.max(0, Number(smCommission) || 0)),
      advances: 0,
      deductions: 0,
      totalSales: 0,
      active: true,
      createdAt: now,
      updatedAt: now,
    });
    setSmName('');
    setSmPhone('');
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-stone-100 dark:bg-stone-800 overflow-x-auto">
          {(
            [
              ['reports', t.reportsTab],
              ['expenses', t.expensesTab],
              ['salesmen', t.salesmenTab],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                activeTab === key
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-600 dark:text-stone-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab !== 'salesmen' && (
          <div className="flex items-center gap-1 p-1 rounded-xl bg-stone-100 dark:bg-stone-800">
            {(['daily', 'monthly', 'yearly', 'all'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                  period === p
                    ? 'bg-emerald-800 text-white'
                    : 'text-stone-600 dark:text-stone-400'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Profit & Financial Reports */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 space-y-1">
              <p className="text-xs text-stone-500 dark:text-stone-400">Total Sales</p>
              <p className="text-xl font-bold font-mono-num text-stone-900 dark:text-stone-100">
                {formatPKR(report.totalSales)}
              </p>
            </div>
            <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 space-y-1">
              <p className="text-xs text-stone-500 dark:text-stone-400">Total Purchases</p>
              <p className="text-xl font-bold font-mono-num text-stone-900 dark:text-stone-100">
                {formatPKR(report.totalPurchases)}
              </p>
            </div>
            <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 space-y-1">
              <p className="text-xs text-stone-500 dark:text-stone-400">Operating Expenses</p>
              <p className="text-xl font-bold font-mono-num text-red-600 dark:text-red-400">
                {formatPKR(report.totalExpenses)}
              </p>
            </div>
            <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 space-y-1">
              <p className="text-xs text-stone-500 dark:text-stone-400">Net Profit</p>
              <p
                className={`text-xl font-bold font-mono-num ${
                  report.netProfit >= 0
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {formatPKR(report.netProfit)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-5 space-y-3">
              <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                Expense Breakdown ({period})
              </h2>
              <div className="divide-y divide-stone-100 dark:divide-stone-800 text-sm">
                {EXPENSE_CATEGORIES.map((cat) => (
                  <div key={cat} className="py-2.5 flex items-center justify-between">
                    <span className="text-stone-700 dark:text-stone-300">{cat}</span>
                    <span className="font-mono-num font-medium text-stone-900 dark:text-stone-100">
                      {formatPKR(report.expenseByCategory[cat] || 0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-5 space-y-3">
              <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                Cash Flow &amp; Receivables
              </h2>
              <div className="divide-y divide-stone-100 dark:divide-stone-800 text-sm">
                <div className="py-2.5 flex justify-between">
                  <span className="text-stone-600 dark:text-stone-400">Gross Margin Profit</span>
                  <span className="font-mono-num font-semibold">{formatPKR(report.grossProfit)}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-stone-600 dark:text-stone-400">Cash Collected on Sales</span>
                  <span className="font-mono-num font-semibold text-emerald-700 dark:text-emerald-400">
                    {formatPKR(report.cashReceived)}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-stone-600 dark:text-stone-400">Outstanding Customer Khata</span>
                  <span className="font-mono-num font-semibold text-amber-700 dark:text-amber-400">
                    {formatPKR(report.outstandingReceivables)}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-stone-600 dark:text-stone-400">Returns Deducted</span>
                  <span className="font-mono-num font-semibold">{formatPKR(report.totalReturns)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shop Expenses */}
      {activeTab === 'expenses' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleSaveExpense}
            className="lg:col-span-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-5 space-y-4"
          >
            <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
              Log Shop Expense
            </h2>

            <div>
              <label
                htmlFor="exp-category"
                className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1"
              >
                Expense Category
              </label>
              <select
                id="exp-category"
                value={expCategory}
                onChange={(e) => setExpCategory(e.target.value as ExpenseCategory)}
                className="w-full px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm"
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="exp-title"
                className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1"
              >
                Description
              </label>
              <input
                id="exp-title"
                type="text"
                value={expTitle}
                onChange={(e) => setExpTitle(e.target.value)}
                placeholder={`e.g. ${expCategory} payment`}
                className="w-full px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="exp-amount"
                  className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1"
                >
                  Amount (PKR)
                </label>
                <input
                  id="exp-amount"
                  type="number"
                  required
                  min={1}
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm font-mono-num"
                />
              </div>
              <div>
                <label
                  htmlFor="exp-date"
                  className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1"
                >
                  Date
                </label>
                <input
                  id="exp-date"
                  type="date"
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm font-mono-num"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full min-h-[44px] py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-sm font-medium inline-flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Expense
            </button>
          </form>

          <div className="lg:col-span-7 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 divide-y divide-stone-100 dark:divide-stone-800">
            <div className="p-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                Shop Expense Register ({expenses.length})
              </h2>
              <span className="text-xs font-mono-num text-red-600 dark:text-red-400 font-semibold">
                Total: {formatPKR(report.totalExpenses)}
              </span>
            </div>
            {expenses.map((exp) => (
              <div key={exp.id} className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">
                    {exp.title}
                  </p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {exp.category} · {exp.date}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-bold font-mono-num text-stone-900 dark:text-stone-100">
                    {formatPKR(exp.amount)}
                  </span>
                  <button
                    type="button"
                    aria-label={`Delete expense ${exp.title}`}
                    onClick={() => onDeleteExpense(exp.id)}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Salesman Management */}
      {activeTab === 'salesmen' && (
        <div className="space-y-6">
          <form
            onSubmit={handleSaveSalesman}
            className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-5 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end"
          >
            <div>
              <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">
                Salesman Name
              </label>
              <input
                type="text"
                required
                value={smName}
                onChange={(e) => setSmName(e.target.value)}
                placeholder="e.g. Kashif Ali"
                className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={smPhone}
                onChange={(e) => setSmPhone(e.target.value)}
                placeholder="03xx..."
                className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">
                Monthly Salary
              </label>
              <input
                type="number"
                min={0}
                value={smSalary}
                onChange={(e) => setSmSalary(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">
                Commission %
              </label>
              <input
                type="number"
                step="0.5"
                min={0}
                max={100}
                value={smCommission}
                onChange={(e) => setSmCommission(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm font-mono-num"
              />
            </div>
            <button
              type="submit"
              className="min-h-[40px] px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-sm font-medium inline-flex items-center justify-center gap-1.5"
            >
              <Users className="w-4 h-4" />
              Add Salesman
            </button>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {salesmen.map((sm) => {
              const pay = computeSalesmanPay(sm);
              return (
                <div
                  key={sm.id}
                  className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-5 space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100">
                        {sm.name}
                      </h3>
                      <p className="text-xs text-stone-500 dark:text-stone-400 font-mono-num">
                        {sm.phone || 'No phone'} · {sm.commissionRate}% commission
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove salesman ${sm.name}`}
                      onClick={() => onDeleteSalesman(sm.id)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800">
                      <span className="text-stone-500 dark:text-stone-400 block">Total Sales</span>
                      <span className="font-mono-num font-bold text-stone-900 dark:text-stone-100">
                        {formatPKR(sm.totalSales)}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800">
                      <span className="text-stone-500 dark:text-stone-400 block">Net Payable</span>
                      <span className="font-mono-num font-bold text-emerald-700 dark:text-emerald-400">
                        {formatPKR(pay.netPayable)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-stone-500 dark:text-stone-400 mb-1">
                        Advances Taken
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={sm.advances}
                        onChange={(e) =>
                          onUpdateSalesman({
                            ...sm,
                            advances: Math.max(0, Number(e.target.value) || 0),
                            updatedAt: new Date().toISOString(),
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-mono-num"
                      />
                    </div>
                    <div>
                      <label className="block text-stone-500 dark:text-stone-400 mb-1">
                        Deductions
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={sm.deductions}
                        onChange={(e) =>
                          onUpdateSalesman({
                            ...sm,
                            deductions: Math.max(0, Number(e.target.value) || 0),
                            updatedAt: new Date().toISOString(),
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-mono-num"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
