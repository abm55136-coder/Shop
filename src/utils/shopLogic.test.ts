import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyInvoiceToInventory,
  buildWhatsAppUrl,
  calculateInvoiceTotals,
  computeFinancialReport,
  computeSalesmanPay,
  getLowStockProducts,
  normalizePakistanPhone,
} from './shopLogic';
import type { Expense, Invoice, Party, Product, Salesman } from '../types/shop';

const sampleProduct: Product = {
  id: 'p1',
  sku: 'SCH-1001',
  name: 'Gul Ahmed Classic Lawn 3Pc',
  category: 'Lawn',
  unit: 'Suit',
  purchaseRate: 2800,
  wholesaleRate: 3400,
  retailRate: 3950,
  stock: 20,
  minStock: 5,
  qrCode: 'SCH-1001',
  createdAt: '2026-11-20T10:00:00.000Z',
  updatedAt: '2026-11-20T10:00:00.000Z',
};

test('calculateInvoiceTotals computes retail & wholesale sales with previous balance and profit', () => {
  const retail = calculateInvoiceTotals({
    draftItems: [{ product: sampleProduct, quantity: 2 }],
    priceMode: 'retail',
    type: 'sale',
    discount: 200,
    previousBalance: 1500,
    paidAmount: 5000,
  });

  assert.equal(retail.subtotal, 7900);
  assert.equal(retail.netTotal, 9200); // 7900 - 200 + 1500
  assert.equal(retail.balanceDue, 4200); // 9200 - 5000
  assert.equal(retail.profit, 2100); // (7900 - 200) - (2800 * 2)

  const wholesale = calculateInvoiceTotals({
    draftItems: [{ product: sampleProduct, quantity: 5 }],
    priceMode: 'wholesale',
    type: 'sale',
    discount: 0,
    previousBalance: 0,
    paidAmount: 17000,
  });
  assert.equal(wholesale.subtotal, 17000);
  assert.equal(wholesale.balanceDue, 0);
  assert.equal(wholesale.profit, 3000);
});

test('applyInvoiceToInventory decrements on sale and increments on purchase or return', () => {
  const afterSale = applyInvoiceToInventory(
    [sampleProduct],
    [
      {
        productId: 'p1',
        sku: 'SCH-1001',
        name: 'Gul Ahmed Classic Lawn 3Pc',
        unit: 'Suit',
        quantity: 6,
        rate: 3950,
        purchaseRate: 2800,
        lineTotal: 23700,
      },
    ],
    'sale'
  );
  assert.equal(afterSale[0].stock, 14);

  const afterReturn = applyInvoiceToInventory(
    afterSale,
    [
      {
        productId: 'p1',
        sku: 'SCH-1001',
        name: 'Gul Ahmed Classic Lawn 3Pc',
        unit: 'Suit',
        quantity: 2,
        rate: 3950,
        purchaseRate: 2800,
        lineTotal: 7900,
      },
    ],
    'return'
  );
  assert.equal(afterReturn[0].stock, 16);
});

test('getLowStockProducts identifies low-stock thresholds', () => {
  const low: Product = { ...sampleProduct, id: 'p2', stock: 4, minStock: 5 };
  const ok: Product = { ...sampleProduct, id: 'p3', stock: 12, minStock: 5 };
  assert.deepEqual(
    getLowStockProducts([low, ok]).map((p) => p.id),
    ['p2']
  );
});

test('computeSalesmanPay calculates fixed salary + commission - advances - deductions', () => {
  const s: Salesman = {
    id: 's1',
    name: 'Bilal Ahmad',
    phone: '03001234567',
    fixedSalary: 25000,
    commissionRate: 2,
    advances: 3000,
    deductions: 500,
    totalSales: 200000,
    active: true,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-20T00:00:00.000Z',
  };
  const pay = computeSalesmanPay(s);
  assert.equal(pay.commissionEarned, 4000);
  assert.equal(pay.grossPay, 29000);
  assert.equal(pay.netPayable, 25500);
});

test('computeFinancialReport accurately aggregates sales, expenses, and net profit', () => {
  const ref = new Date('2026-11-20T12:00:00.000Z');
  const invoices: Invoice[] = [
    {
      id: 'inv1',
      invoiceNumber: 'INV-1001',
      type: 'sale',
      priceMode: 'retail',
      partyName: 'Walk-in',
      items: [],
      subtotal: 10000,
      discount: 500,
      previousBalance: 0,
      netTotal: 9500,
      paidAmount: 8000,
      balanceDue: 1500,
      profit: 2500,
      status: 'completed',
      createdAt: '2026-11-20T10:00:00.000Z',
    },
  ];
  const expenses: Expense[] = [
    {
      id: 'ex1',
      category: 'Tea',
      title: 'Staff & Guest Tea',
      amount: 450,
      date: '2026-11-20T11:00:00.000Z',
      createdAt: '2026-11-20T11:00:00.000Z',
    },
    {
      id: 'ex2',
      category: 'Electricity Bill 1',
      title: 'Shop Meter 1',
      amount: 1200,
      date: '2026-11-20T09:00:00.000Z',
      createdAt: '2026-11-20T09:00:00.000Z',
    },
  ];
  const parties: Party[] = [
    {
      id: 'c1',
      type: 'customer',
      name: 'Ayesha Boutique',
      phone: '03425984394',
      balance: 14500,
      createdAt: '2026-11-01T00:00:00.000Z',
      updatedAt: '2026-11-20T00:00:00.000Z',
    },
  ];

  const report = computeFinancialReport({
    invoices,
    expenses,
    parties,
    period: 'daily',
    referenceDate: ref,
  });

  assert.equal(report.totalSales, 9500);
  assert.equal(report.cashReceived, 8000);
  assert.equal(report.grossProfit, 2500);
  assert.equal(report.totalExpenses, 1650);
  assert.equal(report.netProfit, 850);
  assert.equal(report.outstandingReceivables, 14500);
  assert.equal(report.expenseByCategory['Tea'], 450);
  assert.equal(report.expenseByCategory['Electricity Bill 1'], 1200);
});

test('normalizePakistanPhone and buildWhatsAppUrl format local numbers cleanly', () => {
  assert.equal(normalizePakistanPhone('03425984394'), '923425984394');
  assert.equal(normalizePakistanPhone('+92 342 5984394'), '923425984394');
  const url = buildWhatsAppUrl('03425984394', 'Salam Sitara');
  assert.equal(url, 'https://wa.me/923425984394?text=Salam%20Sitara');
});
