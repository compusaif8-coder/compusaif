import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  address?: string;
  phone?: string;
  city?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signInWithGoogleRedirect: () => Promise<{ success: boolean; error?: string }>;
  signOutUser: () => Promise<{ success: boolean; error?: string }>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            setUserProfile(userDoc.data() as UserProfile);
          } else {
            // Create new profile if not exists
            const newProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email || '',
              displayName: currentUser.displayName || '',
              photoURL: currentUser.photoURL || '',
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            await setDoc(doc(db, 'users', currentUser.uid), newProfile);
            setUserProfile(newProfile);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          // Fallback to minimal profile from Auth to avoid blocking UI
          setUserProfile({
            uid: currentUser.uid,
            email: currentUser.email || '',
            displayName: currentUser.displayName || '',
            photoURL: currentUser.photoURL || '',
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const signInWithGoogleRedirect = async () => {
    // Mock or implement if needed
    return { success: false, error: "Not implemented" };
  };

  const signOutUser = async () => {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!user || !user.uid) return { success: false, error: "No user logged in" };
    try {
      await setDoc(doc(db, 'users', user.uid), updates, { merge: true });
      setUserProfile(prev => prev ? { ...prev, ...updates } : null);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    signInWithGoogle,
    signInWithGoogleRedirect,
    signOutUser,
    updateUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 