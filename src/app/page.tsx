"use client";

import { useAuth } from "@/context/auth-context";
import { LoginForm } from "@/components/auth/login-form";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { loading, user } = useAuth();

  // While the initial user check happens, show a loader. 
  // The AuthProvider handles the main loading state and redirection.
  // This just prevents a flicker of the login form for authenticated users.
  if (loading || user) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin" />
      </div>
    );
  }

  // If not loading and no user, show the login form.
  return <LoginForm />;
}
