import type {
  Expense,
  ExpenseCategory,
  Invoice,
  InvoiceItem,
  InvoiceType,
  Party,
  PriceMode,
  Product,
  Salesman,
} from '../types/shop';

export const FABRIC_CATEGORIES = [
  'Lawn',
  'Cotton',
  'Khaddar',
  'Linen',
  'Silk',
  'Chiffon',
  'Velvet',
  'Organza',
  'Other',
] as const;

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Goods & Transport',
  'Tea',
  'Cold Drinks',
  'Fast Food',
  'Electricity Bill 1',
  'Electricity Bill 2',
  'Electricity Bill 3',
  'Shop Rent & Maintenance',
  'Staff Salaries',
  'Other Daily Expenses',
];

export interface CartDraftItem {
  product: Product;
  quantity: number;
  customRate?: number;
}

export interface InvoiceCalculation {
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  previousBalance: number;
  netTotal: number;
  paidAmount: number;
  balanceDue: number;
  profit: number;
}

export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

export function formatPKR(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  const sign = safe < 0 ? '-' : '';
  return `${sign}Rs. ${Math.abs(safe).toLocaleString('en-PK')}`;
}

export function getRateForMode(product: Product, mode: PriceMode, type: InvoiceType): number {
  if (type === 'purchase') return product.purchaseRate;
  return mode === 'wholesale' ? product.wholesaleRate : product.retailRate;
}

export function calculateInvoiceTotals(params: {
  draftItems: CartDraftItem[];
  priceMode: PriceMode;
  type: InvoiceType;
  discount: number;
  previousBalance: number;
  paidAmount: number;
}): InvoiceCalculation {
  const { draftItems, priceMode, type, discount, previousBalance, paidAmount } = params;
  const safeDiscount = Math.max(0, roundMoney(discount));
  const safePaid = Math.max(0, roundMoney(paidAmount));
  const safePrev = roundMoney(previousBalance);

  const items: InvoiceItem[] = draftItems
    .filter((d) => d.quantity > 0)
    .map((d) => {
      const rate =
        typeof d.customRate === 'number' && d.customRate >= 0
          ? d.customRate
          : getRateForMode(d.product, priceMode, type);
      const lineTotal = roundMoney(rate * d.quantity);
      return {
        productId: d.product.id,
        sku: d.product.sku,
        name: d.product.name,
        unit: d.product.unit,
        quantity: d.quantity,
        rate,
        purchaseRate: d.product.purchaseRate,
        lineTotal,
      };
    });

  const subtotal = roundMoney(items.reduce((sum, item) => sum + item.lineTotal, 0));
  const afterDiscount = Math.max(0, roundMoney(subtotal - safeDiscount));
  const netTotal =
    type === 'return'
      ? roundMoney(safePrev - afterDiscount)
      : roundMoney(afterDiscount + safePrev);
  const balanceDue = roundMoney(netTotal - safePaid);

  let profit = 0;
  if (type === 'sale') {
    const cost = items.reduce((sum, item) => sum + item.purchaseRate * item.quantity, 0);
    profit = roundMoney(afterDiscount - cost);
  } else if (type === 'return') {
    const cost = items.reduce((sum, item) => sum + item.purchaseRate * item.quantity, 0);
    profit = -roundMoney(afterDiscount - cost);
  }

  return {
    items,
    subtotal,
    discount: safeDiscount,
    previousBalance: safePrev,
    netTotal,
    paidAmount: safePaid,
    balanceDue,
    profit,
  };
}

export function applyInvoiceToInventory(
  products: Product[],
  items: InvoiceItem[],
  type: InvoiceType
): Product[] {
  const qtyMap = new Map<string, number>();
  for (const item of items) {
    qtyMap.set(item.productId, (qtyMap.get(item.productId) ?? 0) + item.quantity);
  }

  const now = new Date().toISOString();
  return products.map((product) => {
    const delta = qtyMap.get(product.id);
    if (!delta) return product;
    const nextStock =
      type === 'sale' ? Math.max(0, product.stock - delta) : product.stock + delta;
    return {
      ...product,
      stock: roundMoney(nextStock),
      updatedAt: now,
    };
  });
}

export function getLowStockProducts(products: Product[]): Product[] {
  return products.filter((p) => p.stock <= p.minStock);
}

export function computeSalesmanPay(salesman: Salesman): {
  commissionEarned: number;
  grossPay: number;
  netPayable: number;
} {
  const commissionEarned = roundMoney((salesman.totalSales * salesman.commissionRate) / 100);
  const grossPay = roundMoney(salesman.fixedSalary + commissionEarned);
  const netPayable = Math.max(0, roundMoney(grossPay - salesman.advances - salesman.deductions));
  return { commissionEarned, grossPay, netPayable };
}

