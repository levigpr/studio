"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
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
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, "usuarios", firebaseUser.uid);
        
        const unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
          setLoading(true); // Reset loading state on profile change
          if (docSnap.exists()) {
            const profile = { uid: docSnap.id, ...docSnap.data() } as UserProfile;
            setUser(firebaseUser);
            setUserProfile(profile);

            const isAuthPage = pathname === '/' || pathname.startsWith('/signup');
            
            if (profile.rol === "terapeuta" && isAuthPage) {
              router.replace("/terapeuta");
            } else if (profile.rol === "paciente" && isAuthPage) {
              router.replace("/paciente");
            } else {
               setLoading(false);
            }
          } else {
            // User in Auth but not Firestore.
            setUser(firebaseUser);
            setUserProfile(null);
            if (pathname !== '/signup') {
              router.replace('/signup');
            } else {
              setLoading(false);
            }
          }
        });
        
        return () => unsubscribeProfile();

      } else {
        // User is not logged in
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