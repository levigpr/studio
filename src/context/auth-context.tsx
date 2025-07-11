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
    if (!db) {
      console.error("Firestore is not initialized. Cannot proceed with auth state changes.");
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const docRef = doc(db, "usuarios", firebaseUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const profile = { uid: docSnap.id, ...docSnap.data() } as UserProfile;
          setUserProfile(profile);

          const isAuthPage = pathname === '/' || pathname.startsWith('/signup') || pathname.startsWith('/login');
          
          if (profile.rol === "terapeuta" && isAuthPage) {
            router.replace("/terapeuta");
          } else if (profile.rol === "paciente" && isAuthPage) {
            router.replace("/paciente");
          } else {
            setLoading(false);
          }
        } else {
          // User exists in Auth but not Firestore
          setUserProfile(null);
          // Optional: redirect to a profile setup page or handle as an error
           setLoading(false);
        }
      } else {
        setUser(null);
        setUserProfile(null);
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
  
  // While initial loading is true, we show a full-screen loader.
  // The router inside the useEffect will handle redirection, and then setLoading(false)
  // will unmount this loader and show the children.
  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin" />
      </div>
    );
  }


  return <>{children}</>;
};

export const useAuth = () => useContext(AuthContext);