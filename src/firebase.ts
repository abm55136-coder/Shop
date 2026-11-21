import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDocFromServer,
  getDocs,
  getFirestore,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import type { ShopState } from './types/shop';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
      return false;
    }
    return true;
  }
}

testConnection();

export async function signInWithGooglePopup(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutFirebase(): Promise<void> {
  await signOut(auth);
}

function sanitizeId(raw: string): string {
  const clean = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
  return clean || `id_${Date.now()}`;
}

function clampStr(val: string | undefined, max: number): string {
  return (val ?? '').slice(0, max);
}

export async function syncShopToFirestore(state: ShopState, user: User): Promise<string> {
  const shopId = sanitizeId(user.uid);
  const shopPath = `shops/${shopId}`;

  try {
    await setDoc(
      doc(db, 'shops', shopId),
      {
        ownerId: shopId,
        shopName: clampStr(state.profile.shopName || 'Sitara Cloth House', 120),
        phone: clampStr(state.profile.phone, 32),
        email: clampStr(state.profile.email, 120),
        currency: 'PKR',
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, shopPath);
  }

  const batch = writeBatch(db);

  for (const p of state.products.slice(0, 120)) {
    const pid = sanitizeId(p.id);
    batch.set(doc(db, 'shops', shopId, 'products', pid), {
      ownerId: shopId,
      sku: clampStr(p.sku, 64),
      name: clampStr(p.name, 140),
      nameUrdu: clampStr(p.nameUrdu, 140),
      category: p.category,
      unit: p.unit,
      purchaseRate: Number(p.purchaseRate) || 0,
      wholesaleRate: Number(p.wholesaleRate) || 0,
      retailRate: Number(p.retailRate) || 0,
      stock: Math.max(0, Number(p.stock) || 0),
      minStock: Math.max(0, Number(p.minStock) || 0),
      supplierName: clampStr(p.supplierName, 120),
      qrCode: clampStr(p.qrCode || p.sku, 128),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  for (const party of state.parties.slice(0, 120)) {
    const pid = sanitizeId(party.id);
    batch.set(doc(db, 'shops', shopId, 'parties', pid), {
      ownerId: shopId,
      type: party.type,
      name: clampStr(party.name, 120),
      phone: clampStr(party.phone, 32),
      address: clampStr(party.address, 240),
      balance: Number(party.balance) || 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  for (const inv of state.invoices.slice(0, 80)) {
    const iid = sanitizeId(inv.id);
    if (!inv.items.length) continue;
    batch.set(doc(db, 'shops', shopId, 'invoices', iid), {
      ownerId: shopId,
      invoiceNumber: clampStr(inv.invoiceNumber, 64),
      type: inv.type,
      priceMode: inv.priceMode,
      partyId: clampStr(inv.partyId, 128),
      partyName: clampStr(inv.partyName, 120),
      salesmanId: clampStr(inv.salesmanId, 128),
      salesmanName: clampStr(inv.salesmanName, 120),
      subtotal: Number(inv.subtotal) || 0,
      discount: Math.max(0, Number(inv.discount) || 0),
      previousBalance: Number(inv.previousBalance) || 0,
      netTotal: Number(inv.netTotal) || 0,
      paidAmount: Math.max(0, Number(inv.paidAmount) || 0),
      balanceDue: Number(inv.balanceDue) || 0,
      profit: Number(inv.profit) || 0,
      status: inv.status,
      items: inv.items.slice(0, 50),
      createdAt: serverTimestamp(),
    });
  }

  for (const k of state.khataEntries.slice(0, 100)) {
    const kid = sanitizeId(k.id);
    batch.set(doc(db, 'shops', shopId, 'khata', kid), {
      ownerId: shopId,
      partyId: clampStr(k.partyId, 128) || 'general',
      partyName: clampStr(k.partyName, 120),
      partyType: k.partyType,
      entryType: k.entryType,
      amount: Math.max(0, Number(k.amount) || 0),
      note: clampStr(k.note, 500),
      detectedAmount: Math.max(0, Number(k.detectedAmount) || 0),
      date: clampStr(k.date, 32),
      createdAt: serverTimestamp(),
    });
  }

  for (const ex of state.expenses.slice(0, 100)) {
    const eid = sanitizeId(ex.id);
    batch.set(doc(db, 'shops', shopId, 'expenses', eid), {
      ownerId: shopId,
      category: ex.category,
      title: clampStr(ex.title, 140),
      amount: Math.max(0, Number(ex.amount) || 0),
      date: clampStr(ex.date, 32),
      note: clampStr(ex.note, 400),
      createdAt: serverTimestamp(),
    });
  }

  for (const sm of state.salesmen.slice(0, 50)) {
    const sid = sanitizeId(sm.id);
    batch.set(doc(db, 'shops', shopId, 'salesmen', sid), {
      ownerId: shopId,
      name: clampStr(sm.name, 120),
      phone: clampStr(sm.phone, 32),
      fixedSalary: Math.max(0, Number(sm.fixedSalary) || 0),
      commissionRate: Math.min(100, Math.max(0, Number(sm.commissionRate) || 0)),
      advances: Math.max(0, Number(sm.advances) || 0),
      deductions: Math.max(0, Number(sm.deductions) || 0),
      totalSales: Math.max(0, Number(sm.totalSales) || 0),
      active: Boolean(sm.active),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  const backupId = `bk_${Date.now()}`;
  const totalCount =
    state.products.length +
    state.parties.length +
    state.invoices.length +
    state.khataEntries.length +
    state.expenses.length +
    state.salesmen.length;

  batch.set(doc(db, 'shops', shopId, 'backups', backupId), {
    ownerId: shopId,
    label: `Cloud Sync ${new Date().toLocaleString('en-PK')}`.slice(0, 120),
    recordCount: totalCount,
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${shopPath}/batch`);
  }

  return new Date().toISOString();
}

export async function restoreShopFromFirestore(
  currentState: ShopState,
  user: User
): Promise<Partial<ShopState>> {
  const shopId = sanitizeId(user.uid);
  const readSub = async (sub: string) => {
    try {
      const snap = await getDocs(collection(db, 'shops', shopId, sub));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Array<Record<string, unknown>>;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `shops/${shopId}/${sub}`);
    }
  };

  const [productsRaw, partiesRaw, invoicesRaw, khataRaw, expensesRaw, salesmenRaw] =
    await Promise.all([
      readSub('products'),
      readSub('parties'),
      readSub('invoices'),
      readSub('khata'),
      readSub('expenses'),
      readSub('salesmen'),
    ]);

  const toIso = (val: unknown) => {
    if (val && typeof val === 'object' && 'toDate' in val && typeof (val as { toDate: () => Date }).toDate === 'function') {
      return (val as { toDate: () => Date }).toDate().toISOString();
    }
    return typeof val === 'string' ? val : new Date().toISOString();
  };

  return {
    products: productsRaw.length
      ? productsRaw.map((p) => ({
          ...(p as unknown as ShopState['products'][number]),
          createdAt: toIso(p.createdAt),
          updatedAt: toIso(p.updatedAt),
        }))
      : currentState.products,
    parties: partiesRaw.length
      ? partiesRaw.map((p) => ({
          ...(p as unknown as ShopState['parties'][number]),
          createdAt: toIso(p.createdAt),
          updatedAt: toIso(p.updatedAt),
        }))
      : currentState.parties,
    invoices: invoicesRaw.length
      ? invoicesRaw.map((i) => ({
          ...(i as unknown as ShopState['invoices'][number]),
          createdAt: toIso(i.createdAt),
        }))
      : currentState.invoices,
    khataEntries: khataRaw.length
      ? khataRaw.map((k) => ({
          ...(k as unknown as ShopState['khataEntries'][number]),
          createdAt: toIso(k.createdAt),
        }))
      : currentState.khataEntries,
    expenses: expensesRaw.length
      ? expensesRaw.map((e) => ({
          ...(e as unknown as ShopState['expenses'][number]),
          createdAt: toIso(e.createdAt),
        }))
      : currentState.expenses,
    salesmen: salesmenRaw.length
      ? salesmenRaw.map((s) => ({
          ...(s as unknown as ShopState['salesmen'][number]),
          createdAt: toIso(s.createdAt),
          updatedAt: toIso(s.updatedAt),
        }))
      : currentState.salesmen,
  };
}
