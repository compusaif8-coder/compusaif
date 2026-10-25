import { doc, getDoc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export type DashboardPermission =
  | 'analytics'       // إحصائيات الزوار
  | 'profit-analysis' // تحليل الأرباح
  | 'orders'          // إدارة الطلبات
  | 'admin'           // لوحة إدارة المنتجات
  | 'works'           // عرض المواصفات
  | 'cashier'         // الكاشير
  | 'attendance'      // الحضور والغياب
  | 'visitor-logs'    // سجل الزوار المفصل
  | 'superadmin'      // cp superadmin level 2
  | 'site-customizer'; // تخصيص الموقع

export interface DashboardUser {
  id: string;
  username: string;
  password: string; // plain text stored in Firestore (admin-controlled)
  permissions: DashboardPermission[];
  displayName: string;
  createdAt: string;
  isActive: boolean;
}

export interface DashboardSession {
  userId: string;
  username: string;
  displayName: string;
  permissions: DashboardPermission[];
  expiresAt: string;
}

const SESSION_KEY = 'dashboard_user_session';
const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 hours

export const PERMISSION_LABELS: Record<DashboardPermission, string> = {
  analytics: 'إحصائيات الزوار',
  'profit-analysis': 'تحليل الأرباح',
  orders: 'إدارة الطلبات',
  admin: 'إدارة المنتجات',
  works: 'عرض المواصفات',
  cashier: 'الكاشير',
  attendance: 'الحضور والغياب',
  'visitor-logs': 'سجل الزوار المفصل',
  superadmin: 'CP Superadmin Level 2',
  'site-customizer': 'تخصيص الموقع',
};

export const PERMISSION_ROUTES: Record<DashboardPermission, string> = {
  analytics: '/analytics',
  'profit-analysis': '/profit-analysis',
  orders: '/orders',
  admin: '/admin',
  works: '/works',
  cashier: '/cashier',
  attendance: '/attendance',
  'visitor-logs': '/visitor-logs',
  superadmin: '/cp',
  'site-customizer': '/site-customizer',
};

// ─── Session Management ───────────────────────────────────────────────────────

export function getDashboardSession(): DashboardSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session: DashboardSession = JSON.parse(raw);
    if (new Date() > new Date(session.expiresAt)) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function saveDashboardSession(session: DashboardSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearDashboardSession(): void {
  localStorage.removeItem(SESSION_KEY);
  // keep backward compat flag cleared too
  localStorage.removeItem('dashboard_auth');
}

export function hasPermission(permission: DashboardPermission): boolean {
  const session = getDashboardSession();
  if (!session) return false;
  return session.permissions.includes(permission);
}

export function hasAnyPermission(permissions: DashboardPermission[]): boolean {
  const session = getDashboardSession();
  if (!session) return false;
  return permissions.some(p => session.permissions.includes(p));
}

// ─── Refresh permissions from Firestore ──────────────────────────────────────
// Silently updates the cached session with the latest permissions from Firestore
export async function refreshSessionPermissions(
  session: DashboardSession
): Promise<DashboardSession | null> {
  try {
    const usersRef = collection(db, 'dashboard_users');
    const snapshot = await getDocs(usersRef);
    let updated: DashboardUser | null = null;
    snapshot.forEach(docSnap => {
      if (docSnap.id === session.userId) {
        updated = { id: docSnap.id, ...docSnap.data() } as DashboardUser;
      }
    });
    if (!updated) return null;
    const user = updated as DashboardUser;
    if (user.isActive === false) {
      clearDashboardSession();
      return null;
    }
    const newSession: DashboardSession = {
      ...session,
      displayName: user.displayName || session.displayName,
      permissions: user.permissions || [],
    };
    saveDashboardSession(newSession);
    return newSession;
  } catch {
    return null; // silently fail – don't break existing session
  }
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function loginDashboardUser(
  username: string,
  password: string
): Promise<{ success: boolean; session?: DashboardSession; error?: string }> {
  try {
    const usersRef = collection(db, 'dashboard_users');
    const snapshot = await getDocs(usersRef);

    let matchedUser: DashboardUser | null = null;
    snapshot.forEach(docSnap => {
      const data = docSnap.data() as Omit<DashboardUser, 'id'>;
      if (
        data.username.trim().toLowerCase() === username.trim().toLowerCase() &&
        data.password === password &&
        data.isActive !== false
      ) {
        matchedUser = { id: docSnap.id, ...data };
      }
    });

    if (!matchedUser) {
      return { success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
    }

    const user = matchedUser as DashboardUser;
    const session: DashboardSession = {
      userId: user.id,
      username: user.username,
      displayName: user.displayName || user.username,
      permissions: user.permissions || [],
      expiresAt: new Date(Date.now() + SESSION_DURATION).toISOString(),
    };

    saveDashboardSession(session);
    // keep backward compat
    localStorage.setItem('dashboard_auth', 'true');

    return { success: true, session };
  } catch (err: any) {
    return { success: false, error: err.message || 'حدث خطأ في تسجيل الدخول' };
  }
}

// ─── User CRUD (Admin) ────────────────────────────────────────────────────────

export async function getAllDashboardUsers(): Promise<DashboardUser[]> {
  const snapshot = await getDocs(collection(db, 'dashboard_users'));
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DashboardUser));
}

export async function createDashboardUser(
  data: Omit<DashboardUser, 'id' | 'createdAt'>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check username uniqueness
    const existing = await getAllDashboardUsers();
    if (existing.some(u => u.username.toLowerCase() === data.username.toLowerCase())) {
      return { success: false, error: 'اسم المستخدم موجود بالفعل' };
    }

    const newDoc = doc(collection(db, 'dashboard_users'));
    await setDoc(newDoc, {
      ...data,
      createdAt: new Date().toISOString(),
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateDashboardUser(
  id: string,
  data: Partial<Omit<DashboardUser, 'id' | 'createdAt'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    await setDoc(doc(db, 'dashboard_users', id), data, { merge: true });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteDashboardUser(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteDoc(doc(db, 'dashboard_users', id));
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
