
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { UserProfile } from '@/types';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Force refresh of the token to get custom claims after signup/login.
        await firebaseUser.getIdToken(true);
        
        if (!db) {
            setLoading(false);
            console.error("Firestore is not initialized");
            return;
        }
        const userDocRef = doc(db, "usuarios", firebaseUser.uid);
        const unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const profile = { uid: docSnap.id, ...docSnap.data() } as UserProfile;
            setUser(firebaseUser);
            setUserProfile(profile);
          } else {
            // User is authenticated but has no profile document
            setUser(firebaseUser);
            setUserProfile(null);
          }
          setLoading(false);
        }, (error) => {
            console.error("Error fetching user profile:", error);
            setUser(null);
            setUserProfile(null);
            setLoading(false);
        });

        return () => unsubscribeProfile();
      } else {
        setUser(null);
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []); // Runs only once on mount

  useEffect(() => {
    if (loading) return; // Wait until auth state is determined

    const isAuthPage = pathname === '/' || pathname.startsWith('/signup');
    const isProtectedRoute = pathname.startsWith('/terapeuta') || pathname.startsWith('/paciente');

    if (user) {
        if (userProfile) {
            // User is logged in and has a profile
            if (isAuthPage) {
                if (userProfile.rol === 'terapeuta') {
                    router.replace('/terapeuta');
                } else if (userProfile.rol === 'paciente') {
                    router.replace('/paciente');
                }
            }
        } else {
            // User is logged in but has no profile, redirect to signup to complete it
            if (pathname !== '/signup') {
                router.replace('/signup');
            }
        }
    } else {
        // No user is logged in
        if (isProtectedRoute) {
            router.replace('/');
        }
    }
  }, [user, userProfile, loading, pathname, router]);

  return (
    <AuthContext.Provider value={{ user, userProfile, loading }}>
        {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