export interface FinancialReportSummary {
  totalSales: number;
  totalPurchases: number;
  totalReturns: number;
  cashReceived: number;
  outstandingReceivables: number;
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
  expenseByCategory: Record<ExpenseCategory, number>;
}

export function isDateInPeriod(
  isoDate: string,
  period: 'daily' | 'monthly' | 'yearly' | 'all',
  referenceDate: Date = new Date()
): boolean {
  if (period === 'all') return true;
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return false;
  if (period === 'daily') {
    return (
      d.getUTCFullYear() === referenceDate.getUTCFullYear() &&
      d.getUTCMonth() === referenceDate.getUTCMonth() &&
      d.getUTCDate() === referenceDate.getUTCDate()
    );
  }
  if (period === 'monthly') {
    return (
      d.getUTCFullYear() === referenceDate.getUTCFullYear() &&
      d.getUTCMonth() === referenceDate.getUTCMonth()
    );
  }
  return d.getUTCFullYear() === referenceDate.getUTCFullYear();
}

export function computeFinancialReport(params: {
  invoices: Invoice[];
  expenses: Expense[];
  parties: Party[];
  period: 'daily' | 'monthly' | 'yearly' | 'all';
  referenceDate?: Date;
}): FinancialReportSummary {
  const { invoices, expenses, parties, period, referenceDate = new Date() } = params;

  let totalSales = 0;
  let totalPurchases = 0;
  let totalReturns = 0;
  let cashReceived = 0;
  let grossProfit = 0;

  for (const inv of invoices) {
    if (!isDateInPeriod(inv.createdAt, period, referenceDate)) continue;
    const billValue = Math.max(0, inv.subtotal - inv.discount);
    if (inv.type === 'sale') {
      totalSales += billValue;
      cashReceived += inv.paidAmount;
      grossProfit += inv.profit;
    } else if (inv.type === 'purchase') {
      totalPurchases += billValue;
    } else if (inv.type === 'return') {
      totalReturns += billValue;
      grossProfit += inv.profit;
    }
  }

  const expenseByCategory = EXPENSE_CATEGORIES.reduce(
    (acc, cat) => {
      acc[cat] = 0;
      return acc;
    },
    {} as Record<ExpenseCategory, number>
  );

  let totalExpenses = 0;
  for (const exp of expenses) {
    if (!isDateInPeriod(exp.date || exp.createdAt, period, referenceDate)) continue;
    totalExpenses += exp.amount;
    expenseByCategory[exp.category] = roundMoney((expenseByCategory[exp.category] ?? 0) + exp.amount);
  }

  const outstandingReceivables = parties
    .filter((p) => p.type === 'customer' && p.balance > 0)
    .reduce((sum, p) => sum + p.balance, 0);

  return {
    totalSales: roundMoney(totalSales),
    totalPurchases: roundMoney(totalPurchases),
    totalReturns: roundMoney(totalReturns),
    cashReceived: roundMoney(cashReceived),
    outstandingReceivables: roundMoney(outstandingReceivables),
    grossProfit: roundMoney(grossProfit),
    totalExpenses: roundMoney(totalExpenses),
    netProfit: roundMoney(grossProfit - totalExpenses),
    expenseByCategory,
  };
}

export function normalizePakistanPhone(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('00')) return digits.slice(2);
  if (digits.startsWith('0') && digits.length === 11) {
    return `92${digits.slice(1)}`;
  }
  if (digits.startsWith('3') && digits.length === 10) {
    return `92${digits}`;
  }
  return digits;
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const normalized = normalizePakistanPhone(phone);
  const encoded = encodeURIComponent(message);
  return normalized ? `https://wa.me/${normalized}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}

export function formatInvoiceWhatsAppMessage(invoice: Invoice, shopName: string, shopPhone: string): string {
  const lines = [
    `*${shopName}* (${shopPhone})`,
    `Invoice: ${invoice.invoiceNumber}`,
    `Customer: ${invoice.partyName}`,
    `Date: ${new Date(invoice.createdAt).toLocaleDateString('en-PK')}`,
    '---',
    ...invoice.items.map(
      (i) => `${i.name} x ${i.quantity} ${i.unit} = ${formatPKR(i.lineTotal)}`
    ),
    '---',
    `Bill Subtotal: ${formatPKR(invoice.subtotal)}`,
    ...(invoice.discount > 0 ? [`Discount: -${formatPKR(invoice.discount)}`] : []),
    ...(invoice.previousBalance !== 0 ? [`Prev Balance: ${formatPKR(invoice.previousBalance)}`] : []),
    `*Net Total: ${formatPKR(invoice.netTotal)}*`,
    `Paid: ${formatPKR(invoice.paidAmount)}`,
    `Balance Due: ${formatPKR(invoice.balanceDue)}`,
    '',
    'Thank you for shopping at Sitara Cloth House!',
  ];
  return lines.join('\n');
}
