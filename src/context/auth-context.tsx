
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { UserProfile } from '@/types';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  user: (User & { rol?: string }) | null;
  userProfile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<(User & { rol?: string }) | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        if (!db) {
            console.error("Firestore is not initialized");
            setLoading(false);
            return;
        }

        const userDocRef = doc(db, "usuarios", firebaseUser.uid);

        // Listen for real-time profile updates
        const unsubscribeProfile = onSnapshot(userDocRef, async (docSnap) => {
          let finalUser = { ...firebaseUser, rol: undefined } as (User & { rol?: string });
          let finalProfile: UserProfile | null = null;
          
          if (docSnap.exists()) {
            finalProfile = { uid: docSnap.id, ...docSnap.data() } as UserProfile;
            finalUser.rol = finalProfile.rol;
          }
          
          setUser(finalUser);
          setUserProfile(finalProfile);
          setLoading(false);

        }, (error) => {
            console.error("Error fetching user profile with onSnapshot:", error);
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
            // User is authenticated but has no profile document yet.
            // This can happen briefly during signup. We don't redirect,
            // we wait for the onSnapshot listener to provide the profile.
            // If it remains null after a timeout, could redirect to an error page.
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
