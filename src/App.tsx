import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  BarChart3,
  BookOpen,
  Bot,
  LayoutDashboard,
  Moon,
  Package,
  QrCode,
  Receipt,
  Settings,
  Sun,
} from 'lucide-react';
import { INITIAL_SHOP_STATE } from './data/seedData';
import { TRANSLATIONS } from './i18n/translations';
import {
  auth,
  restoreShopFromFirestore,
  signInWithGooglePopup,
  signOutFirebase,
  syncShopToFirestore,
} from './firebase';
import { useOnlineStatus } from './hooks/usePWAInstall';
import type {
  Expense,
  Invoice,
  KhataEntry,
  Language,
  Party,
  Product,
  Salesman,
  ShopProfile,
  ShopState,
  ThemeMode,
} from './types/shop';
import { applyInvoiceToInventory, type CartDraftItem } from './utils/shopLogic';
import { AiAssistantView } from './components/AiAssistantView';
import { BillingView } from './components/BillingView';
import { DashboardView } from './components/DashboardView';
import { InventoryView } from './components/InventoryView';
import { KhataView } from './components/KhataView';
import { PinLockModal } from './components/PinLockModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { QrScannerModal } from './components/QrScannerModal';
import { ReportsExpensesView } from './components/ReportsExpensesView';
import { SettingsCloudView } from './components/SettingsCloudView';
import { ThermalInvoiceModal } from './components/ThermalInvoiceModal';

type NavTab = 'dashboard' | 'billing' | 'inventory' | 'khata' | 'reports' | 'ai' | 'settings';

const STORAGE_KEY = 'sitara_cloth_house_state_v1';
const LANG_KEY = 'sitara_language_v1';
const THEME_KEY = 'sitara_theme_v1';

function loadInitialState(): ShopState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ShopState;
      if (parsed && Array.isArray(parsed.products) && parsed.profile) {
        return parsed;
      }
    }
  } catch {
    // fallback to seed
  }
  return INITIAL_SHOP_STATE;
}

