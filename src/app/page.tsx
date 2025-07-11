"use client";

import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // We only want to redirect if loading is false and we have a user and a profile
    if (!loading && user && userProfile) {
      if (userProfile.rol === "terapeuta") {
        router.push("/terapeuta");
      } else if (userProfile.rol === "paciente") {
        router.push("/paciente");
      }
    }
  }, [user, userProfile, loading, router]);

  // While the auth state is loading, show a full-screen spinner
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin" />
      </div>
    );
  }

  // If not loading and there's no user, show the login form
  if (!user) {
    return <LoginForm />;
  }

  // If not loading and there IS a user, but we are waiting for the redirect logic
  // in useEffect to run, show the "Redirigiendo..." message.
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-16 w-16 animate-spin" />
      <p className="ml-4">Redirigiendo...</p>
    </div>
  );
}
