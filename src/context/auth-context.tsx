"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, DocumentData } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { UserProfile } from '@/types';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

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
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, "usuarios", firebaseUser.uid);
        const unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const profile = { uid: docSnap.id, ...docSnap.data() } as UserProfile;
            setUser(firebaseUser);
            setUserProfile(profile);

            const isAuthPage = pathname === '/' || pathname.startsWith('/signup');
            if (isAuthPage) {
                if (profile.rol === "terapeuta") {
                    router.replace("/terapeuta");
                } else if (profile.rol === "paciente") {
                    router.replace("/paciente");
                }
            } else {
                setLoading(false);
            }
          } else {
            setUser(firebaseUser);
            setUserProfile(null);
            if (pathname !== '/signup') {
                router.replace('/signup');
            } else {
                setLoading(false);
            }
          }
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
        const isProtectedRoute = pathname.startsWith('/terapeuta') || pathname.startsWith('/paciente');
        if (isProtectedRoute) {
          router.replace('/');
        }
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, [pathname, router]);

  // The loading state from the context now primarily indicates if user data is available.
  // The initial "whole page" loader is handled by the AppContent component now.
  return (
    <AuthContext.Provider value={{ user, userProfile, loading }}>
        {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