export default function App() {
  const [state, setState] = useState<ShopState>(loadInitialState);
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem(LANG_KEY);
    return saved === 'ur' ? 'ur' : 'en';
  });
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === 'dark' ? 'dark' : 'light';
  });

  const [cart, setCart] = useState<CartDraftItem[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('autostart=1')) {
      return false;
    }
    return loadInitialState().profile.pinEnabled;
  });

  const isOnline = useOnlineStatus();
  const t = TRANSLATIONS[language];

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore storage quota errors
    }
  }, [state]);

  useEffect(() => {
    localStorage.setItem(LANG_KEY, language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ur' ? 'rtl' : 'ltr';
  }, [language]);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
    });
    return () => unsub();
  }, []);

  // Handlers for business state updates
  const handleCompleteInvoice = (invoice: Invoice) => {
    setState((prev) => {
      const nextProducts = applyInvoiceToInventory(prev.products, invoice.items, invoice.type);
      const historyAdds = invoice.items.map((item) => ({
        id: `sh-${Date.now()}-${item.productId}`,
        productId: item.productId,
        productName: item.name,
        change: invoice.type === 'sale' ? -item.quantity : item.quantity,
        reason: invoice.type,
        reference: invoice.invoiceNumber,
        date: invoice.createdAt,
      }));

      const nextParties = prev.parties.map((party) => {
        if (party.id !== invoice.partyId) return party;
        return {
          ...party,
          balance: invoice.balanceDue,
          updatedAt: invoice.createdAt,
        };
      });

      const billValue = Math.max(0, invoice.subtotal - invoice.discount);
      const nextSalesmen = prev.salesmen.map((sm) => {
        if (sm.id !== invoice.salesmanId || invoice.type !== 'sale') return sm;
        return {
          ...sm,
          totalSales: sm.totalSales + billValue,
          updatedAt: invoice.createdAt,
        };
      });

      const newKhataEntries: KhataEntry[] =
        invoice.partyId
          ? [
              {
                id: `kh-inv-${Date.now()}`,
                partyId: invoice.partyId,
                partyName: invoice.partyName,
                partyType: invoice.type === 'purchase' ? 'supplier' : 'customer',
                entryType: invoice.paidAmount >= invoice.netTotal ? 'credit' : 'debit',
                amount: invoice.paidAmount > 0 ? invoice.paidAmount : billValue,
                note: `${invoice.invoiceNumber} (${invoice.type})`,
                date: invoice.createdAt.slice(0, 10),
                createdAt: invoice.createdAt,
              },
              ...prev.khataEntries,
            ]
          : prev.khataEntries;

      return {
        ...prev,
        products: nextProducts,
        stockHistory: [...historyAdds, ...prev.stockHistory],
        parties: nextParties,
        salesmen: nextSalesmen,
        invoices: [invoice, ...prev.invoices],
        khataEntries: newKhataEntries,
      };
    });
    setPreviewInvoice(invoice);
  };

  const handleAddProduct = (product: Product) => {
    setState((prev) => ({
      ...prev,
      products: [product, ...prev.products],
      stockHistory: [
        {
          id: `sh-${Date.now()}`,
          productId: product.id,
          productName: product.name,
          change: product.stock,
          reason: 'adjustment',
          reference: 'Initial Stock',
          date: product.createdAt,
        },
        ...prev.stockHistory,
      ],
    }));
  };

  const handleUpdateProduct = (updated: Product) => {
    setState((prev) => ({
      ...prev,
      products: prev.products.map((p) => (p.id === updated.id ? updated : p)),
    }));
  };

  const handleDeleteProduct = (id: string) => {
    setState((prev) => ({
      ...prev,
      products: prev.products.filter((p) => p.id !== id),
    }));
  };

  const handleAddParty = (party: Party) => {
    setState((prev) => ({
      ...prev,
      parties: [party, ...prev.parties],
    }));
  };

  const handleAddKhataEntry = (entry: KhataEntry) => {
    setState((prev) => {
      const nextParties = prev.parties.map((p) => {
        if (p.id !== entry.partyId) return p;
        // Credit reduces customer receivable balance; Debit increases balance
        const delta = entry.entryType === 'credit' ? -entry.amount : entry.amount;
        return {
          ...p,
          balance: p.balance + delta,
          updatedAt: entry.createdAt,
        };
      });
      return {
        ...prev,
        parties: nextParties,
        khataEntries: [entry, ...prev.khataEntries],
      };
    });
  };

  const handleDeleteKhataEntry = (id: string) => {
    setState((prev) => ({
      ...prev,
      khataEntries: prev.khataEntries.filter((e) => e.id !== id),
    }));
  };

  const handleAddExpense = (expense: Expense) => {
    setState((prev) => ({
      ...prev,
      expenses: [expense, ...prev.expenses],
    }));
  };

  const handleDeleteExpense = (id: string) => {
    setState((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((e) => e.id !== id),
    }));
  };

  const handleAddSalesman = (salesman: Salesman) => {
    setState((prev) => ({
      ...prev,
      salesmen: [salesman, ...prev.salesmen],
    }));
  };

  const handleUpdateSalesman = (updated: Salesman) => {
    setState((prev) => ({
      ...prev,
      salesmen: prev.salesmen.map((s) => (s.id === updated.id ? updated : s)),
    }));
  };

  const handleDeleteSalesman = (id: string) => {
    setState((prev) => ({
      ...prev,
      salesmen: prev.salesmen.filter((s) => s.id !== id),
    }));
  };

  const handleUpdateProfile = (profile: ShopProfile) => {
    setState((prev) => ({ ...prev, profile }));
  };

  const handleScanMatch = (product: Product) => {
    setCart((prev) => {
      const found = prev.find((c) => c.product.id === product.id);
      if (found) {
        return prev.map((c) =>
          c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setActiveTab('billing');
  };

  const handleAddVoiceItems = (items: CartDraftItem[]) => {
    setCart((prev) => {
      const next = [...prev];
      for (const incoming of items) {
        const idx = next.findIndex((c) => c.product.id === incoming.product.id);
        if (idx >= 0) {
          next[idx] = { ...next[idx], quantity: next[idx].quantity + incoming.quantity };
        } else {
          next.push(incoming);
        }
      }
      return next;
    });
    setActiveTab('billing');
  };

  const handleCloudBackup = async () => {
    if (!firebaseUser) return;
    const syncedAt = await syncShopToFirestore(state, firebaseUser);
    setState((prev) => ({
      ...prev,
      profile: { ...prev.profile, lastBackupAt: syncedAt },
    }));
  };

  const handleCloudRestore = async () => {
    if (!firebaseUser) return;
    const restored = await restoreShopFromFirestore(state, firebaseUser);
    setState((prev) => ({
      ...prev,
      ...restored,
    }));
  };

  const navItems: Array<{ id: NavTab; label: string; icon: React.ReactNode }> = [
    { id: 'dashboard', label: t.navDashboard, icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'billing', label: t.navBilling, icon: <Receipt className="w-4 h-4" /> },
    { id: 'inventory', label: t.navInventory, icon: <Package className="w-4 h-4" /> },
    { id: 'khata', label: t.navKhata, icon: <BookOpen className="w-4 h-4" /> },
    { id: 'reports', label: t.navReports, icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'ai', label: t.navAI, icon: <Bot className="w-4 h-4" /> },
    { id: 'settings', label: t.navSettings, icon: <Settings className="w-4 h-4" /> },
  ];

  const currentNavLabel = navItems.find((n) => n.id === activeTab)?.label || t.brandTitle;

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:start-0 bg-white dark:bg-stone-900 border-e border-stone-200 dark:border-stone-800 z-30">
        <div className="px-5 py-5 border-b border-stone-200 dark:border-stone-800 flex items-center gap-3">
          <img
            src="/src/assets/images/app_icon_emblem_1795234217236.jpg"
            alt="Sitara Cloth House Emblem"
            referrerPolicy="no-referrer"
            className="w-9 h-9 rounded-lg object-cover shrink-0"
          />
          <span className="font-display text-lg font-bold text-stone-900 dark:text-stone-100 whitespace-nowrap truncate">
            {t.brandTitle}
          </span>
        </div>

        <nav aria-label="Primary Sidebar Navigation" className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 min-h-[44px] rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-emerald-800 text-white'
                    : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                {item.icon}
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-stone-200 dark:border-stone-800 space-y-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLanguage(language === 'en' ? 'ur' : 'en')}
              className="flex-1 py-2 rounded-lg border border-stone-200 dark:border-stone-700 text-xs font-medium hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              {language === 'en' ? 'اردو' : 'English'}
            </button>
            <button
              type="button"
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-2 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
          </div>
          <PWAInstallButton compact onOpenInstallGuide={() => setActiveTab('settings')} />
        </div>
      </aside>

      {/* Main Content Shell */}
      <div className="flex-1 lg:ps-64 flex flex-col min-w-0">
        {/* Clean 3-Zone Top Bar (Desktop) & Compact Mobile Header (56px) */}
        <header className="sticky top-0 z-20 h-14 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="lg:hidden font-display text-lg font-bold text-stone-900 dark:text-stone-100 whitespace-nowrap truncate">
              {t.brandTitle}
            </span>
            <span className="hidden lg:inline text-sm font-semibold text-stone-900 dark:text-stone-100 whitespace-nowrap">
              {t.brandTitle} · {currentNavLabel}
            </span>
          </div>

          <p className="hidden md:block text-xs text-stone-500 dark:text-stone-400 font-mono-num whitespace-nowrap" dir="ltr">
            {state.profile.phone} · {state.profile.email}
          </p>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              aria-label="Toggle theme"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="lg:hidden p-2 rounded-lg text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            <button
              type="button"
              aria-label="Open QR scanner"
              onClick={() => setScannerOpen(true)}
              className="lg:hidden p-2 rounded-lg text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              <QrCode className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('billing')}
              className="px-3.5 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-medium whitespace-nowrap shrink-0"
            >
              {t.newBill}
            </button>
          </div>
        </header>

        {/* Main Scrollable Viewport */}
        <main className="flex-1 p-4 sm:p-6 pb-24 lg:pb-8 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              state={state}
              language={language}
              onNavigate={(tab) => setActiveTab(tab)}
              onOpenScanner={() => setScannerOpen(true)}
              onViewInvoice={(id) => {
                const found = state.invoices.find((i) => i.id === id);
                if (found) setPreviewInvoice(found);
              }}
            />
          )}

          {activeTab === 'billing' && (
            <BillingView
              products={state.products}
              parties={state.parties}
              salesmen={state.salesmen}
              invoices={state.invoices}
              language={language}
              cart={cart}
              onChangeCart={setCart}
              onOpenScanner={() => setScannerOpen(true)}
              onCompleteInvoice={handleCompleteInvoice}
              onViewInvoice={(inv) => setPreviewInvoice(inv)}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryView
              products={state.products}
              stockHistory={state.stockHistory}
              language={language}
              onAddProduct={handleAddProduct}
              onUpdateProduct={handleUpdateProduct}
              onDeleteProduct={handleDeleteProduct}
            />
          )}

          {activeTab === 'khata' && (
            <KhataView
              parties={state.parties}
              khataEntries={state.khataEntries}
              profile={state.profile}
              language={language}
              onAddParty={handleAddParty}
              onAddKhataEntry={handleAddKhataEntry}
              onDeleteKhataEntry={handleDeleteKhataEntry}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsExpensesView
              invoices={state.invoices}
              expenses={state.expenses}
              parties={state.parties}
              salesmen={state.salesmen}
              language={language}
              onAddExpense={handleAddExpense}
              onDeleteExpense={handleDeleteExpense}
              onAddSalesman={handleAddSalesman}
              onUpdateSalesman={handleUpdateSalesman}
              onDeleteSalesman={handleDeleteSalesman}
            />
          )}

          {activeTab === 'ai' && (
            <AiAssistantView
              state={state}
              language={language}
              onAddVoiceItemsToCart={handleAddVoiceItems}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsCloudView
              state={state}
              language={language}
              theme={theme}
              firebaseUser={firebaseUser}
              onChangeLanguage={setLanguage}
              onChangeTheme={setTheme}
              onUpdateProfile={handleUpdateProfile}
              onRestoreFullState={setState}
              onGoogleSignIn={async () => {
                await signInWithGooglePopup();
              }}
              onGoogleSignOut={signOutFirebase}
              onCloudBackup={handleCloudBackup}
              onCloudRestore={handleCloudRestore}
              onLockNow={() => setIsLocked(true)}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (60px height, <=15% total sticky height with 56px top bar) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 h-[60px] bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-t border-stone-200 dark:border-stone-800 grid grid-cols-5 items-center"
      >
        {(
          [
            { id: 'dashboard', label: 'Home', icon: <LayoutDashboard className="w-5 h-5" /> },
            { id: 'billing', label: 'Bill', icon: <Receipt className="w-5 h-5" /> },
            { id: 'inventory', label: 'Stock', icon: <Package className="w-5 h-5" /> },
            { id: 'khata', label: 'Khata', icon: <BookOpen className="w-5 h-5" /> },
            { id: 'reports', label: 'More', icon: <BarChart3 className="w-5 h-5" /> },
          ] as Array<{ id: NavTab; label: string; icon: React.ReactNode }>
        ).map((item) => {
          const isMoreGroup =
            item.id === 'reports' &&
            (activeTab === 'reports' || activeTab === 'ai' || activeTab === 'settings');
          const active = activeTab === item.id || isMoreGroup;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`h-full flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
                active
                  ? 'text-emerald-800 dark:text-emerald-400'
                  : 'text-stone-500 dark:text-stone-400'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Mobile Secondary Drawer Strip when in More group (Reports / AI / Settings) */}
      {(activeTab === 'reports' || activeTab === 'ai' || activeTab === 'settings') && (
        <div className="lg:hidden fixed bottom-[60px] left-0 right-0 z-20 bg-stone-100/95 dark:bg-stone-900/95 border-t border-stone-200 dark:border-stone-800 px-3 py-1.5 flex items-center justify-around gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`px-3 py-1 rounded-lg text-xs font-medium ${
              activeTab === 'reports' ? 'bg-emerald-800 text-white' : 'text-stone-600 dark:text-stone-300'
            }`}
          >
            Reports &amp; Expenses
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`px-3 py-1 rounded-lg text-xs font-medium ${
              activeTab === 'ai' ? 'bg-emerald-800 text-white' : 'text-stone-600 dark:text-stone-300'
            }`}
          >
            Smart AI
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1 rounded-lg text-xs font-medium ${
              activeTab === 'settings' ? 'bg-emerald-800 text-white' : 'text-stone-600 dark:text-stone-300'
            }`}
          >
            Cloud &amp; App
          </button>
        </div>
      )}

      {/* Offline Mode Toast */}
      {!isOnline && (
        <div className="fixed bottom-20 left-4 z-40 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white shadow-lg">
          Offline Mode — Local shop cache active
        </div>
      )}

      {/* Modals */}
      <QrScannerModal
        isOpen={scannerOpen}
        products={state.products}
        onClose={() => setScannerOpen(false)}
        onMatchProduct={handleScanMatch}
      />

      <ThermalInvoiceModal
        invoice={previewInvoice}
        profile={state.profile}
        onClose={() => setPreviewInvoice(null)}
      />

      {isLocked && state.profile.pinEnabled && (
        <PinLockModal
          expectedPin={state.profile.pinHash}
          biometricEnabled={state.profile.biometricEnabled}
          onUnlock={() => setIsLocked(false)}
        />
      )}
    </div>
  );
}
