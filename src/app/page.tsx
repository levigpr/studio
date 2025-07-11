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
    if (!loading && user && userProfile) {
      if (userProfile.rol === "terapeuta") {
        router.push("/terapeuta");
      } else if (userProfile.rol === "paciente") {
        router.push("/paciente");
      }
    }
  }, [user, userProfile, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-16 w-16 animate-spin" />
      <p className="ml-4">Redirigiendo...</p>
    </div>
  );
}
