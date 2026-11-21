import type { Language } from '../types/shop';

export const TRANSLATIONS: Record<
  Language,
  {
    brandTitle: string;
    brandTagline: string;
    navDashboard: string;
    navBilling: string;
    navInventory: string;
    navKhata: string;
    navReports: string;
    navAI: string;
    navSettings: string;
    newBill: string;
    scanQR: string;
    todaySales: string;
    netProfit: string;
    cashReceived: string;
    lowStockAlerts: string;
    outstandingKhata: string;
    quickActions: string;
    recentInvoices: string;
    retail: string;
    wholesale: string;
    sale: string;
    purchase: string;
    returnLabel: string;
    addToBill: string;
    subtotal: string;
    discount: string;
    previousBalance: string;
    netTotal: string;
    paidAmount: string;
    balanceDue: string;
    completeInvoice: string;
    print58mm: string;
    print80mm: string;
    shareWhatsApp: string;
    addProduct: string;
    customerKhata: string;
    supplierKhata: string;
    cashBook: string;
    uploadBillPhoto: string;
    expensesTab: string;
    salesmenTab: string;
    reportsTab: string;
    aiManagerTitle: string;
    voiceBillTitle: string;
    cloudBackupTitle: string;
    securityTitle: string;
    installAppTitle: string;
    languageLabel: string;
    themeLabel: string;
    lightMode: string;
    darkMode: string;
    allCategories: string;
    searchPlaceholder: string;
    walkInCustomer: string;
    selectSalesman: string;
    emptyCart: string;
  }
> = {
  en: {
    brandTitle: 'Sitara Cloth House',
    brandTagline: 'Smart AI Billing · Digital Khata · Inventory',
    navDashboard: 'Dashboard',
    navBilling: 'Billing',
    navInventory: 'Inventory',
    navKhata: 'Khata',
    navReports: 'Reports & Expenses',
    navAI: 'Smart AI',
    navSettings: 'Cloud & Security',
    newBill: 'New Bill',
    scanQR: 'Scan QR',
    todaySales: 'Today Sales',
    netProfit: 'Net Profit',
    cashReceived: 'Cash Received',
    lowStockAlerts: 'Low Stock Alerts',
    outstandingKhata: 'Receivable Khata',
    quickActions: 'Quick Shop Actions',
    recentInvoices: 'Recent Invoices',
    retail: 'Retail Rate',
    wholesale: 'Wholesale Rate',
    sale: 'Sale',
    purchase: 'Purchase',
    returnLabel: 'Return',
    addToBill: 'Add',
    subtotal: 'Subtotal',
    discount: 'Discount',
    previousBalance: 'Previous Balance',
    netTotal: 'Net Payable',
    paidAmount: 'Cash Received',
    balanceDue: 'Remaining Balance',
    completeInvoice: 'Generate Invoice & Print',
    print58mm: '58mm Thermal',
    print80mm: '80mm Thermal',
    shareWhatsApp: 'Share on WhatsApp',
    addProduct: 'Add Cloth Product',
    customerKhata: 'Customer Khata',
    supplierKhata: 'Supplier Khata',
    cashBook: 'Daily Cash Book',
    uploadBillPhoto: 'Upload Bill Photo (AI Scan)',
    expensesTab: 'Shop Expenses',
    salesmenTab: 'Salesmen & Payroll',
    reportsTab: 'Profit & Financial Reports',
    aiManagerTitle: 'AI Business Manager (Urdu & English)',
    voiceBillTitle: 'Smart Voice & Natural Order Billing',
    cloudBackupTitle: 'Cloud Backup & Phone Storage',
    securityTitle: 'PIN & Biometric Security',
    installAppTitle: 'Android & Mobile App Installation',
    languageLabel: 'Language',
    themeLabel: 'Theme',
    lightMode: 'Light',
    darkMode: 'Dark',
    allCategories: 'All Fabrics',
    searchPlaceholder: 'Search Lawn, Cotton, Silk, SKU or QR...',
    walkInCustomer: 'Walk-in Cash Customer',
    selectSalesman: 'No Salesman Assigned',
    emptyCart: 'Tap or scan any fabric SKU to start billing',
  },
  ur: {
    brandTitle: 'ستارہ کلاتھ ہاؤس',
    brandTagline: 'سمارٹ اے آئی بلنگ · ڈیجیٹل کھاتہ · انوینٹری',
    navDashboard: 'ڈیش بورڈ',
    navBilling: 'بلنگ / سیلز',
    navInventory: 'اسٹاک / کپڑا',
    navKhata: 'ڈیجیٹل کھاتہ',
    navReports: 'رپورٹس اور اخراجات',
    navAI: 'سمارٹ اے آئی',
    navSettings: 'کلاؤڈ اور سیکیورٹی',
    newBill: 'نیا بل بنائیں',
    scanQR: 'کیو آر اسکین',
    todaySales: 'آج کی فروخت',
    netProfit: 'خالص منافع',
    cashReceived: 'وصول شدہ نقدی',
    lowStockAlerts: 'کم اسٹاک الرٹ',
    outstandingKhata: 'واجب الادا کھاتہ',
    quickActions: 'فوری دکان ایکشنز',
    recentInvoices: 'حالیہ بل / رسیدیں',
    retail: 'پرچون ریٹ',
    wholesale: 'ہول سیل ریٹ',
    sale: 'فروخت',
    purchase: 'خریداری',
    returnLabel: 'واپسی',
    addToBill: 'شامل کریں',
    subtotal: 'کل رقم',
    discount: 'رعایت',
    previousBalance: 'سابقہ بقایا',
    netTotal: 'کل واجب الادا',
    paidAmount: 'وصول رقم',
    balanceDue: 'بقایا بیلنس',
    completeInvoice: 'بل محفوظ اور پرنٹ کریں',
    print58mm: '58mm پرنٹ',
    print80mm: '80mm پرنٹ',
    shareWhatsApp: 'واٹس ایپ پر بھیجیں',
    addProduct: 'نیا کپڑا شامل کریں',
    customerKhata: 'کسٹمر کھاتہ',
    supplierKhata: 'سپلائر کھاتہ',
    cashBook: 'روزنامچہ کیش بک',
    uploadBillPhoto: 'بل کی تصویر اپلوڈ کریں (AI)',
    expensesTab: 'دکان کے اخراجات',
    salesmenTab: 'سیلز مین اور تنخواہ',
    reportsTab: 'منافع اور مالیاتی رپورٹس',
    aiManagerTitle: 'اے آئی بزنس مینیجر (اردو اور انگریزی)',
    voiceBillTitle: 'سمارٹ وائس بلنگ',
    cloudBackupTitle: 'کلاؤڈ بیک اپ اور سنک',
    securityTitle: 'پن اور فنگر پرنٹ سیکیورٹی',
    installAppTitle: 'اینڈرائیڈ ایپ انسٹالیشن',
    languageLabel: 'زبان',
    themeLabel: 'تھیم',
    lightMode: 'لائٹ',
    darkMode: 'ڈارک',
    allCategories: 'تمام کپڑے',
    searchPlaceholder: 'لان، کاٹن، سلک، کوڈ یا کیو آر تلاش کریں...',
    walkInCustomer: 'نقد گاہک (Walk-in)',
    selectSalesman: 'کوئی سیلز مین نہیں',
    emptyCart: 'بل شروع کرنے کے لیے کپڑا منتخب یا اسکین کریں',
  },
};
