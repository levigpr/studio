"use client";

import { useAuth } from "@/context/auth-context";
import { LoginForm } from "@/components/auth/login-form";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { loading, user, userProfile } = useAuth();

  // The AuthProvider handles redirection. 
  // We show a loader here to prevent flicker while the provider determines the user's state.
  if (loading || (user && userProfile)) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin" />
      </div>
    );
  }

  // If not loading and no user, show the login form.
  return <LoginForm />;
}
