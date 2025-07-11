"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { UserProfile } from '@/types';
import { usePathname, useRouter } from 'next/navigation';
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
    if (!auth || !db) {
      setLoading(false);
      // We can't do anything without firebase, so just let the page render.
      // It will likely show login/signup pages correctly.
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is logged in
        const docRef = doc(db, "usuarios", firebaseUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const profile = { uid: docSnap.id, ...docSnap.data() } as UserProfile;
          setUser(firebaseUser);
          setUserProfile(profile);

          // Redirect if on an auth page
          const isAuthPage = pathname === '/' || pathname.startsWith('/signup');
          if (profile.rol === "terapeuta" && isAuthPage) {
            router.replace("/terapeuta");
          } else if (profile.rol === "paciente" && isAuthPage) {
            router.replace("/paciente");
          } else {
             setLoading(false);
          }
        } else {
          // User exists in Auth but not in Firestore, treat as logged out
          // You might want to redirect to a profile setup page here in the future
          setUser(null);
          setUserProfile(null);
          setLoading(false);
        }
      } else {
        // User is not logged in
        setUser(null);
        setUserProfile(null);
        
        // If on a protected page, redirect to home
        const isProtectedRoute = pathname.startsWith('/terapeuta') || pathname.startsWith('/paciente');
        if (isProtectedRoute) {
          router.replace('/');
        } else {
          setLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, [pathname, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, userProfile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);