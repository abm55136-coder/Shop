export type Language = 'en' | 'ur';
export type ThemeMode = 'light' | 'dark';
export type PriceMode = 'retail' | 'wholesale';
export type InvoiceType = 'sale' | 'purchase' | 'return';
export type ThermalPaperWidth = '58mm' | '80mm';

export type FabricCategory =
  | 'Lawn'
  | 'Cotton'
  | 'Khaddar'
  | 'Linen'
  | 'Silk'
  | 'Chiffon'
  | 'Velvet'
  | 'Organza'
  | 'Other';

export type ProductUnit = 'Suit' | 'Meter' | 'Yard' | 'Piece';

export type ExpenseCategory =
  | 'Goods & Transport'
  | 'Tea'
  | 'Cold Drinks'
  | 'Fast Food'
  | 'Electricity Bill 1'
  | 'Electricity Bill 2'
  | 'Electricity Bill 3'
  | 'Shop Rent & Maintenance'
  | 'Staff Salaries'
  | 'Other Daily Expenses';

export interface Product {
  id: string;
  sku: string;
  name: string;
  nameUrdu?: string;
  category: FabricCategory;
  unit: ProductUnit;
  purchaseRate: number;
  wholesaleRate: number;
  retailRate: number;
  stock: number;
  minStock: number;
  supplierName?: string;
  qrCode: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockHistoryEntry {
  id: string;
  productId: string;
  productName: string;
  change: number;
  reason: 'sale' | 'purchase' | 'return' | 'adjustment';
  reference?: string;
  date: string;
}

export interface Party {
  id: string;
  type: 'customer' | 'supplier';
  name: string;
  phone: string;
  address?: string;
  balance: number; // positive = receivable from customer / payable to supplier
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  productId: string;
  sku: string;
  name: string;
  unit: ProductUnit;
  quantity: number;
  rate: number;
  purchaseRate: number;
  lineTotal: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  type: InvoiceType;
  priceMode: PriceMode;
  partyId?: string;
  partyName: string;
  partyPhone?: string;
  salesmanId?: string;
  salesmanName?: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  previousBalance: number;
  netTotal: number;
  paidAmount: number;
  balanceDue: number;
  profit: number;
  status: 'completed' | 'returned';
  createdAt: string;
}

export interface KhataEntry {
  id: string;
  partyId: string;
  partyName: string;
  partyType: 'customer' | 'supplier' | 'cashbook';
  entryType: 'credit' | 'debit';
  amount: number;
  note: string;
  receiptImageDataUrl?: string;
  detectedAmount?: number;
  date: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  category: ExpenseCategory;
  title: string;
  amount: number;
  date: string;
  note?: string;
  createdAt: string;
}

export interface Salesman {
  id: string;
  name: string;
  phone: string;
  fixedSalary: number;
  commissionRate: number;
  advances: number;
  deductions: number;
  totalSales: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ShopProfile {
  shopName: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  whatsappEnabled: boolean;
  pinEnabled: boolean;
  pinHash: string; // simple salted 4-digit PIN
  biometricEnabled: boolean;
  autoLockMinutes: number;
  autoBackupEnabled: boolean;
  lastBackupAt?: string;
}

export interface ShopState {
  profile: ShopProfile;
  products: Product[];
  stockHistory: StockHistoryEntry[];
  parties: Party[];
  invoices: Invoice[];
  khataEntries: KhataEntry[];
  expenses: Expense[];
  salesmen: Salesman[];
}
