import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, query, where, updateDoc, increment } from 'firebase/firestore';

export interface Coupon {
  id?: string;
  code: string;
  type: 'fixed' | 'percentage';
  value: number;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  usageLimit?: number; 
  usedCount?: number;  
  validFrom?: string;  
  validUntil?: string; 
  applicableProductIds?: string[];
}

const COUPONS_COLLECTION = 'coupons';

// Fetch all coupons from Firebase
export const getAllCoupons = async (): Promise<Coupon[]> => {
  try {
    const snapshot = await getDocs(collection(db, COUPONS_COLLECTION));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Coupon));
  } catch (err) {
    console.error('Error fetching coupons:', err);
    return [];
  }
};

// Add a new coupon to Firebase
export const addCouponToFirebase = async (coupon: Omit<Coupon, 'id'>): Promise<Coupon> => {
  const cleanData = Object.entries(coupon).reduce((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key] = value;
    }
    return acc;
  }, {} as any);

  const docRef = await addDoc(collection(db, COUPONS_COLLECTION), {
    ...cleanData,
    code: coupon.code.trim().toUpperCase(),
    usedCount: 0,
    createdAt: new Date().toISOString(),
  });
  return { id: docRef.id, ...coupon };
};

// Delete a coupon from Firebase
export const deleteCouponFromFirebase = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, COUPONS_COLLECTION, id));
};

// Update an existing coupon in Firebase
export const updateCouponInFirebase = async (id: string, updates: Partial<Coupon>): Promise<void> => {
  const cleanData = Object.entries(updates).reduce((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key] = value;
    }
    return acc;
  }, {} as any);
  await updateDoc(doc(db, COUPONS_COLLECTION, id), cleanData);
};

// Check a coupon code against Firebase - returns Coupon or null with error
export const checkCoupon = async (code: string): Promise<{coupon: Coupon | null, error?: string}> => {
  if (!code) return { coupon: null, error: 'الرجاء إدخال كود الكوبون' };
  const upperCode = code.trim().toUpperCase();
  try {
    const q = query(
      collection(db, COUPONS_COLLECTION),
      where('code', '==', upperCode),
      where('isActive', '==', true)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return { coupon: null, error: 'كوبون غير صالح أو غير مفعل' };
    const d = snapshot.docs[0];
    const couponData = { id: d.id, ...d.data() } as Coupon;

    if (couponData.usageLimit && couponData.usageLimit > 0) {
      if ((couponData.usedCount || 0) >= couponData.usageLimit) {
        return { coupon: null, error: `عذراً، هذا الكوبون متاح لأول ${couponData.usageLimit} مستخدمين فقط وقد تم استخدامه بالكامل` };
      }
    }

    const now = new Date();
    if (couponData.validFrom && new Date(couponData.validFrom) > now) {
       return { coupon: null, error: 'موعد تفعيل هذا الكوبون لم يبدأ بعد' };
    }
    if (couponData.validUntil && new Date(couponData.validUntil) < now) {
       return { coupon: null, error: 'هذا الكوبون منتهي الصلاحية' };
    }

    return { coupon: couponData };
  } catch (err) {
    console.error('Error checking coupon:', err);
    return { coupon: null, error: 'حدث خطأ أثناء التحقق من الكوبون' };
  }
};

// Increment the usage of a coupon after an order is placed
export const incrementCouponUsage = async (couponId: string): Promise<void> => {
  if (!couponId) return;
  try {
    const docRef = doc(db, COUPONS_COLLECTION, couponId);
    await updateDoc(docRef, {
      usedCount: increment(1)
    });
  } catch (err) {
    console.error('Error incrementing coupon usage:', err);
  }
};
