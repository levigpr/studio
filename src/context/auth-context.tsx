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
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true); // Start loading when auth state changes
      if (firebaseUser) {
        // User is logged in
        const docRef = doc(db, "usuarios", firebaseUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const profile = { uid: docSnap.id, ...docSnap.data() } as UserProfile;
          setUser(firebaseUser);
          setUserProfile(profile);
          
          const isAuthPage = pathname === '/' || pathname.startsWith('/signup');

          if (profile.rol === "terapeuta" && isAuthPage) {
            router.replace("/terapeuta");
          } else if (profile.rol === "paciente" && isAuthPage) {
            router.replace("/paciente");
          }
        } else {
          // User in Auth but not Firestore, log them out
          await auth.signOut();
          setUser(null);
          setUserProfile(null);
        }
      } else {
        // User is not logged in
        setUser(null);
        setUserProfile(null);
        
        const isProtectedRoute = pathname.startsWith('/terapeuta') || pathname.startsWith('/paciente');
        if (isProtectedRoute) {
          router.replace('/');
        }
      }
      // This ensures the loading spinner is turned off in all cases
      setLoading(false);
    });

    return () => unsubscribe();
  }, [pathname, router]);

  // While the initial auth state is being determined, show a loader.
  // This prevents content flashing and ensures redirection logic runs first.
  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, userProfile, loading: false }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);